
import jwt, { type SignOptions } from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';


export const generateAccessToken = (userId: string): string => {
  return jwt.sign(
    { sub: userId },
    env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn'],
    }
  );
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { sub: userId },
    env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn'],
    }
  );
};

export const hashToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex');
};
// verify refresh token service
export const verifyRefreshToken = (token: string) => {
    return jwt.verify(token, env.REFRESH_TOKEN_SECRET);
  };

// verify access token service
  export const verifyAccessToken = (token: string) => {
    return jwt.verify(token, env.ACCESS_TOKEN_SECRET);
  };