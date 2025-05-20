// config/mongodb.js
const mongoose = require('mongoose');
require('dotenv').config();

// Increase the buffering timeout globally
mongoose.set('bufferTimeoutMS', 30000);

// Use the exact same connection string that works in MongoDB Compass
const MONGODB_URI = process.env.MONGODB_URI;

const connectMongoDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    
    // Close any existing connections first
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    
    await mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('MongoDB connected successfully');
      console.log('Connection state:', mongoose.connection.readyState);
      // Start your server here
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });

    // Add connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
};

module.exports = { connectMongoDB, mongoose };
