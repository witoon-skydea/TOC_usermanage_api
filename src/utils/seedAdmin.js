require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./logger');
const { User, Role } = require('../models');
const connectDB = require('../config/db.config');

// Function to create admin user
const createAdminUser = async () => {
  try {
    // Connect to the database
    await connectDB();

    // Check if the admin role exists
    let adminRole = await Role.findOne({ name: 'admin', isGlobal: true });
    
    // If admin role doesn't exist, create it
    if (!adminRole) {
      logger.info('Admin role not found, creating it...');
      adminRole = await Role.create({
        name: 'admin',
        description: 'System administrator with full access',
        isGlobal: true,
        permissions: ['user:read', 'user:write', 'user:delete', 'role:read', 'role:write', 'service:read', 'service:write']
      });
      logger.info('Admin role created successfully');
    }

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username: process.env.ADMIN_USERNAME });
    
    if (existingAdmin) {
      logger.info(`Admin user '${process.env.ADMIN_USERNAME}' already exists`);
      // Force update admin password if needed
      if (process.env.FORCE_UPDATE_ADMIN_PASSWORD === 'true') {
        existingAdmin.password = process.env.ADMIN_PASSWORD;
        await existingAdmin.save();
        logger.info('Admin password updated successfully');
      }
    } else {
      // Create admin user
      const adminUser = new User({
        username: process.env.ADMIN_USERNAME,
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        displayName: process.env.ADMIN_DISPLAY_NAME,
        isEmailVerified: true,
        status: 'active'
      });
      
      await adminUser.save();
      logger.info(`Admin user '${process.env.ADMIN_USERNAME}' created successfully`);
    }

    // Disconnect from database
    await mongoose.disconnect();
    logger.info('Database connection closed');
    
    process.exit(0);
  } catch (error) {
    logger.error(`Error creating admin user: ${error.message}`);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the function
createAdminUser();
