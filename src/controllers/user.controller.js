const jwt = require('jsonwebtoken');
const { User, Token, Role, UserService } = require('../models');
const { APIError } = require('../utils/error.handler');
const logger = require('../utils/logger');

// Generate JWT token
const generateToken = (user, serviceId = null) => {
  return jwt.sign(
    { 
      id: user._id,
      username: user.username,
      serviceId: serviceId
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
exports.registerUser = async (req, res, next) => {
  try {
    const { username, email, password, displayName, profileImage, metadata } = req.body;
    
    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });
    
    if (existingUser) {
      if (existingUser.username === username) {
        return next(new APIError('Username already in use', 400));
      }
      if (existingUser.email === email) {
        return next(new APIError('Email already in use', 400));
      }
    }
    
    // Create new user
    const user = new User({
      username,
      email,
      password,
      displayName,
      profileImage: profileImage || null,
      metadata: metadata || {}
    });
    
    await user.save();
    
    // Find default user role
    const defaultRole = await Role.findOne({ name: 'user', isGlobal: true });
    
    if (defaultRole) {
      // Assign default role to user
      await UserService.create({
        userId: user._id,
        serviceId: null, // Global relationship
        roles: [defaultRole._id],
        status: 'active'
      });
    }
    
    // Generate verification token
    await Token.generateVerificationToken(
      user._id,
      req.service ? req.service._id : null,
      req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      req.headers['user-agent'] || ''
    );
    
    // Response without password
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        status: user.status,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
exports.loginUser = async (req, res, next) => {
  try {
    const { username, password, serviceId } = req.body;
    
    // Find user by username
    const user = await User.findOne({ username }).select('+password');
    
    if (!user) {
      return next(new APIError('Invalid credentials', 401));
    }
    
    // Check if password matches
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return next(new APIError('Invalid credentials', 401));
    }
    
    // Check if user account is active
    if (user.status !== 'active') {
      return next(new APIError('Your account is not active. Please contact administrator.', 403));
    }
    
    // If service is specified, check if user has access to it
    let service = null;
    if (serviceId) {
      // Check if user has access to the service
      const userService = await UserService.findOne({
        userId: user._id,
        serviceId: serviceId
      });
      
      if (!userService) {
        return next(new APIError('You do not have access to this service', 403));
      }
      
      if (userService.status !== 'active') {
        return next(new APIError('Your access to this service is suspended', 403));
      }
      
      service = serviceId;
    }
    
    // Update last login time
    user.lastLoginAt = new Date();
    await user.save();
    
    // Generate JWT token
    const token = generateToken(user, service);
    
    // Generate refresh token
    const refreshToken = await Token.generateRefreshToken(
      user._id,
      service,
      req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      req.headers['user-agent'] || ''
    );
    
    // Response without password
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken: refreshToken.token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        profileImage: user.profileImage,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res, next) => {
  try {
    // Find user with populated relationships
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return next(new APIError('User not found', 404));
    }
    
    // Get user services and roles
    const userServices = await UserService.find({ userId: user._id })
      .populate('serviceId', 'name description')
      .populate('roles', 'name description');
    
    // Response
    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        profileImage: user.profileImage,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        metadata: user.metadata
      },
      services: userServices.map(us => ({
        service: us.serviceId,
        status: us.status,
        roles: us.roles,
        customData: us.customData
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res, next) => {
  try {
    const { displayName, profileImage, metadata } = req.body;
    
    // Find user
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return next(new APIError('User not found', 404));
    }
    
    // Update fields if provided
    if (displayName) user.displayName = displayName;
    if (profileImage !== undefined) user.profileImage = profileImage;
    
    // Update metadata if provided
    if (metadata) {
      // Merge with existing metadata
      user.metadata = {
        ...user.metadata,
        ...metadata,
        preferences: {
          ...(user.metadata.preferences || {}),
          ...(metadata.preferences || {})
        }
      };
    }
    
    user.updatedAt = new Date();
    await user.save();
    
    // Response
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        profileImage: user.profileImage,
        metadata: user.metadata
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change user password
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Find user with password
    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      return next(new APIError('User not found', 404));
    }
    
    // Check if current password is correct
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return next(new APIError('Current password is incorrect', 401));
    }
    
    // Update password
    user.password = newPassword;
    user.updatedAt = new Date();
    await user.save();
    
    // Invalidate all refresh tokens
    await Token.deleteMany({
      userId: user._id,
      type: 'refresh'
    });
    
    // Response
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/users/refresh-token
// @access  Public (with refresh token)
exports.refreshToken = async (req, res, next) => {
  try {
    // User and token should be attached from middleware
    const { user, token, service } = req;
    
    // Generate new access token
    const newAccessToken = generateToken(user, service ? service._id : null);
    
    // Response
    res.status(200).json({
      success: true,
      token: newAccessToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email with token
// @route   GET /api/users/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    
    // Find token
    const tokenDoc = await Token.findOne({
      token,
      type: 'verification'
    });
    
    if (!tokenDoc) {
      return next(new APIError('Invalid or expired verification token', 400));
    }
    
    // Check if token is expired
    if (tokenDoc.isExpired()) {
      await tokenDoc.delete();
      return next(new APIError('Verification token has expired', 400));
    }
    
    // Find user
    const user = await User.findById(tokenDoc.userId);
    
    if (!user) {
      await tokenDoc.delete();
      return next(new APIError('User not found', 404));
    }
    
    // Update user email verification status
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      user.status = 'active'; // Activate user account
      await user.save();
    }
    
    // Delete token
    await tokenDoc.delete();
    
    // Response
    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user (invalidate refresh token)
// @route   POST /api/users/logout
// @access  Private
exports.logoutUser = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      // Delete refresh token
      await Token.deleteOne({
        token: refreshToken,
        type: 'refresh'
      });
    }
    
    // Response
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (with pagination)
// @route   GET /api/users
// @access  Private (Admin only)
exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = {};
    
    // Search by username or email
    if (req.query.search) {
      filter.$or = [
        { username: new RegExp(req.query.search, 'i') },
        { email: new RegExp(req.query.search, 'i') },
        { displayName: new RegExp(req.query.search, 'i') }
      ];
    }
    
    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Count total
    const total = await User.countDocuments(filter);
    
    // Find users
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
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

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Admin only)
exports.getUserById = async (req, res, next) => {
  try {
    // Find user with populated relationships
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return next(new APIError('User not found', 404));
    }
    
    // Get user services and roles
    const userServices = await UserService.find({ userId: user._id })
      .populate('serviceId', 'name description')
      .populate('roles', 'name description');
    
    // Response
    res.status(200).json({
      success: true,
      user,
      services: userServices
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user (admin)
// @route   PUT /api/users/:id
// @access  Private (Admin only)
exports.updateUser = async (req, res, next) => {
  try {
    const { displayName, profileImage, status, isEmailVerified, metadata } = req.body;
    
    // Find user
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return next(new APIError('User not found', 404));
    }
    
    // Update fields if provided
    if (displayName) user.displayName = displayName;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (status) user.status = status;
    if (isEmailVerified !== undefined) user.isEmailVerified = isEmailVerified;
    
    // Update metadata if provided
    if (metadata) {
      // Merge with existing metadata
      user.metadata = {
        ...user.metadata,
        ...metadata,
        preferences: {
          ...(user.metadata.preferences || {}),
          ...(metadata.preferences || {})
        }
      };
    }
    
    user.updatedAt = new Date();
    await user.save();
    
    // Response
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res, next) => {
  try {
    // Find user
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return next(new APIError('User not found', 404));
    }
    
    // Check if trying to delete admin user
    if (user.username === process.env.ADMIN_USERNAME) {
      return next(new APIError('Cannot delete admin user', 403));
    }
    
    // Delete user services
    await UserService.deleteMany({ userId: user._id });
    
    // Delete user tokens
    await Token.deleteMany({ userId: user._id });
    
    // Delete user
    await user.deleteOne();
    
    // Response
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request password reset
// @route   POST /api/users/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return next(new APIError('Email is required', 400));
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    // Don't reveal if user exists or not for security
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If a user with that email exists, a password reset link has been sent'
      });
    }
    
    // Generate password reset token
    const resetToken = await Token.generatePasswordResetToken(
      user._id,
      req.service ? req.service._id : null,
      req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      req.headers['user-agent'] || ''
    );
    
    // TODO: Send email with reset token
    // This would typically involve sending an email with a link containing the token
    // For now, we'll just return the token in the response
    
    // Response
    res.status(200).json({
      success: true,
      message: 'If a user with that email exists, a password reset link has been sent',
      resetToken: resetToken.token // In production, this should be removed
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password with token
// @route   POST /api/users/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return next(new APIError('Password is required', 400));
    }
    
    // Find token
    const tokenDoc = await Token.findOne({
      token,
      type: 'password_reset'
    });
    
    if (!tokenDoc) {
      return next(new APIError('Invalid or expired reset token', 400));
    }
    
    // Check if token is expired
    if (tokenDoc.isExpired()) {
      await tokenDoc.delete();
      return next(new APIError('Reset token has expired', 400));
    }
    
    // Find user
    const user = await User.findById(tokenDoc.userId);
    
    if (!user) {
      await tokenDoc.delete();
      return next(new APIError('User not found', 404));
    }
    
    // Update password
    user.password = password;
    user.updatedAt = new Date();
    await user.save();
    
    // Delete token
    await tokenDoc.delete();
    
    // Delete all refresh tokens for this user for security
    await Token.deleteMany({
      userId: user._id,
      type: 'refresh'
    });
    
    // Response
    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};
