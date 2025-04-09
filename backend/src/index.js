const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoose = require('mongoose'); // Add mongoose import

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Import passport configuration
require('./config/passport');

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.REACT_APP_API_LOCAL_URL || REACT_APP_API_PRODUCTION_URL
}) );
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // HTTP request logger
app.use(compression()); // Compress responses

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Initialize Passport
app.use(passport.initialize());

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const groupRoutes = require('./routes/groups.routes');
const audioRoutes = require('./routes/audio.routes');
const locationRoutes = require('./routes/location.routes');
const subscriptionRoutes = require('./routes/subscriptions.routes');
const notificationRoutes = require('./routes/notifications.routes');

// Define function to set up routes and start server
function setupServer() {
  // Use routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/groups', groupRoutes);
  app.use('/api/audio', audioRoutes);
  app.use('/api/location', locationRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/notifications', notificationRoutes);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date(),
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.status(200).json({ 
      message: 'Welcome to the Audio Group Communication API',
      version: '1.0.0',
      documentation: '/api-docs',
      source: 'backend/src/index.js'
    });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  });

  // Set port
  const PORT = process.env.PORT || 3001;

  // Start server
  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

// Connect to MongoDB before starting the server
console.log('Connecting to MongoDB...');
mongoose.set('bufferTimeoutMS', 30000); // Increase buffer timeout

// Get MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://atlas-sample-dataset-load-67f67b8dd6e58c28cc8b9524:<1Topgun123$>@subscribers.xjpvrda.mongodb.net/?appName=subscribers';

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
})
.then(() => {
  console.log('MongoDB connected successfully');
  // Set up connection event listeners
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });
  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
  });
  
  // Setup routes and start server after MongoDB connection is established
  setupServer();
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  console.log('Starting server without MongoDB connection...');
  // Still start the server even if MongoDB fails to connect
  setupServer();
});

module.exports = app;
