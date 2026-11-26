
import type { Request, Response, NextFunction } from 'express';
import { registerSchema } from './auth.validation.js';
import { registerOrganization } from './auth.service.js';
import { AppError } from '../../errors/app-error.js';
import { loginSchema } from './auth.validation.js';
import { loginUser, logoutUser, refreshUserTokens } from './auth.service.js';



// register organization controller
export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const result = await registerOrganization(validation.data);

    return res.status(201).json({
      success: true,
      message: 'Organization registered successfully',
      data: result,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === '23505'
    ) {
      return next(new AppError('Email or organization slug already exists', 409));
    }

    return next(error);
  }
};

// login user controller
export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const result = await loginUser(validation.data);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// refresh user tokens controller
export const refreshController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return next(new AppError('Refresh token is required', 401));
    }

    const result = await refreshUserTokens(refreshToken);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    return next(error);
  }
};



// logout user controller
export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (typeof refreshToken === 'string' && refreshToken) {
      await logoutUser(refreshToken);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
    });

    return res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};


