const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoose = require('mongoose');
const http = require('http') ; // Added for WebSocket support
const socketIo = require('socket.io'); // You'll need to install this package

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Create HTTP server for WebSocket support
const server = http.createServer(app) ;

// Set trust proxy (already correctly placed)
app.set('trust proxy', 1);

// Import passport configuration
require('./config/passport');

// IMPORTANT: Apply CORS before Helmet
// Improved CORS configuration for audio app
app.use(cors({
  origin: 'https://trafficjam.v2u.us' || 'https://localhost:3000', // Replace with your frontend URL

  // origin: function(origin, callback) {
  //   const allowedOrigins = [
  //     'https://trafficjam.v2u.us',
  //     process.env.REACT_APP_API_URL || 'http://localhost:3000',
  //     'capacitor://localhost' // iOS
  //   ];
    
  //   // Allow requests with no origin (like mobile apps or curl requests) 
  //   if (!origin) return callback(null, true);
    
  //   if (allowedOrigins.indexOf(origin) !== -1) {
  //     callback(null, true);
  //   } else {
  //     console.log('CORS blocked origin:', origin);
  //     callback(null, true); // Temporarily allow all origins for debugging
  //   }
  // },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'X-CSRF-Token',
    'X-Requested-With',
    'Accept',
    'Accept-Version',
    'Content-Length',
    'Content-MD5',
    'Content-Type',
    'Date',
    'X-Api-Version',
    'Authorization'
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// THEN apply Helmet after CORS
// Enhanced security with Helmet - modified to be more permissive with CORS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "https:", "*"],
      mediaSrc: ["'self'", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      // Add this to be more permissive
      imgSrc: ["'self'", "data:", "blob:"],
    }
  },
  // Disable crossOriginResourcePolicy for CORS to work properly
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // Disable crossOriginEmbedderPolicy for CORS to work properly
  crossOriginEmbedderPolicy: false
}) );

app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // HTTP request logger
app.use(compression()); // Compress responses

// Enhanced Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skipSuccessfulRequests: true, // Only count failed requests
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

// Initialize Socket.IO with CORS configuration
const io = socketIo(server, {
  cors: {
    origin: [
      process.env.REACT_APP_API_URL|| 'http://localhost:3000',
      'https://trafficjam.v2u.us',
      'https://trafficjam-kqeieirzf-v2u.vercel.app',
      'https://dev-trafficjam.v2u.us',
      'https://staging-trafficjam.v2u.us'
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  // For audio streaming, increase ping timeout
  pingTimeout: 60000,
}) ;

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Join a group room
  socket.on('join-group', (groupId) => {
    socket.join(`group-${groupId}`);
    console.log(`Socket ${socket.id} joined group ${groupId}`);
  });
  
  // Leave a group room
  socket.on('leave-group', (groupId) => {
    socket.leave(`group-${groupId}`);
    console.log(`Socket ${socket.id} left group ${groupId}`);
  });
  
  // Handle location updates
  socket.on('location-update', (data) => {
    // Broadcast to all members of the group
    io.to(`group-${data.groupId}`).emit('member-location', {
      userId: data.userId,
      location: data.location,
      timestamp: new Date()
    });
  });
  
  // Handle audio streaming events
  socket.on('audio-stream', (data) => {
    // Broadcast audio data to group members
    socket.to(`group-${data.groupId}`).emit('audio-data', data);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Define function to set up routes and start server
function setupServer() {
  // Enable pre-flight for all routes
  app.options('*', cors());
  
  // Add a CORS test endpoint
  app.get('/api/cors-test', (req, res) => {
    res.status(200).json({ 
      message: 'CORS is working properly',
      origin: req.headers.origin || 'No origin header',
      timestamp: new Date()
    });
  });

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
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      socketio: io ? 'initialized' : 'not initialized'
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

  // Enhanced error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Determine status code from error or default to 500
    const statusCode = err.statusCode || 500;
    
    // Create error response
    const errorResponse = {
      success: false,
      message: statusCode === 500 ? 'Internal Server Error' : err.message,
    };
    
    // Only include error details in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.error = err.message;
      errorResponse.stack = err.stack;
    }
    
    res.status(statusCode).json(errorResponse);
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

  // Start server using the HTTP server instance instead of app directly
  if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

// Connect to MongoDB before starting the server
console.log('Connecting to MongoDB...');
mongoose.set('bufferTimeoutMS', 30000); // Increase buffer timeout

// Get MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://richcobrien:1Topgun123@trafficjam.xk2uszk.mongodb.net/?retryWrites=true&w=majority&appName=subscribers';

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
