const jwt = require('jsonwebtoken');
const { User, Token, UserService, Role, Service } = require('../models');
const { APIError } = require('../utils/error.handler');
const logger = require('../utils/logger');

// Middleware to authenticate user using JWT
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new APIError('Authentication required. Please provide a valid token.', 401));
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next(new APIError('Authentication required. Please provide a valid token.', 401));
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return next(new APIError('User not found or token is invalid.', 401));
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      return next(new APIError('User account is not active.', 403));
    }
    
    // Attach user to request object
    req.user = user;
    
    // If service is specified in the token, attach it to the request
    if (decoded.serviceId) {
      // Find the service
      const service = await Service.findById(decoded.serviceId);
      
      if (!service) {
        return next(new APIError('Service not found or token is invalid.', 401));
      }
      
      // Check if service is active
      if (!service.active) {
        return next(new APIError('Service is not active.', 403));
      }
      
      // Attach service to request object
      req.service = service;
      
      // Find user's relationship with the service
      const userService = await UserService.findOne({
        userId: user._id,
        serviceId: service._id
      }).populate('roles');
      
      if (!userService) {
        return next(new APIError('User does not have access to this service.', 403));
      }
      
      // Check if user's service relationship is active
      if (userService.status !== 'active') {
        return next(new APIError('User access to this service is not active.', 403));
      }
      
      // Attach user's roles and service relationship to request
      req.userService = userService;
      req.userRoles = userService.roles;
    } else {
      // If no service is specified, use global roles
      const globalRoles = await Role.find({
        _id: { $in: await UserService.distinct('roles', { userId: user._id }) },
        isGlobal: true
      });
      
      req.userRoles = globalRoles;
    }
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new APIError('Invalid token.', 401));
    } else if (error.name === 'TokenExpiredError') {
      return next(new APIError('Token expired.', 401));
    }
    
    next(error);
  }
};

// Middleware to authenticate service API key and secret
exports.authenticateService = async (req, res, next) => {
  try {
    // Get API key and secret from headers
    const apiKey = req.headers['x-api-key'];
    const apiSecret = req.headers['x-api-secret'];
    
    if (!apiKey || !apiSecret) {
      return next(new APIError('Service authentication required. Please provide API key and secret.', 401));
    }
    
    // Find service by API key
    const service = await Service.findOne({ apiKey }).select('+apiSecret');
    
    if (!service) {
      return next(new APIError('Invalid API key.', 401));
    }
    
    // Validate API secret
    const isValidSecret = service.apiSecret === apiSecret;
    
    if (!isValidSecret) {
      return next(new APIError('Invalid API secret.', 401));
    }
    
    // Check if service is active
    if (!service.active) {
      return next(new APIError('Service is not active.', 403));
    }
    
    // Attach service to request
    req.service = service;
    
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check if user has a specific permission
exports.hasPermission = (permission) => {
  return async (req, res, next) => {
    try {
      // Check if user roles exist in request
      if (!req.userRoles) {
        return next(new APIError('User roles not found.', 500));
      }
      
      // Check if user has admin role (has all permissions)
      const isAdmin = req.userRoles.some(role => role.name === 'admin');
      
      if (isAdmin) {
        return next();
      }
      
      // Check if user has the required permission
      const hasPermission = req.userRoles.some(role => 
        role.permissions && role.permissions.includes(permission)
      );
      
      if (!hasPermission) {
        return next(new APIError(`Access denied. Missing permission: ${permission}`, 403));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to check if user has a specific role
exports.hasRole = (roleName) => {
  return async (req, res, next) => {
    try {
      // Check if user roles exist in request
      if (!req.userRoles) {
        return next(new APIError('User roles not found.', 500));
      }
      
      // Check if user has the required role
      const hasRole = req.userRoles.some(role => role.name === roleName);
      
      if (!hasRole) {
        return next(new APIError(`Access denied. Missing role: ${roleName}`, 403));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to authenticate user using refresh token
exports.authenticateRefreshToken = async (req, res, next) => {
  try {
    // Get refresh token from request body
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return next(new APIError('Refresh token is required.', 400));
    }
    
    // Find the token in database
    const tokenDoc = await Token.findOne({
      token: refreshToken,
      type: 'refresh'
    });
    
    if (!tokenDoc) {
      return next(new APIError('Invalid refresh token.', 401));
    }
    
    // Check if token is expired
    if (tokenDoc.isExpired()) {
      await tokenDoc.delete();
      return next(new APIError('Refresh token expired.', 401));
    }
    
    // Check if user exists
    const user = await User.findById(tokenDoc.userId);
    
    if (!user) {
      await tokenDoc.delete();
      return next(new APIError('User not found.', 401));
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      return next(new APIError('User account is not active.', 403));
    }
    
    // Attach user and token to request
    req.user = user;
    req.token = tokenDoc;
    
    // If the token has a serviceId in metadata, attach the service
    if (tokenDoc.metadata && tokenDoc.metadata.serviceId) {
      const service = await Service.findById(tokenDoc.metadata.serviceId);
      
      if (service && service.active) {
        req.service = service;
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};
