
import { Response, NextFunction } from 'express';
import { pool } from '../config/db.js';
import { AppError } from '../errors/app-error.js';
import type { AuthRequest } from './auth.middleware.js';

export const authorizePermission = (...requiredPermissions: string[]) => {
    if (requiredPermissions.length === 0) {
        throw new Error(
          'authorizePermission requires at least one permission'
        );
      }
    return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const organizationId = req.headers['x-organization-id'];

      if (typeof organizationId !== 'string' || !organizationId) {
        throw new AppError('Organization ID is required', 400);
      }

      const result = await pool.query(
        `
          SELECT DISTINCT p.permission_key
          FROM organization_members om
          JOIN role_permissions rp
            ON rp.role_id = om.role_id
          JOIN permissions p
            ON p.id = rp.permission_id
          WHERE om.user_id = $1
            AND om.organization_id = $2
            AND om.status = 'active'
        `,
        [req.user.id, organizationId]
      );

      const userPermissions = result.rows.map(
        (row) => row.permission_key as string
      );

      const hasAllPermissions = requiredPermissions.every(
        (permission) => userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        throw new AppError(
          'You do not have permission to perform this action',
          403
        );
      }

      req.organizationId = organizationId;

      next();
    } catch (error) {
      next(error);
    }
  };
};
