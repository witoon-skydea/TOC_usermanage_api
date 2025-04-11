const mongoose = require('mongoose');

const userServiceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    default: null
  },
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }],
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },
  customData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Create a compound index on userId and serviceId for uniqueness
// This ensures that a user can only have one relationship with a particular service
userServiceSchema.index({ userId: 1, serviceId: 1 }, { unique: true });
// Index for queries by userId
userServiceSchema.index({ userId: 1 });
// Index for queries by serviceId
userServiceSchema.index({ serviceId: 1 });

// Method to check if user has a specific role in this service
userServiceSchema.methods.hasRole = function(roleName) {
  return this.populate({
    path: 'roles',
    match: { name: roleName }
  }).then(userService => {
    return userService.roles.length > 0;
  });
};

// Method to check if user has a specific permission in this service
userServiceSchema.methods.hasPermission = async function(permission) {
  await this.populate({
    path: 'roles',
    populate: {
      path: 'permissions'
    }
  });
  
  for (const role of this.roles) {
    if (role.permissions.includes(permission)) {
      return true;
    }
  }
  
  return false;
};

// Static method to find users with a specific role in a service
userServiceSchema.statics.findByRole = function(serviceId, roleName) {
  return this.find({ serviceId })
    .populate({
      path: 'roles',
      match: { name: roleName }
    })
    .then(userServices => {
      return userServices.filter(us => us.roles.length > 0);
    });
};

const UserService = mongoose.model('UserService', userServiceSchema);

module.exports = UserService;
