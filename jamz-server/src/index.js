const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const http = require('http'); // Added for WebSocket support
const socketIo = require('socket.io'); // You'll need to install this package

// Load environment variables
dotenv.config();

// Import the enhanced MongoDB connection module
const { connectMongoDB, isMongoDBConnected, mongoose } = require('./config/mongodb');

// Initialize Express app
const app = express();

app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// Set trust proxy (already correctly placed)
app.set('trust proxy', 1);

// Import passport configuration
require('./config/passport');

// Import database connection
const sequelize = require('./config/database');

app.use(morgan('dev')); // HTTP request logger
app.use(compression()); // Compress responses

// ===== ADD HEADER LOGGER HERE =====
app.use((req, res, next) => {
  console.log("\n=== INCOMING REQUEST HEADERS ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Body:", req.body); // Optional: Log request body
  next();
});
// ===== END HEADER LOGGER =====

// IMPORTANT: Apply CORS before Helmet
// CORS configuration
// Allow requests from specific origins
const allowedOrigins = [
  'http://localhost:3000', // For local development
  'https://jamz-v2u.vercel.app', // For production client
  'https://jamz-static-test-build.vercel.app', // For static client test build
  'https://trafficjam.v2u.us', // For production client
  'capacitor://trafficjam.v2u.us',
  'ionic://trafficjam.v2u.us'
];

// Apply CORS middleware before other middleware and routes
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked CORS for origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Explicitly handle OPTIONS requests for all routes
app.options('*', cors());

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
}));

// Enhanced Rate limiting configuration
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skipSuccessfulRequests: true, // Only count failed requests
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Initialize Passport
app.use(passport.initialize());

// Debugging only, Add this near the top of your index.js file
const path = require('path');
console.log('Current directory:', __dirname);
console.log('Resolved routes path:', path.resolve(__dirname, 'routes'));
console.log('Routes directory exists:', require('fs').existsSync(path.resolve(__dirname, 'routes')));

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
      'http://localhost:3000', // For local development
      'https://jamz-v2u.vercel.app', // For production client
      'https://jamz-static-test-build.vercel.app', // For static client test build
      'https://trafficjam.v2u.us', // For production client
      'capacitor://trafficjam.v2u.us',  // For iOS apps
      'ionic://trafficjam.v2u.us', // For Android apps
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  // For audio streaming, increase ping timeout
  pingTimeout: 60000,
});

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
  // Add a CORS test endpoint
  app.get('/api/cors-test', (req, res) => {
    res.status(200).json({ 
      message: 'CORS is working properly',
      origin: req.headers.origin || 'No origin header',
      timestamp: new Date()
    });
  });

  // Add database test endpoint
  app.get('/api/db-test', async (req, res) => {
    try {
      console.log('Testing database connection...');
      console.log('Environment:', {
        NODE_ENV: process.env.NODE_ENV,
        POSTGRES_HOST: process.env.POSTGRES_HOST,
        POSTGRES_PORT: process.env.POSTGRES_PORT,
        POSTGRES_DB: process.env.POSTGRES_DB,
        POSTGRES_USER: process.env.POSTGRES_USER
      });
      
      await sequelize.authenticate();
      console.log('Database connection successful!');
      
      res.json({ 
        success: true, 
        message: 'Database connected successfully',
        env: process.env.NODE_ENV,
        host: process.env.POSTGRES_HOST,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Database connection error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Database connection failed', 
        error: error.message,
        config: {
          host: process.env.POSTGRES_HOST,
          port: process.env.POSTGRES_PORT,
          database: process.env.POSTGRES_DB,
          user: process.env.POSTGRES_USER
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  // Add MongoDB test endpoint
  app.get('/api/mongodb-test', async (req, res) => {
    try {
      const mongoStatus = isMongoDBConnected();
      
      res.json({
        success: true,
        connected: mongoStatus,
        connectionState: mongoose.connection.readyState,
        stateDescription: getMongoConnectionStateDescription(mongoose.connection.readyState),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('MongoDB test error:', error);
      res.status(500).json({
        success: false,
        message: 'MongoDB test failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
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
      mongodb_state: getMongoConnectionStateDescription(mongoose.connection.readyState),
      postgres: sequelize.authenticate().then(() => true).catch(() => false) ? 'connected' : 'disconnected',
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

  // Debug endpoints to verify routing
  app.get('/debug-routes', (req, res) => {
    const routes = [];
    
    // Extract routes from Express app
    app._router.stack.forEach(middleware => {
      if (middleware.route) {
        // Routes registered directly on the app
        routes.push({
          path: middleware.route.path,
          methods: Object.keys(middleware.route.methods)
        });
      } else if (middleware.name === 'router') {
        // Router middleware
        middleware.handle.stack.forEach(handler => {
          if (handler.route) {
            routes.push({
              path: middleware.regexp.toString() + handler.route.path,
              methods: Object.keys(handler.route.methods)
            });
          }
        });
      }
    });
    
    res.json({
      success: true,
      message: 'Debug routes',
      routes: routes,
      env: process.env.NODE_ENV,
      baseUrl: req.baseUrl,
      originalUrl: req.originalUrl,
      timestamp: new Date().toISOString()
    });
  });

  // Simple test endpoint at root level
  app.get('/hello', (req, res) => {
    res.json({
      message: 'Hello from API',
      timestamp: new Date().toISOString()
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
  const PORT = process.env.PORT || 5000;

  // Start server using the HTTP server instance instead of app directly
  if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`MongoDB connection state: ${getMongoConnectionStateDescription(mongoose.connection.readyState)}`);
    });
  }
}

// Helper function to get human-readable MongoDB connection state
function getMongoConnectionStateDescription(state) {
  switch (state) {
    case 0: return 'disconnected';
    case 1: return 'connected';
    case 2: return 'connecting';
    case 3: return 'disconnecting';
    default: return 'unknown';
  }
}

// Start the application
async function startApplication() {
  try {
    console.log('Starting application...');
    
    // First, try to connect to MongoDB
    const mongoConnected = await connectMongoDB();
    
    if (mongoConnected) {
      console.log('MongoDB connected successfully. Starting server with full functionality.');
    } else {
      console.warn('Failed to connect to MongoDB. Starting server with limited functionality.');
    }
    
    // Setup routes and start server regardless of MongoDB connection status
    // This ensures the application is resilient to database failures
    setupServer();
    
  } catch (error) {
    console.error('Application startup error:', error);
    console.warn('Starting server with limited functionality due to startup error.');
    setupServer();
  }
}

// Start the application
startApplication();

module.exports = app;
