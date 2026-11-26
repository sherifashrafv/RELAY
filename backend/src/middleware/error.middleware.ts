import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);

  const statusCode = 
  err instanceof AppError ? err.statusCode : 500;

  const message =
    err instanceof AppError ? err.message : 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
  });
};