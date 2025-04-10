const mongoose = require('mongoose');
const crypto = require('crypto');

const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  token: {
    type: String,
    required: [true, 'Token is required']
  },
  type: {
    type: String,
    enum: ['refresh', 'verification', 'password_reset'],
    required: [true, 'Token type is required']
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required']
  },
  metadata: {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      default: null
    },
    deviceInfo: {
      type: String,
      default: ''
    },
    ipAddress: {
      type: String,
      default: ''
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '30d' // Automatically remove documents after 30 days
  }
});

// Index for efficient queries
tokenSchema.index({ userId: 1, type: 1 });
tokenSchema.index({ token: 1 });
tokenSchema.index({ expiresAt: 1 });

// Method to check if token is expired
tokenSchema.methods.isExpired = function() {
  return this.expiresAt < new Date();
};

// Static method to generate verification token
tokenSchema.statics.generateVerificationToken = async function(userId, serviceId = null, ipAddress = '', deviceInfo = '') {
  // Generate a random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set expiration date (24 hours from now)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  
  // Create token document
  return this.create({
    userId,
    token,
    type: 'verification',
    expiresAt,
    metadata: {
      serviceId,
      deviceInfo,
      ipAddress
    }
  });
};

// Static method to generate password reset token
tokenSchema.statics.generatePasswordResetToken = async function(userId, serviceId = null, ipAddress = '', deviceInfo = '') {
  // Generate a random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set expiration date (1 hour from now)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);
  
  // Create token document
  return this.create({
    userId,
    token,
    type: 'password_reset',
    expiresAt,
    metadata: {
      serviceId,
      deviceInfo,
      ipAddress
    }
  });
};

// Static method to generate refresh token
tokenSchema.statics.generateRefreshToken = async function(userId, serviceId = null, ipAddress = '', deviceInfo = '', expiresInDays = 7) {
  // Generate a random token
  const token = crypto.randomBytes(40).toString('hex');
  
  // Set expiration date (default: 7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  
  // Create token document
  return this.create({
    userId,
    token,
    type: 'refresh',
    expiresAt,
    metadata: {
      serviceId,
      deviceInfo,
      ipAddress
    }
  });
};

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;
