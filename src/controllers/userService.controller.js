const { UserService, User, Service, Role } = require('../models');
const { APIError } = require('../utils/error.handler');
const mongoose = require('mongoose');

// @desc    Assign user to service
// @route   POST /api/user-services
// @access  Private (Admin only)
exports.assignUserToService = async (req, res, next) => {
  try {
    const { userId, serviceId, roles, status, customData } = req.body;
    
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return next(new APIError('Invalid user ID', 400));
    }
    
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return next(new APIError('Invalid service ID', 400));
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    
    if (!user) {
      return next(new APIError('User not found', 404));
    }
    
    // Check if service exists
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return next(new APIError('Service not found', 404));
    }
    
    // Check if user is already assigned to service
    const existingAssignment = await UserService.findOne({
      userId,
      serviceId
    });
    
    if (existingAssignment) {
      return next(new APIError('User is already assigned to this service', 400));
    }
    
    // Validate roles if provided
    if (roles && roles.length > 0) {
      // Check if roles exist and belong to this service
      const validRoles = await Role.find({
        _id: { $in: roles },
        $or: [
          { serviceId: serviceId },
          { isGlobal: true }
        ]
      });
      
      if (validRoles.length !== roles.length) {
        return next(new APIError('One or more roles are invalid or do not belong to this service', 400));
      }
    }
    
    // Create user-service relationship
    const userService = new UserService({
      userId,
      serviceId,
      roles: roles || [],
      status: status || 'active',
      customData: customData || {}
    });
    
    await userService.save();
    
    // Populate related data
    await userService.populate([
      { path: 'userId', select: 'username email displayName' },
      { path: 'serviceId', select: 'name description' },
      { path: 'roles', select: 'name description' }
    ]);
    
    // Response
    res.status(201).json({
      success: true,
      message: 'User assigned to service successfully',
      userService
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all user-service assignments (with pagination and filtering)
// @route   GET /api/user-services
// @access  Private (Admin only)
exports.getUserServices = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = {};
    
    // Filter by user
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }
    
    // Filter by service
    if (req.query.serviceId) {
      filter.serviceId = req.query.serviceId;
    }
    
    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Count total
    const total = await UserService.countDocuments(filter);
    
    // Find user-service relationships
    const userServices = await UserService.find(filter)
      .populate('userId', 'username email displayName')
      .populate('serviceId', 'name description')
      .populate('roles', 'name description')
      .sort({ 'userId.username': 1, 'serviceId.name': 1 })
      .skip(skip)
      .limit(limit);
    
    // Response
    res.status(200).json({
      success: true,
      count: userServices.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      userServices
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user-service assignment by ID
// @route   GET /api/user-services/:id
// @access  Private (Admin only)
exports.getUserServiceById = async (req, res, next) => {
  try {
    const userService = await UserService.findById(req.params.id)
      .populate('userId', 'username email displayName')
      .populate('serviceId', 'name description')
      .populate('roles', 'name description');
    
    if (!userService) {
      return next(new APIError('User-service assignment not found', 404));
    }
    
    // Response
    res.status(200).json({
      success: true,
      userService
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user-service assignment
// @route   PUT /api/user-services/:id
// @access  Private (Admin only)
exports.updateUserService = async (req, res, next) => {
  try {
    const { roles, status, customData } = req.body;
    
    // Find user-service relationship
    const userService = await UserService.findById(req.params.id);
    
    if (!userService) {
      return next(new APIError('User-service assignment not found', 404));
    }
    
    // Validate roles if provided
    if (roles) {
      // Check if roles exist and belong to this service
      const validRoles = await Role.find({
        _id: { $in: roles },
        $or: [
          { serviceId: userService.serviceId },
          { isGlobal: true }
        ]
      });
      
      if (validRoles.length !== roles.length) {
        return next(new APIError('One or more roles are invalid or do not belong to this service', 400));
      }
      
      userService.roles = roles;
    }
    
    // Update other fields
    if (status !== undefined) userService.status = status;
    
    // Update customData if provided
    if (customData) {
      userService.customData = {
        ...userService.customData,
        ...customData
      };
    }
    
    await userService.save();
    
    // Populate related data
    await userService.populate([
      { path: 'userId', select: 'username email displayName' },
      { path: 'serviceId', select: 'name description' },
      { path: 'roles', select: 'name description' }
    ]);
    
    // Response
    res.status(200).json({
      success: true,
      message: 'User-service assignment updated successfully',
      userService
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove user from service
// @route   DELETE /api/user-services/:id
// @access  Private (Admin only)
exports.removeUserFromService = async (req, res, next) => {
  try {
    // Find user-service relationship
    const userService = await UserService.findById(req.params.id)
      .populate('userId', 'username')
      .populate('serviceId', 'name');
    
    if (!userService) {
      return next(new APIError('User-service assignment not found', 404));
    }
    
    // Delete user-service relationship
    await userService.deleteOne();
    
    // Response
    res.status(200).json({
      success: true,
      message: `User ${userService.userId.username} removed from service ${userService.serviceId.name} successfully`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's services
// @route   GET /api/users/:userId/services
// @access  Private (Admin or Self)
exports.getUserServicesByUserId = async (req, res, next) => {
  try {
    // Check if user exists
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return next(new APIError('User not found', 404));
    }
    
    // Check permission: only admin or the user themselves can access this
    if (req.user._id.toString() !== req.params.userId && 
        !req.userRoles.some(role => role.name === 'admin')) {
      return next(new APIError('Not authorized to view this user\'s services', 403));
    }
    
    // Get all user-service relationships
    const userServices = await UserService.find({ userId: req.params.userId })
      .populate('serviceId', 'name description active')
      .populate('roles', 'name description');
    
    // Response
    res.status(200).json({
      success: true,
      count: userServices.length,
      services: userServices.map(us => ({
        _id: us._id,
        service: us.serviceId,
        status: us.status,
        roles: us.roles,
        customData: us.customData,
        createdAt: us.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add or update custom data for user in a service
// @route   PUT /api/users/:userId/services/:serviceId/custom-data
// @access  Private (Admin or Service)
exports.updateCustomData = async (req, res, next) => {
  try {
    const { userId, serviceId } = req.params;
    const { customData } = req.body;
    
    if (!customData) {
      return next(new APIError('Custom data is required', 400));
    }
    
    // Find user-service relationship
    const userService = await UserService.findOne({ userId, serviceId });
    
    if (!userService) {
      return next(new APIError('User is not assigned to this service', 404));
    }
    
    // Update custom data
    userService.customData = {
      ...userService.customData,
      ...customData
    };
    
    await userService.save();
    
    // Response
    res.status(200).json({
      success: true,
      message: 'Custom data updated successfully',
      customData: userService.customData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get users by role in a service
// @route   GET /api/services/:serviceId/roles/:roleId/users
// @access  Private (Admin or Service)
exports.getUsersByServiceRole = async (req, res, next) => {
  try {
    const { serviceId, roleId } = req.params;
    
    // Check if service exists
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return next(new APIError('Service not found', 404));
    }
    
    // Check if role exists and belongs to this service
    const role = await Role.findOne({
      _id: roleId,
      $or: [
        { serviceId: serviceId },
        { isGlobal: true }
      ]
    });
    
    if (!role) {
      return next(new APIError('Role not found or does not belong to this service', 404));
    }
    
    // Find user-service relationships with this role
    const userServices = await UserService.find({
      serviceId,
      roles: roleId,
      status: 'active'
    }).populate('userId', 'username email displayName profileImage');
    
    // Format response
    const users = userServices.map(us => ({
      _id: us.userId._id,
      username: us.userId.username,
      email: us.userId.email,
      displayName: us.userId.displayName,
      profileImage: us.userId.profileImage,
      customData: us.customData
    }));
    
    // Response
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};
