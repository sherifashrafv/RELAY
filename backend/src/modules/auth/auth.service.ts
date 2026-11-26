import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { pool } from '../../config/db.js';
import jwt from 'jsonwebtoken';
import { AppError } from '../../errors/app-error.js';
import {
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    verifyRefreshToken,
  } from './token.service.js';
import type { LoginInput, RegisterInput } from './auth.validation.js';
import { env } from '../../config/env.js';


// register organization service
export const registerOrganization = async (input: RegisterInput) => {
  const email = input.email.toLowerCase();

  // bcrypt only processes up to 72 bytes.
  if (Buffer.byteLength(input.password, 'utf8') > 72) {
    throw new Error('Password must not exceed 72 bytes');
  }

  // Hash before opening the transaction to avoid holding a DB connection
  // while bcrypt performs its CPU-intensive work.
  const passwordHash = await bcrypt.hash(input.password, 12);

  const baseSlug =
    input.organizationName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'org';

  const slug = `${baseSlug}-${randomUUID().slice(0, 8)}`;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const organizationResult = await client.query(
      `INSERT INTO organizations (name, slug)
       VALUES ($1, $2)
       RETURNING id, name, slug, created_at`,
      [input.organizationName, slug]
    );

    const organization = organizationResult.rows[0];

    const userResult = await client.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, email, created_at`,
      [input.fullName, email, passwordHash]
    );

    const user = userResult.rows[0];

    const roleResult = await client.query(
      `SELECT id FROM roles WHERE role_key = $1`,
      ['owner']
    );

    if (roleResult.rowCount === 0) {
      throw new Error('Owner role was not found');
    }

    await client.query(
      `INSERT INTO organization_members
        (organization_id, user_id, role_id)
       VALUES ($1, $2, $3)`,
      [organization.id, user.id, roleResult.rows[0].id]
    );

    await client.query('COMMIT');

    return {
      organization,
      user,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// login user service
export const loginUser = async (input: LoginInput) => {
    const email = input.email.toLowerCase();
  
    // 1. Find user by email
    const userResult = await pool.query(
      `SELECT id, full_name, email, password_hash, is_active
       FROM users
       WHERE LOWER(email) = $1`,
      [email]
    );
  
    const user = userResult.rows[0];
  
    // 2. Validate user
    if (!user || !user.is_active) {
      throw new AppError('Invalid email or password', 401);
    }
  
    // 3. Compare password with stored hash
    const passwordMatches = await bcrypt.compare(
      input.password,
      user.password_hash
    );
  
    if (!passwordMatches) {
      throw new AppError('Invalid email or password', 401);
    }
  
    // 4. Get user's organizations and roles
    const membershipsResult = await pool.query(
      `SELECT
         om.organization_id,
         o.name AS organization_name,
         om.branch_id,
         r.role_key
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       JOIN roles r ON r.id = om.role_id
       WHERE om.user_id = $1
         AND om.status = 'active'`,
      [user.id]
    );
  
    // 5. Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
  
    // 6. Hash refresh token before storing it
    const tokenHash = hashToken(refreshToken);
  
    const decoded = jwt.decode(refreshToken);
  
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !decoded.exp
    ) {
      throw new Error('Invalid refresh token expiration');
    }
  
    // 7. Save refresh token hash in database
    await pool.query(
      `INSERT INTO refresh_tokens
        (user_id, token_hash, expires_at)
       VALUES ($1, $2, to_timestamp($3))`,
      [user.id, tokenHash, decoded.exp]
    );
  
    // 8. Return safe user data and tokens
    return {
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        memberships: membershipsResult.rows,
      },
      accessToken,
      refreshToken,
    };
};

// refresh access token service
export const refreshUserTokens = async (token: string) => {
    // 1. Verify the refresh token signature and expiration
    let payload: string | jwt.JwtPayload;
  
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }
  
    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string'
    ) {
      throw new AppError('Invalid refresh token payload', 401);
    }
  
    const userId = payload.sub;
    const oldTokenHash = hashToken(token);
  
    const client = await pool.connect();
  
    try {
      await client.query('BEGIN');
  
      // 2. Find and lock the active token record
      const tokenResult = await client.query(
        `SELECT rt.id, rt.user_id   
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
         WHERE rt.token_hash = $1
           AND rt.user_id = $2
           AND rt.revoked_at IS NULL
           AND rt.expires_at > NOW()
           AND u.is_active = TRUE
         FOR UPDATE OF rt`,
        [oldTokenHash, userId]
      );
  
      if (tokenResult.rowCount === 0) {
        throw new AppError('Invalid or revoked refresh token', 401);
      }
  
      // 3. Revoke the old refresh token
      await client.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE id = $1`,
        [tokenResult.rows[0].id]
      );
  
      // 4. Issue new tokens
      const accessToken = generateAccessToken(userId);
      const refreshToken = generateRefreshToken(userId);
  
      const newPayload = jwt.decode(refreshToken);
  
      if (
        typeof newPayload !== 'object' ||
        newPayload === null ||
        typeof newPayload.exp !== 'number'
      ) {
        throw new Error('Unable to determine refresh token expiration');
      }
  
      // 5. Store only the new refresh token hash
      await client.query(
        `INSERT INTO refresh_tokens
          (user_id, token_hash, expires_at)
         VALUES ($1, $2, to_timestamp($3))`,
        [userId, hashToken(refreshToken), newPayload.exp]
      );
  
      await client.query('COMMIT');
  
      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
};

// logout user service
export const logoutUser = async (refreshToken: string): Promise<void> => {
    const tokenHash = hashToken(refreshToken);
  
    await pool.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE token_hash = $1
         AND revoked_at IS NULL`,
      [tokenHash]
    );
};

  
  
