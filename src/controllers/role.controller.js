const { Role, UserService } = require('../models');
const { APIError } = require('../utils/error.handler');
const mongoose = require('mongoose');

// @desc    Create a new role
// @route   POST /api/roles
// @access  Private (Admin only)
exports.createRole = async (req, res, next) => {
  try {
    const { name, description, isGlobal, serviceId, permissions } = req.body;
    
    // Validate serviceId if provided
    if (serviceId) {
      if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        return next(new APIError('Invalid service ID', 400));
      }
    }
    
    // Check if a role with the same name already exists for this service
    const existingRole = await Role.findOne({ 
      name,
      serviceId: isGlobal ? null : serviceId
    });
    
    if (existingRole) {
      return next(new APIError(`A role with the name '${name}' already exists for this service`, 400));
    }
    
    // Create the role
    const role = new Role({
      name,
      description: description || '',
      isGlobal: isGlobal || false,
      serviceId: isGlobal ? null : serviceId,
      permissions: permissions || []
    });
    
    await role.save();
    
    // Response
    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      role
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all roles (with pagination and filtering)
// @route   GET /api/roles
// @access  Private (Admin only)
exports.getRoles = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = {};
    
    // Filter by service
    if (req.query.serviceId) {
      if (req.query.serviceId === 'global') {
        filter.isGlobal = true;
        filter.serviceId = null;
      } else {
        filter.serviceId = req.query.serviceId;
      }
    }
    
    // Filter by global flag
    if (req.query.isGlobal) {
      filter.isGlobal = req.query.isGlobal === 'true';
    }
    
    // Search by name
    if (req.query.search) {
      filter.name = new RegExp(req.query.search, 'i');
    }
    
    // Count total
    const total = await Role.countDocuments(filter);
    
    // Find roles
    const roles = await Role.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .populate('serviceId', 'name');
    
    // Response
    res.status(200).json({
      success: true,
      count: roles.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      roles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get role by ID
// @route   GET /api/roles/:id
// @access  Private (Admin only)
exports.getRoleById = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id).populate('serviceId', 'name');
    
    if (!role) {
      return next(new APIError('Role not found', 404));
    }
    
    // Response
    res.status(200).json({
      success: true,
      role
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update role
// @route   PUT /api/roles/:id
// @access  Private (Admin only)
exports.updateRole = async (req, res, next) => {
  try {
    const { name, description, permissions } = req.body;
    
    // Find role
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return next(new APIError('Role not found', 404));
    }
    
    // Prevent modifying global attribute
    if (req.body.isGlobal !== undefined) {
      return next(new APIError('Cannot modify the global attribute of a role', 400));
    }
    
    // Prevent modifying serviceId
    if (req.body.serviceId !== undefined) {
      return next(new APIError('Cannot modify the service association of a role', 400));
    }
    
    // Check if admin role is being modified
    if (role.name === 'admin' && role.isGlobal) {
      return next(new APIError('Cannot modify the global admin role', 403));
    }
    
    // Check if a role with the same name already exists for this service
    if (name && name !== role.name) {
      const existingRole = await Role.findOne({ 
        name,
        serviceId: role.serviceId,
        _id: { $ne: role._id }
      });
      
      if (existingRole) {
        return next(new APIError(`A role with the name '${name}' already exists for this service`, 400));
      }
      
      role.name = name;
    }
    
    // Update other fields
    if (description !== undefined) role.description = description;
    if (permissions) role.permissions = permissions;
    
    await role.save();
    
    // Response
    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      role
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete role
// @route   DELETE /api/roles/:id
// @access  Private (Admin only)
exports.deleteRole = async (req, res, next) => {
  try {
    // Find role
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return next(new APIError('Role not found', 404));
    }
    
    // Prevent deleting protected roles
    if (role.name === 'admin' && role.isGlobal) {
      return next(new APIError('Cannot delete the global admin role', 403));
    }
    
    if (role.name === 'user' && role.isGlobal) {
      return next(new APIError('Cannot delete the global user role', 403));
    }
    
    // Check if role is assigned to any users
    const usersWithRole = await UserService.countDocuments({
      roles: role._id
    });
    
    if (usersWithRole > 0) {
      return next(new APIError(`Cannot delete role '${role.name}' because it is assigned to ${usersWithRole} users`, 400));
    }
    
    // Delete role
    await role.deleteOne();
    
    // Response
    res.status(200).json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all permissions
// @route   GET /api/roles/permissions
// @access  Private (Admin only)
exports.getPermissions = async (req, res, next) => {
  try {
    // Predefined list of all available permissions
    const systemPermissions = [
      // User permissions
      'user:read',
      'user:write',
      'user:delete',
      
      // Role permissions
      'role:read',
      'role:write',
      'role:delete',
      
      // Service permissions
      'service:read',
      'service:write',
      'service:delete',
      
      // Audit log permissions
      'audit:read'
    ];
    
    // If a serviceId is provided, get custom permissions for that service
    let customPermissions = [];
    if (req.query.serviceId) {
      // Get all roles for this service
      const serviceRoles = await Role.find({ serviceId: req.query.serviceId });
      
      // Extract unique permissions
      const allPermissions = serviceRoles.reduce((perms, role) => {
        if (role.permissions && role.permissions.length > 0) {
          role.permissions.forEach(perm => {
            if (!systemPermissions.includes(perm) && !perms.includes(perm)) {
              perms.push(perm);
            }
          });
        }
        return perms;
      }, []);
      
      customPermissions = allPermissions;
    }
    
    // Response
    res.status(200).json({
      success: true,
      systemPermissions,
      customPermissions
    });
  } catch (error) {
    next(error);
  }
};
