const express = require('express');
const router = express.Router();
const userServiceController = require('../controllers/userService.controller');
const { validateRequest, schemas } = require('../middlewares/validation.middleware');
const { authenticate, hasPermission, authenticateService } = require('../middlewares/auth.middleware');
const auditLogger = require('../middlewares/audit.middleware');

// All routes require authentication
router.use(authenticate);

// CRUD operations for user-service relationships
router.post('/',
  hasPermission('user:write'),
  validateRequest(schemas.userService),
  auditLogger('user_service:assign'),
  userServiceController.assignUserToService
);

router.get('/',
  hasPermission('user:read'),
  auditLogger('user_service:get_all'),
  userServiceController.getUserServices
);

router.get('/:id',
  hasPermission('user:read'),
  auditLogger('user_service:get_by_id'),
  userServiceController.getUserServiceById
);

router.put('/:id',
  hasPermission('user:write'),
  auditLogger('user_service:update'),
  userServiceController.updateUserService
);

router.delete('/:id',
  hasPermission('user:write'),
  auditLogger('user_service:remove'),
  userServiceController.removeUserFromService
);

// Get services for a specific user
router.get('/user/:userId',
  hasPermission('user:read'),
  auditLogger('user_service:get_by_user'),
  userServiceController.getUserServicesByUserId
);

// Get users with a specific role in a service
router.get('/service/:serviceId/role/:roleId',
  hasPermission('service:read'),
  auditLogger('user_service:get_by_role'),
  userServiceController.getUsersByServiceRole
);

// Service-specific route for updating custom data
// This route can also be accessed by the service itself using API key authentication
router.put('/user/:userId/service/:serviceId/custom-data',
  auditLogger('user_service:update_custom_data'),
  userServiceController.updateCustomData
);

module.exports = router;
