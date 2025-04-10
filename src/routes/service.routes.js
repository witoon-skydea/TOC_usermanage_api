const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const { validateRequest, schemas } = require('../middlewares/validation.middleware');
const { authenticate, hasPermission } = require('../middlewares/auth.middleware');
const auditLogger = require('../middlewares/audit.middleware');

// All routes require authentication
router.use(authenticate);

// CRUD operations for services
router.post('/',
  hasPermission('service:write'),
  validateRequest(schemas.service),
  auditLogger('service:create'),
  serviceController.createService
);

router.get('/',
  hasPermission('service:read'),
  auditLogger('service:get_all'),
  serviceController.getServices
);

router.get('/:id',
  hasPermission('service:read'),
  auditLogger('service:get_by_id'),
  serviceController.getServiceById
);

router.put('/:id',
  hasPermission('service:write'),
  validateRequest(schemas.service),
  auditLogger('service:update'),
  serviceController.updateService
);

router.delete('/:id',
  hasPermission('service:delete'),
  auditLogger('service:delete'),
  serviceController.deleteService
);

// Additional service operations
router.post('/:id/regenerate-credentials',
  hasPermission('service:write'),
  auditLogger('service:regenerate_credentials'),
  serviceController.regenerateCredentials
);

// Get roles for a specific service
router.get('/:id/roles',
  hasPermission('service:read'),
  auditLogger('service:get_roles'),
  serviceController.getServiceRoles
);

// Get users for a specific service
router.get('/:id/users',
  hasPermission('service:read'),
  auditLogger('service:get_users'),
  serviceController.getServiceUsers
);

module.exports = router;
