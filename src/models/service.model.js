const mongoose = require('mongoose');
const crypto = require('crypto');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Service name must be at most 100 characters long']
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  apiKey: {
    type: String,
    unique: true,
    default: function() {
      if (this.name) {
        return `toc_${this.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${require('crypto').randomBytes(8).toString('hex')}`;
      }
      return null;
    }
  },
  apiSecret: {
    type: String,
    select: false, // API secret will not be returned in queries by default
    default: function() {
      return `toc_${require('crypto').randomBytes(16).toString('hex')}`;
    }
  },
  callbackUrl: {
    type: String,
    default: null
  },
  active: {
    type: Boolean,
    default: true
  },
  config: {
    allowedOrigins: {
      type: [String],
      default: []
    },
    tokenExpiration: {
      type: Number,
      default: 3600 // 1 hour in seconds
    },
    passwordPolicy: {
      minLength: {
        type: Number,
        default: 8
      },
      requireNumbers: {
        type: Boolean,
        default: true
      },
      requireSymbols: {
        type: Boolean,
        default: false
      }
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.apiSecret;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      delete ret.apiSecret;
      return ret;
    }
  }
});

// Index for efficient queries
serviceSchema.index({ name: 1 }, { unique: true });
serviceSchema.index({ apiKey: 1 }, { unique: true });

// Pre-save hook to generate API key and secret if not provided
serviceSchema.pre('save', function(next) {
  // Only generate new API key and secret if they are not set (new service)
  if (!this.isModified('apiKey') && !this.isModified('apiSecret')) {
    return next();
  }

  // Generate API key if not provided
  if (!this.apiKey) {
    this.apiKey = `toc_${this.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${crypto.randomBytes(8).toString('hex')}`;
  }

  // Generate API secret if not provided
  if (!this.apiSecret) {
    this.apiSecret = `toc_${crypto.randomBytes(16).toString('hex')}`;
  }

  next();
});

// Method to validate API key and secret
serviceSchema.methods.validateApiCredentials = function(apiKey, apiSecret) {
  return this.apiKey === apiKey && this.apiSecret === apiSecret;
};

// Method to regenerate API key and secret
serviceSchema.methods.regenerateCredentials = function() {
  this.apiKey = `toc_${this.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${crypto.randomBytes(8).toString('hex')}`;
  this.apiSecret = `toc_${crypto.randomBytes(16).toString('hex')}`;
  return this.save();
};

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
