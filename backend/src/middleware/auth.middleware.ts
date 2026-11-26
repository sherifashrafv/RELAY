import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/token.service.js';
import { AppError } from '../errors/app-error.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
  };
  organizationId?: string;
  userRole?: string;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Invalid access token', 401);
    }

    const payload = verifyAccessToken(token);

    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string'
    ) {
      throw new AppError('Invalid access token payload', 401);
    }

    req.user = {
      id: payload.sub,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(new AppError('Invalid or expired access token', 401));
  }
};