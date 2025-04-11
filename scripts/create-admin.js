require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('../src/utils/logger');

// Function to create admin user
const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    logger.info('MongoDB Connected');
    
    // Import models
    const User = require('../src/models/user.model');
    const Role = require('../src/models/role.model');
    const UserService = require('../src/models/userService.model');
    
    // Delete existing admin user if any
    await User.deleteOne({ username: process.env.ADMIN_USERNAME });
    logger.info('Existing admin user removed (if any)');
    
    // Create admin role if it doesn't exist
    let adminRole = await Role.findOne({ name: 'admin', isGlobal: true });
    
    if (!adminRole) {
      logger.info('Creating admin role...');
      
      adminRole = await Role.create({
        name: 'admin',
        description: 'System administrator with full access',
        isGlobal: true,
        permissions: [
          'user:read', 'user:write', 'user:delete',
          'role:read', 'role:write', 'role:delete',
          'service:read', 'service:write', 'service:delete',
          'audit:read'
        ]
      });
      
      logger.info('Admin role created successfully');
    } else {
      logger.info('Admin role already exists');
    }
    
    // Create admin user with plain text password (will be hashed by pre-save hook)
    const adminUser = await User.create({
      username: process.env.ADMIN_USERNAME,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      displayName: process.env.ADMIN_DISPLAY_NAME,
      isEmailVerified: true,
      status: 'active',
      metadata: {
        bio: 'System Administrator',
        preferences: {
          language: 'en',
          theme: 'dark',
          notifications: true
        }
      }
    });
    
    logger.info('Admin user created successfully');
    
    // Remove existing user-service relations
    await UserService.deleteMany({ userId: adminUser._id });
    
    // Assign admin role to admin user
    await UserService.create({
      userId: adminUser._id,
      serviceId: null, // Global relationship
      roles: [adminRole._id],
      status: 'active',
      customData: {}
    });
    
    logger.info('Admin role assigned to admin user successfully');
    
    // Test login with plain text password
    const testUser = await User.findOne({ username: process.env.ADMIN_USERNAME }).select('+password');
    const isMatch = await bcrypt.compare(process.env.ADMIN_PASSWORD, testUser.password);
    
    logger.info(`Password verification test: ${isMatch ? 'PASSED' : 'FAILED'}`);
    
    // Close connection
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    
    logger.info('Admin setup completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error(`Error setting up admin: ${error.message}`);
    logger.error(error.stack);
    
    // Close connection
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    } catch (err) {
      logger.error('Error closing MongoDB connection');
    }
    
    process.exit(1);
  }
};

// Run the function
createAdmin();
