const { Service, Role, UserService } = require('../models');
const { APIError } = require('../utils/error.handler');

// @desc    Create a new service
// @route   POST /api/services
// @access  Private (Admin only)
exports.createService = async (req, res, next) => {
  try {
    const { name, description, callbackUrl, active, config } = req.body;
    
    // Check if service name already exists
    const existingService = await Service.findOne({ name });
    
    if (existingService) {
      return next(new APIError(`Service with name '${name}' already exists`, 400));
    }
    
    // Create service
    const service = new Service({
      name,
      description: description || '',
      callbackUrl: callbackUrl || null,
      active: active !== undefined ? active : true,
      config: config || {}
    });
    
    await service.save();
    
    // Response (without apiSecret)
    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service: {
        _id: service._id,
        name: service.name,
        description: service.description,
        apiKey: service.apiKey,
        callbackUrl: service.callbackUrl,
        active: service.active,
        config: service.config,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all services (with pagination and filtering)
// @route   GET /api/services
// @access  Private (Admin only)
exports.getServices = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = {};
    
    // Search by name
    if (req.query.search) {
      filter.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { description: new RegExp(req.query.search, 'i') }
      ];
    }
    
    // Filter by active status
    if (req.query.active !== undefined) {
      filter.active = req.query.active === 'true';
    }
    
    // Count total
    const total = await Service.countDocuments(filter);
    
    // Find services
    const services = await Service.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);
    
    // Response
    res.status(200).json({
      success: true,
      count: services.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      services
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get service by ID
// @route   GET /api/services/:id
// @access  Private (Admin only)
exports.getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return next(new APIError('Service not found', 404));
    }
    
    // Get count of users with access to this service
    const userCount = await UserService.countDocuments({ serviceId: service._id });
    
    // Get count of roles for this service
    const roleCount = await Role.countDocuments({ serviceId: service._id });
    
    // Response
    res.status(200).json({
      success: true,
      service,
      stats: {
        userCount,
        roleCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private (Admin only)
exports.updateService = async (req, res, next) => {
  try {
    const { name, description, callbackUrl, active, config } = req.body;
    
    // Find service
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return next(new APIError('Service not found', 404));
    }
    
    // Check if name is being changed and if it already exists
    if (name && name !== service.name) {
      const existingService = await Service.findOne({ 
        name,
        _id: { $ne: service._id }
      });
      
      if (existingService) {
        return next(new APIError(`Service with name '${name}' already exists`, 400));
      }
      
      service.name = name;
    }
    
    // Update other fields
    if (description !== undefined) service.description = description;
    if (callbackUrl !== undefined) service.callbackUrl = callbackUrl;
    if (active !== undefined) service.active = active;
    
    // Update config if provided
    if (config) {
      service.config = {
        ...service.config,
        ...config,
        passwordPolicy: {
          ...(service.config.passwordPolicy || {}),
          ...(config.passwordPolicy || {})
        }
      };
    }
    
    await service.save();
    
    // Response
    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      service
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private (Admin only)
exports.deleteService = async (req, res, next) => {
  try {
    // Find service
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return next(new APIError('Service not found', 404));
    }
    
    // Check if service has users assigned
    const userCount = await UserService.countDocuments({ serviceId: service._id });
    
    if (userCount > 0) {
      return next(new APIError(`Cannot delete service '${service.name}' because it has ${userCount} users assigned to it`, 400));
    }
    
    // Check if service has roles
    const roleCount = await Role.countDocuments({ serviceId: service._id });
    
    if (roleCount > 0) {
      return next(new APIError(`Cannot delete service '${service.name}' because it has ${roleCount} roles. Delete all roles first.`, 400));
    }
    
    // Delete service
    await service.deleteOne();
    
    // Response
    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Regenerate API credentials
// @route   POST /api/services/:id/regenerate-credentials
// @access  Private (Admin only)
exports.regenerateCredentials = async (req, res, next) => {
  try {
    // Find service
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return next(new APIError('Service not found', 404));
    }
    
    // Regenerate API key and secret
    await service.regenerateCredentials();
    
    // Get updated service with new credentials
    const updatedService = await Service.findById(req.params.id).select('+apiSecret');
    
    // Response (including apiSecret this time)
    res.status(200).json({
      success: true,
      message: 'API credentials regenerated successfully',
      service: {
        _id: updatedService._id,
        name: updatedService.name,
        apiKey: updatedService.apiKey,
        apiSecret: updatedService.apiSecret, // Include API secret only when regenerating
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get service roles
// @route   GET /api/services/:id/roles
// @access  Private (Admin only)
exports.getServiceRoles = async (req, res, next) => {
  try {
    // Find service
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return next(new APIError('Service not found', 404));
    }
    
    // Get roles for this service
    const roles = await Role.find({ serviceId: service._id }).sort({ name: 1 });
    
    // Response
    res.status(200).json({
      success: true,
      count: roles.length,
      roles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get service users
// @route   GET /api/services/:id/users
// @access  Private (Admin only)
exports.getServiceUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Find service
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return next(new APIError('Service not found', 404));
    }
    
    // Build filter
    const filter = { serviceId: service._id };
    
    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Count total
    const total = await UserService.countDocuments(filter);
    
    // Find user-service relationships with populated user and roles
    const userServices = await UserService.find(filter)
      .populate('userId', 'username email displayName status')
      .populate('roles', 'name')
      .sort({ 'userId.username': 1 })
      .skip(skip)
      .limit(limit);
    
    // Format response
    const users = userServices.map(us => ({
      _id: us._id,
      user: us.userId,
      status: us.status,
      roles: us.roles,
      customData: us.customData,
      createdAt: us.createdAt
    }));
    
    // Response
    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      users
    });
  } catch (error) {
    next(error);
  }
};
