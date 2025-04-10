const { AuditLog } = require('../models');
const logger = require('../utils/logger');

// Middleware to log user actions
const auditLogger = (action) => {
  return async (req, res, next) => {
    // Store the original JSON method
    const originalJson = res.json;
    
    // Replace the json method with our custom implementation
    res.json = function(data) {
      // Restore the original json method to avoid recursion
      res.json = originalJson;
      
      // Only log if the request was successful
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          // Extract details from request
          const userId = req.user ? req.user._id : null;
          const serviceId = req.service ? req.service._id : null;
          const ipAddress = req.headers['x-forwarded-for'] || 
                            req.connection.remoteAddress || 
                            req.socket.remoteAddress || 
                            req.connection.socket.remoteAddress;
          const userAgent = req.headers['user-agent'] || '';
          
          // Create log details
          let details = {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode
          };
          
          // Add request params if any
          if (Object.keys(req.params).length > 0) {
            details.params = req.params;
          }
          
          // Add request query if any
          if (Object.keys(req.query).length > 0) {
            details.query = req.query;
          }
          
          // Add request body if any, but remove sensitive data
          if (Object.keys(req.body).length > 0) {
            const bodyCopy = { ...req.body };
            // Remove sensitive fields
            delete bodyCopy.password;
            delete bodyCopy.confirmPassword;
            delete bodyCopy.currentPassword;
            delete bodyCopy.newPassword;
            delete bodyCopy.apiSecret;
            
            details.body = bodyCopy;
          }
          
          // Add response data if any, but limit size and remove sensitive data
          if (data) {
            // Clone the data to avoid modifying the original
            const dataCopy = typeof data === 'object' ? { ...data } : { data };
            
            // If data has a user field, remove sensitive fields
            if (dataCopy.user) {
              delete dataCopy.user.password;
            }
            
            // Remove any token or secret from the response
            delete dataCopy.token;
            delete dataCopy.refreshToken;
            delete dataCopy.apiSecret;
            
            details.response = dataCopy;
          }
          
          // Create audit log entry
          await AuditLog.logAction(action, details, {
            userId,
            serviceId,
            ipAddress,
            userAgent
          });
        } catch (error) {
          // Log error but don't stop the response
          logger.error(`Error creating audit log: ${error.message}`);
        }
      }
      
      // Call the original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = auditLogger;
