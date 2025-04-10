const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role.controller');
const { validateRequest, schemas } = require('../middlewares/validation.middleware');
const { authenticate, hasPermission } = require('../middlewares/auth.middleware');
const auditLogger = require('../middlewares/audit.middleware');

// All routes require authentication
router.use(authenticate);

// Get all permissions (needed for creating/updating roles)
router.get('/permissions',
  hasPermission('role:read'),
  roleController.getPermissions
);

// CRUD operations for roles
router.post('/',
  hasPermission('role:write'),
  validateRequest(schemas.role),
  auditLogger('role:create'),
  roleController.createRole
);

router.get('/',
  hasPermission('role:read'),
  auditLogger('role:get_all'),
  roleController.getRoles
);

router.get('/:id',
  hasPermission('role:read'),
  auditLogger('role:get_by_id'),
  roleController.getRoleById
);

router.put('/:id',
  hasPermission('role:write'),
  validateRequest(schemas.role),
  auditLogger('role:update'),
  roleController.updateRole
);

router.delete('/:id',
  hasPermission('role:delete'),
  auditLogger('role:delete'),
  roleController.deleteRole
);

module.exports = router;
