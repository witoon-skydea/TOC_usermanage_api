const { AuditLog, User, Service } = require('../models');
const { APIError } = require('../utils/error.handler');

// @desc    Get all audit logs (with pagination and filtering)
// @route   GET /api/audit-logs
// @access  Private (Admin only)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
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
    
    // Filter by action
    if (req.query.action) {
      filter.action = req.query.action;
    }
    
    // Filter by IP address
    if (req.query.ipAddress) {
      filter.ipAddress = req.query.ipAddress;
    }
    
    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      filter.timestamp = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.timestamp = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.timestamp = { $lte: new Date(req.query.endDate) };
    }
    
    // Count total
    const total = await AuditLog.countDocuments(filter);
    
    // Find audit logs
    const auditLogs = await AuditLog.find(filter)
      .populate('userId', 'username displayName')
      .populate('serviceId', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    // Response
    res.status(200).json({
      success: true,
      count: auditLogs.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      auditLogs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit log by ID
// @route   GET /api/audit-logs/:id
// @access  Private (Admin only)
exports.getAuditLogById = async (req, res, next) => {
  try {
    const auditLog = await AuditLog.findById(req.params.id)
      .populate('userId', 'username displayName email')
      .populate('serviceId', 'name description');
    
    if (!auditLog) {
      return next(new APIError('Audit log not found', 404));
    }
    
    // Response
    res.status(200).json({
      success: true,
      auditLog
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit logs for a specific user
// @route   GET /api/users/:userId/audit-logs
// @access  Private (Admin only)
exports.getUserAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Check if user exists
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return next(new APIError('User not found', 404));
    }
    
    // Build filter
    const filter = { userId: req.params.userId };
    
    // Filter by service
    if (req.query.serviceId) {
      filter.serviceId = req.query.serviceId;
    }
    
    // Filter by action
    if (req.query.action) {
      filter.action = req.query.action;
    }
    
    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      filter.timestamp = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.timestamp = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.timestamp = { $lte: new Date(req.query.endDate) };
    }
    
    // Count total
    const total = await AuditLog.countDocuments(filter);
    
    // Find audit logs
    const auditLogs = await AuditLog.find(filter)
      .populate('serviceId', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    // Response
    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        displayName: user.displayName
      },
      count: auditLogs.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      auditLogs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit logs for a specific service
// @route   GET /api/services/:serviceId/audit-logs
// @access  Private (Admin only)
exports.getServiceAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Check if service exists
    const service = await Service.findById(req.params.serviceId);
    
    if (!service) {
      return next(new APIError('Service not found', 404));
    }
    
    // Build filter
    const filter = { serviceId: req.params.serviceId };
    
    // Filter by user
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }
    
    // Filter by action
    if (req.query.action) {
      filter.action = req.query.action;
    }
    
    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      filter.timestamp = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.timestamp = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.timestamp = { $lte: new Date(req.query.endDate) };
    }
    
    // Count total
    const total = await AuditLog.countDocuments(filter);
    
    // Find audit logs
    const auditLogs = await AuditLog.find(filter)
      .populate('userId', 'username displayName')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    // Response
    res.status(200).json({
      success: true,
      service: {
        _id: service._id,
        name: service.name
      },
      count: auditLogs.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      auditLogs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get summary of audit log actions
// @route   GET /api/audit-logs/summary
// @access  Private (Admin only)
exports.getAuditLogSummary = async (req, res, next) => {
  try {
    // Get counts by action
    const actionCounts = await AuditLog.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get counts by service
    const serviceCounts = await AuditLog.aggregate([
      { $match: { serviceId: { $ne: null } } },
      { $group: { _id: '$serviceId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get counts by user
    const userCounts = await AuditLog.aggregate([
      { $match: { userId: { $ne: null } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get counts by day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyCounts = await AuditLog.aggregate([
      { 
        $match: { 
          timestamp: { $gte: thirtyDaysAgo } 
        } 
      },
      {
        $group: {
          _id: { 
            $dateToString: { 
              format: '%Y-%m-%d', 
              date: '$timestamp' 
            } 
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Populate service names
    const serviceIds = serviceCounts.map(service => service._id);
    const services = await Service.find({ _id: { $in: serviceIds } }, 'name');
    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service._id] = service.name;
    });
    
    // Populate user names
    const userIds = userCounts.map(user => user._id);
    const users = await User.find({ _id: { $in: userIds } }, 'username displayName');
    const userMap = {};
    users.forEach(user => {
      userMap[user._id] = user.username;
    });
    
    // Format the service counts with names
    const formattedServiceCounts = serviceCounts.map(service => ({
      service: {
        _id: service._id,
        name: serviceMap[service._id] || 'Unknown Service'
      },
      count: service.count
    }));
    
    // Format the user counts with names
    const formattedUserCounts = userCounts.map(user => ({
      user: {
        _id: user._id,
        username: userMap[user._id] || 'Unknown User'
      },
      count: user.count
    }));
    
    // Response
    res.status(200).json({
      success: true,
      actionCounts,
      serviceCounts: formattedServiceCounts,
      userCounts: formattedUserCounts,
      dailyCounts
    });
  } catch (error) {
    next(error);
  }
};
