// config/mongodb.js
const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Enhanced MongoDB connection module with robust error handling
 * and connection management for both local and production environments.
 */

// Increase the buffering timeout globally
mongoose.set('bufferTimeoutMS', 30000);

// Connection options with improved settings for reliability
const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 15000, // Faster failure detection for server selection
  heartbeatFrequencyMS: 10000,     // More frequent heartbeats to detect issues
  socketTimeoutMS: 45000,          // Longer socket timeout for operations
  maxPoolSize: 10,                 // Limit connection pool size for serverless environments
  minPoolSize: 1,                  // Ensure at least one connection is maintained
  connectTimeoutMS: 30000,         // Connection timeout
  retryWrites: true,               // Enable retry for write operations
  retryReads: true                 // Enable retry for read operations
};

// Track connection state for better error handling
let isConnecting = false;
let connectionEstablished = false;

/**
 * Connect to MongoDB with enhanced error handling and connection management
 * @returns {Promise<boolean>} True if connection successful, false otherwise
 */
const connectMongoDB = async () => {
  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    console.log('MongoDB connection attempt already in progress');
    return connectionEstablished;
  }

  // If already connected, return true
  if (mongoose.connection.readyState === 1) {
    console.log('MongoDB already connected');
    return true;
  }

  isConnecting = true;
  
  try {
    // Get MongoDB URI from environment variables
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      console.error('MONGODB_URI is undefined. Check your environment variables.');
      isConnecting = false;
      return false;
    }
    
    console.log('Connecting to MongoDB:', MONGODB_URI ? 'Connection string found' : 'Connection string missing');
    
    // Close any existing connections first
    if (mongoose.connection.readyState !== 0) {
      console.log('Closing existing MongoDB connection');
      await mongoose.connection.close();
    }
    
    // Connect with enhanced options
    await mongoose.connect(MONGODB_URI, connectionOptions);
    
    console.log('MongoDB connected successfully');
    console.log('Connection state:', mongoose.connection.readyState);
    
    connectionEstablished = true;
    
    // Setup connection event listeners for monitoring
    setupConnectionMonitoring();
    
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    connectionEstablished = false;
    return false;
  } finally {
    isConnecting = false;
  }
};

/**
 * Setup MongoDB connection monitoring with event listeners
 */
const setupConnectionMonitoring = () => {
  // Handle connection errors
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
    connectionEstablished = false;
  });
  
  // Handle disconnection
  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
    connectionEstablished = false;
  });
  
  // Handle reconnection
  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
    connectionEstablished = true;
  });
  
  // Handle connection close
  mongoose.connection.on('close', () => {
    console.log('MongoDB connection closed');
    connectionEstablished = false;
  });
  
  // Handle process termination
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to application termination');
      process.exit(0);
    } catch (err) {
      console.error('Error during MongoDB disconnection:', err);
      process.exit(1);
    }
  });
};

/**
 * Check if MongoDB is connected
 * @returns {boolean} True if connected, false otherwise
 */
const isMongoDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Get current MongoDB connection state
 * @returns {number} Connection state (0: disconnected, 1: connected, 2: connecting, 3: disconnecting)
 */
const getConnectionState = () => {
  return mongoose.connection.readyState;
};

/**
 * Gracefully disconnect from MongoDB
 * @returns {Promise<void>}
 */
const disconnectMongoDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.close();
      console.log('MongoDB disconnected successfully');
      connectionEstablished = false;
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }
};

module.exports = {
  connectMongoDB,
  disconnectMongoDB,
  isMongoDBConnected,
  getConnectionState,
  mongoose
};
