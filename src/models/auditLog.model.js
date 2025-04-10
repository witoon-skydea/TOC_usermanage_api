const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Can be null for system actions or when user is not authenticated
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    default: null // Can be null for global actions
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    index: true // Index for query performance
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false // We are using our own timestamp field
});

// Indexes for efficient queries
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ serviceId: 1 });
auditLogSchema.index({ timestamp: -1 }); // Descending for most recent first
auditLogSchema.index({ action: 1, userId: 1 });
auditLogSchema.index({ action: 1, serviceId: 1 });

// Static method to log an action
auditLogSchema.statics.logAction = async function(action, details = {}, options = {}) {
  const { userId, serviceId, ipAddress = '', userAgent = '' } = options;
  
  return this.create({
    userId,
    serviceId,
    action,
    details,
    ipAddress,
    userAgent,
    timestamp: new Date()
  });
};

// Static method to get user activity log
auditLogSchema.statics.getUserActivity = function(userId, limit = 50, skip = 0) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('serviceId', 'name');
};

// Static method to get service activity log
auditLogSchema.statics.getServiceActivity = function(serviceId, limit = 50, skip = 0) {
  return this.find({ serviceId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'username displayName');
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
