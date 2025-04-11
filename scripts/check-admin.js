require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('../src/utils/logger');

// Function to check admin user
const checkAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    logger.info('MongoDB Connected');
    
    // Import models
    const User = require('../src/models/user.model');
    
    // Find admin user
    const adminUser = await User.findOne({ username: process.env.ADMIN_USERNAME }).select('+password');
    
    if (adminUser) {
      logger.info('Admin user found');
      logger.info(`Username: ${adminUser.username}`);
      logger.info(`Email: ${adminUser.email}`);
      logger.info(`Display Name: ${adminUser.displayName}`);
      logger.info(`Status: ${adminUser.status}`);
      logger.info(`Email Verified: ${adminUser.isEmailVerified}`);
      
      // Test password
      const testPassword = process.env.ADMIN_PASSWORD;
      logger.info(`Testing password from .env: ${testPassword}`);
      
      const isMatch = await bcrypt.compare(testPassword, adminUser.password);
      logger.info(`Password match: ${isMatch}`);
      
      if (!isMatch) {
        // If password doesn't match, update it
        logger.info('Updating admin password...');
        
        // Generate salt and hash
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(testPassword, salt);
        
        // Update admin password
        adminUser.password = hashedPassword;
        await adminUser.save();
        
        logger.info('Admin password updated successfully');
      }
    } else {
      logger.error('Admin user not found');
    }
    
    // Close connection
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    logger.error(`Error checking admin: ${error.message}`);
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
checkAdmin();
