const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLog.controller');
const { authenticate, hasPermission } = require('../middlewares/auth.middleware');

// All routes require authentication and audit:read permission
router.use(authenticate);
router.use(hasPermission('audit:read'));

// Get all audit logs with pagination and filtering
router.get('/', auditLogController.getAuditLogs);

// Get audit log summary
router.get('/summary', auditLogController.getAuditLogSummary);

// Get specific audit log by ID
router.get('/:id', auditLogController.getAuditLogById);

// Get audit logs for a specific user
router.get('/user/:userId', auditLogController.getUserAuditLogs);

// Get audit logs for a specific service
router.get('/service/:serviceId', auditLogController.getServiceAuditLogs);

module.exports = router;
