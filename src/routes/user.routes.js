const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { validateRequest, schemas } = require('../middlewares/validation.middleware');
const { authenticate, authenticateRefreshToken, hasPermission, hasRole } = require('../middlewares/auth.middleware');
const auditLogger = require('../middlewares/audit.middleware');

// Public routes
router.post('/register', 
  validateRequest(schemas.userRegister),
  auditLogger('user:register'),
  userController.registerUser
);

router.post('/login', 
  validateRequest(schemas.userLogin),
  auditLogger('user:login'),
  userController.loginUser
);

router.post('/refresh-token',
  authenticateRefreshToken,
  auditLogger('user:refresh_token'),
  userController.refreshToken
);

router.get('/verify-email/:token',
  auditLogger('user:verify_email'),
  userController.verifyEmail
);

router.post('/forgot-password',
  auditLogger('user:forgot_password'),
  userController.forgotPassword
);

router.post('/reset-password/:token',
  auditLogger('user:reset_password'),
  userController.resetPassword
);

// Protected routes - require authentication
router.use(authenticate);

router.get('/profile',
  auditLogger('user:get_profile'),
  userController.getUserProfile
);

router.put('/profile',
  validateRequest(schemas.userUpdate),
  auditLogger('user:update_profile'),
  userController.updateUserProfile
);

router.put('/change-password',
  validateRequest(schemas.changePassword),
  auditLogger('user:change_password'),
  userController.changePassword
);

router.post('/logout',
  auditLogger('user:logout'),
  userController.logoutUser
);

// Admin-only routes
router.get('/',
  hasPermission('user:read'),
  auditLogger('user:get_all'),
  userController.getUsers
);

router.get('/:id',
  hasPermission('user:read'),
  auditLogger('user:get_by_id'),
  userController.getUserById
);

router.put('/:id',
  hasPermission('user:write'),
  auditLogger('user:update'),
  userController.updateUser
);

router.delete('/:id',
  hasPermission('user:delete'),
  auditLogger('user:delete'),
  userController.deleteUser
);

module.exports = router;
