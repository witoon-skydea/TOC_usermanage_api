const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    trim: true,
    maxlength: [50, 'Role name must be at most 50 characters long']
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  isGlobal: {
    type: Boolean,
    default: false
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    default: null // null for global roles
  },
  permissions: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Create a compound index on name and serviceId for uniqueness
// This ensures that a role name is unique within a service
roleSchema.index({ name: 1, serviceId: 1 }, { unique: true });
// Index for queries by serviceId
roleSchema.index({ serviceId: 1 });

// Static method to create default roles
roleSchema.statics.createDefaultRoles = async function() {
  const defaultRoles = [
    {
      name: 'admin',
      description: 'System administrator with full access',
      isGlobal: true,
      serviceId: null,
      permissions: ['user:read', 'user:write', 'user:delete', 'role:read', 'role:write', 'service:read', 'service:write']
    },
    {
      name: 'user',
      description: 'Standard user with limited access',
      isGlobal: true,
      serviceId: null,
      permissions: ['user:read']
    }
  ];

  try {
    // Create default roles if they don't exist
    for (const role of defaultRoles) {
      await this.findOneAndUpdate(
        { name: role.name, isGlobal: true, serviceId: null },
        role,
        { upsert: true, new: true }
      );
    }
    console.log('Default roles created or updated successfully');
  } catch (error) {
    console.error('Error creating default roles:', error);
    throw error;
  }
};

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
