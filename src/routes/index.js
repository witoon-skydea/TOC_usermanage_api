const express = require('express');
const router = express.Router();

// Import route handlers
const userRoutes = require('./user.routes');
const roleRoutes = require('./role.routes');
const serviceRoutes = require('./service.routes');
const userServiceRoutes = require('./userService.routes');
const auditLogRoutes = require('./auditLog.routes');

// Routes
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/services', serviceRoutes);
router.use('/user-services', userServiceRoutes);
router.use('/audit-logs', auditLogRoutes);

// API health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TOC User Management API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date()
  });
});

// API documentation route
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'TOC User Management API',
    version: '1.0.0',
    description: 'API for managing users, roles, and services',
    endpoints: {
      users: '/api/users',
      roles: '/api/roles',
      services: '/api/services',
      userServices: '/api/user-services',
      auditLogs: '/api/audit-logs'
    },
    documentation: '/api/docs',
    health: '/api/health'
  });
});

module.exports = router;
