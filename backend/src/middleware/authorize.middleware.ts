
import { Response, NextFunction } from 'express';
import { pool } from '../config/db.js';
import { AppError } from '../errors/app-error.js';
import type { AuthRequest } from './auth.middleware.js';

export const authorize = (...allowedRoles: string[]) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Authentication must run before Authorization
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Get the organization selected by the user
      const organizationId = req.headers['x-organization-id'];

      if (
        typeof organizationId !== 'string' ||
        !organizationId
      ) {
        throw new AppError('Organization ID is required', 400);
      }

      // Find the user's active role in this organization
      const result = await pool.query(
        `
          SELECT roles.role_key
          FROM organization_members
          INNER JOIN roles
            ON roles.id = organization_members.role_id
          WHERE organization_members.user_id = $1
            AND organization_members.organization_id = $2
            AND organization_members.status = 'active'
          LIMIT 1
        `,
        [req.user.id, organizationId]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          'You are not a member of this organization',
          403
        );
      }

      const userRole = result.rows[0].role_key;

      if (!allowedRoles.includes(userRole)) {
        throw new AppError(
          'You do not have permission to perform this action',
          403
        );
      }

      req.organizationId = organizationId;
      req.userRole = userRole;

      next();
    } catch (error) {
      next(error);
    }
  };
};
