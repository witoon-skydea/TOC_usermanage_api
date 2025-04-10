require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../src/utils/logger');

// Function to check MongoDB connection
const checkDatabase = async () => {
  try {
    logger.info('MongoDB connection check starting...');
    
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Check if connection is established
    if (mongoose.connection.readyState === 1) {
      logger.info('MongoDB connection status: Connected');
      
      // Check database name
      logger.info(`Database name: ${mongoose.connection.db.databaseName}`);
      
      // List all collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      logger.info(`Collections count: ${collections.length}`);
      
      if (collections.length > 0) {
        logger.info('Available collections:');
        collections.forEach(collection => {
          logger.info(`- ${collection.name}`);
        });
      } else {
        logger.warn('No collections found in the database.');
      }
      
      // Check some stats
      const stats = await mongoose.connection.db.stats();
      logger.info('Database stats:');
      logger.info(`- Storage size: ${(stats.storageSize / (1024 * 1024)).toFixed(2)} MB`);
      logger.info(`- Data size: ${(stats.dataSize / (1024 * 1024)).toFixed(2)} MB`);
      logger.info(`- Objects count: ${stats.objects}`);
      
      logger.info('Database check completed successfully');
    } else {
      logger.error(`MongoDB connection status: ${mongoose.STATES[mongoose.connection.readyState]}`);
    }
    
    // Close connection
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    logger.error(`Error checking database: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
};

// Run the check
checkDatabase();
