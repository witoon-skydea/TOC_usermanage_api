require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('../src/utils/logger');

// Function to create admin user and role
const setAdminRole = async () => {
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
    
    // Create regular user role if it doesn't exist
    let userRole = await Role.findOne({ name: 'user', isGlobal: true });
    
    if (!userRole) {
      logger.info('Creating user role...');
      
      userRole = await Role.create({
        name: 'user',
        description: 'Regular user with limited access',
        isGlobal: true,
        permissions: ['user:read']
      });
      
      logger.info('User role created successfully');
    } else {
      logger.info('User role already exists');
    }
    
    // Check if admin user exists
    let adminUser = await User.findOne({ username: process.env.ADMIN_USERNAME });
    
    if (!adminUser) {
      logger.info('Creating admin user...');
      
      // Generate hashed password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);
      
      // Create admin user
      adminUser = await User.create({
        username: process.env.ADMIN_USERNAME,
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
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
    } else {
      logger.info('Admin user already exists');
    }
    
    // Assign admin role to admin user if not already assigned
    let userService = await UserService.findOne({
      userId: adminUser._id,
      roles: adminRole._id
    });
    
    if (!userService) {
      logger.info('Assigning admin role to admin user...');
      
      await UserService.create({
        userId: adminUser._id,
        serviceId: null, // Global relationship
        roles: [adminRole._id],
        status: 'active',
        customData: {}
      });
      
      logger.info('Admin role assigned to admin user successfully');
    } else {
      logger.info('Admin role already assigned to admin user');
    }
    
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

// Run the setup
setAdminRole();
