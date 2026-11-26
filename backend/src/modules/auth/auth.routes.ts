import { Router } from 'express';
import { loginController, logoutController, refreshController, registerController } from './auth.controller.js';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/authorize.middleware.js';
import { authorizePermission } from '../../middleware/authorize-permission.middleware.js';

const router = Router();

// Auth Routes
router.post('/register', registerController);
router.post('/login', loginController);
router.post('/refresh', refreshController);
router.post('/logout', logoutController);


router.get('/me', authenticate, (req, res) => {
    const authReq = req as AuthRequest;
  
    return res.status(200).json({
      success: true,
      data: {
        userId: authReq.user?.id,
      },
    });
  });

  router.get(
    '/owner-test',
    authenticate,
    authorize('owner'),
    (req, res) => {
      const authReq = req as AuthRequest;
      res.status(200).json({
        success: true,
        message: 'Owner access granted',
        userId: authReq.user?.id,
        organizationId: authReq.organizationId,
        role: authReq.userRole,
      });
    }
  );

  // User must have reports.read
router.get(
  '/reports-test',
  authenticate,
  authorizePermission('reports.read'),
  (req, res) => {
    const authReq = req as AuthRequest;
    res.status(200).json({
      success: true,
      message: 'Reports access granted',
      userId: authReq.user?.id,
      organizationId: authReq.organizationId,
    });
  }
);

export default router;