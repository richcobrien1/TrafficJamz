// jamz-server/src/index.js
// Main entry point for the TrafficJamz backend server

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

// Runtime toggle for audio signaling — can be changed without restarting the process
let audioSignalingEnabled = process.env.DISABLE_AUDIO_SIGNALING !== 'true';


// Import the enhanced MongoDB connection module
const { connectMongoDB, isMongoDBConnected, mongoose } = require('./config/mongodb');

// Initialize Express app
const app = express();

// Expose runtime flag on app.locals so route modules can read/update it
app.locals.audioSignalingEnabled = audioSignalingEnabled;
// Initialize simple in-memory metrics for rate-limit hits
app.locals.rateLimitMetrics = {
  candidates: 0,
  musicSync: 0
};

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

// ===== CORS Configuration =====
// Allowlist for known production/origin values. Localhost variants are handled
// dynamically to accept optional ports (e.g. http://localhost, http://localhost:80).
const allowedOrigins = [
  'https://trafficjam.v2u.us',       // Production client
  'capacitor://trafficjam.v2u.us',   // iOS apps
  'ionic://trafficjam.v2u.us',       // Android apps
  'http://192.178.58.146:5173',      // User's network IP for mobile testing
  'http://192.178.58.146:5174'       // Additional port for mobile testing
];

// Helper: permissive localhost matcher (accepts http(s)://localhost(:port)? and local network IPs)
function isLocalhostOrigin(origin) {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    // Allow localhost and 127.0.0.1
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      return true;
    }
    // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16.x.x-172.31.x.x)
    const ipRegex = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/;
    return ipRegex.test(u.hostname);
  } catch (e) {
    return false;
  }
}

const corsOptionsDelegate = function (req, callback) {
  const origin = req.header('Origin');

  // If there's no Origin header, treat it as a same-origin/internal request
  // (for example: curl from container, or proxy that strips Origin). Allow it.
  if (!origin) {
    return callback(null, {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Content-Length', 'Authorization'],
      optionsSuccessStatus: 204
    });
  }

  // Accept explicit allowed origins or localhost variants
  if (allowedOrigins.includes(origin) || isLocalhostOrigin(origin)) {
    return callback(null, {
      origin: origin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Content-Length', 'Authorization'],
      optionsSuccessStatus: 204
    });
  }

  console.log('🔒 Blocked CORS for origin:', origin);
  callback(new Error('Not allowed by CORS'));
};

app.use(cors(corsOptionsDelegate));         // Applies to all requests
app.options('*', cors(corsOptionsDelegate)); // Handles preflight consistently

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

// Mount debug routes early (router implemented in src/routes/debug.routes.js)
const debugRoutes = require('./routes/debug.routes');
app.use('/api/debug', debugRoutes);

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
const placesRoutes = require('./routes/places.routes');
const configRoutes = require('./routes/config.routes');
const invitationsRoutes = require('./routes/invitations.routes');

// Initialize Socket.IO with CORS configuration
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      console.log('🔍 Socket.IO CORS check for origin:', origin);
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        console.log('✅ Allowing request with no origin');
        return callback(null, true);
      }

      // Check against allowed origins
      if (allowedOrigins.includes(origin) || isLocalhostOrigin(origin)) {
        console.log('✅ Allowing origin:', origin);
        return callback(null, true);
      }

      console.log('🔒 Blocked Socket.IO CORS for origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  // For audio streaming, increase ping timeout
  pingTimeout: 60000,
  // Add polling configuration
  allowEIO3: true,
  transports: ['polling', 'websocket']
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('✅ New client connected:', socket.id, 'from:', socket.handshake.address, 'origin:', socket.handshake.headers.origin);
  // Per-socket state for simple rate limiting
  socket._rateState = {
    lastCandidatesTs: 0,
    candidateCountWindow: 0,
    lastMusicSyncTs: 0,
    musicSyncCountWindow: 0
  };
  
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

  // WebRTC Audio Session Signaling Events (defensive handlers)
  // Register these handlers only if audio signaling is enabled. This allows
  // disabling signaling via the DISABLE_AUDIO_SIGNALING env var during
  // debugging or when running a minimal backend.
  if (process.env.DISABLE_AUDIO_SIGNALING !== 'true') {
  const safeEmitToRoom = (room, event, payload, excludeSocket = true) => {
    try {
      if (!room || typeof event !== 'string') return;
      if (excludeSocket) {
        socket.to(room).emit(event, payload);
      } else {
        io.to(room).emit(event, payload);
      }
    } catch (e) {
      console.error('Safe emit error:', e);
    }
  };

  // Use shared util for sessionId requirement and truncated payload logging
  const { requireSessionId } = require('./utils/socket-utils');

  // Mediasoup service (lazy require to avoid heavy startup when disabled)
  let mediasoupService = null;
  if (process.env.DISABLE_MEDIASOUP !== 'true') {
    try {
      mediasoupService = require('./services/mediasoup.service');
    } catch (e) {
      console.error('Could not load mediasoup service:', e.message);
      mediasoupService = null;
    }
  }

  // Simple per-socket rate limiter for bursty events (time window in ms)
  const rateLimitSocketEvent = (socket, key, maxCount, windowMs) => {
    const now = Date.now();
    const state = socket._rateState || (socket._rateState = {});
    if (!state[key + 'Ts']) {
      state[key + 'Ts'] = now;
      state[key + 'Count'] = 1;
      return true;
    }
    if (now - state[key + 'Ts'] > windowMs) {
      state[key + 'Ts'] = now;
      state[key + 'Count'] = 1;
      return true;
    }
    state[key + 'Count'] = (state[key + 'Count'] || 0) + 1;
    const allowed = state[key + 'Count'] <= maxCount;
    if (!allowed) {
      try {
        // Increment a simple in-memory metric for this rate-limit event
        const metrics = app.locals && app.locals.rateLimitMetrics;
        if (metrics && typeof metrics[key] === 'number') metrics[key]++;
      } catch (e) {
        // non-fatal
      }
    }
    return allowed;
  };

  socket.on('join-audio-session', (data) => {
    try {
      if (!audioSignalingEnabled) return;
  const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId) return; // ignore malformed payloads

      const room = `audio-${sessionId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined audio session ${sessionId}`);

      // Notify others in the session (exclude sender)
      safeEmitToRoom(room, 'participant-joined', {
        userId: data.userId || null,
        socketId: socket.id
      });
    } catch (err) {
      console.error('join-audio-session handler error:', err);
    }
  });

  socket.on('leave-audio-session', (data) => {
    try {
      if (!audioSignalingEnabled) return;
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId) return;

      const room = `audio-${sessionId}`;
      socket.leave(room);
      console.log(`Socket ${socket.id} left audio session ${sessionId}`);

      safeEmitToRoom(room, 'participant-left', {
        userId: data.userId || null,
        socketId: socket.id
      });
    } catch (err) {
      console.error('leave-audio-session handler error:', err);
    }
  });

  // WebRTC Signaling Events - validate payloads and guard each handler
  socket.on('webrtc-offer', (data) => {
    try {
      if (!audioSignalingEnabled) return;
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId || !data.offer) return;
      const room = `audio-${sessionId}`;
      safeEmitToRoom(room, 'webrtc-offer', {
        offer: data.offer,
        from: socket.id,
        sessionId,
        userId: data.userId || null
      });
    } catch (err) {
      console.error('webrtc-offer handler error:', err);
    }
  });

  socket.on('webrtc-answer', (data) => {
    try {
      if (!audioSignalingEnabled) return;
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId || !data.answer) return;
      const room = `audio-${sessionId}`;
      safeEmitToRoom(room, 'webrtc-answer', {
        answer: data.answer,
        from: socket.id,
        sessionId,
        userId: data.userId || null
      });
    } catch (err) {
      console.error('webrtc-answer handler error:', err);
    }
  });

  socket.on('webrtc-candidate', (data) => {
    try {
      if (!audioSignalingEnabled) return;
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId || !data.candidate) return;
      // Rate limit ICE candidates: max 50 per 5 seconds per socket
      if (!rateLimitSocketEvent(socket, 'candidates', 50, 5000)) {
        // drop silently but record a metric/log
        console.warn(`Rate limit exceeded for webrtc-candidate from ${socket.id}`);
        return;
      }
      const room = `audio-${sessionId}`;
      safeEmitToRoom(room, 'webrtc-candidate', {
        candidate: data.candidate,
        from: socket.id,
        sessionId,
        userId: data.userId || null
      });
    } catch (err) {
      console.error('webrtc-candidate handler error:', err);
    }
  });

  socket.on('webrtc-ready', (data) => {
    try {
      if (!audioSignalingEnabled) return;
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId) return;
      const room = `audio-${sessionId}`;
      // Broadcast ready state to others but avoid repeatedly echoing back
      safeEmitToRoom(room, 'webrtc-ready', {
        from: socket.id,
        sessionId,
        userId: data.userId || null
      });
    } catch (err) {
      console.error('webrtc-ready handler error:', err);
    }
  });

  // Mediasoup transport handshake helpers (basic)
  socket.on('mediasoup-create-transport', async (data, cb) => {
    try {
      if (!mediasoupService) return cb && cb({ success: false, error: 'mediasoup-disabled' });
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId) return cb && cb({ success: false, error: 'missing-session' });

      const transportInfo = await mediasoupService.createWebRtcTransport(sessionId);
      // return transport params to client
      cb && cb({ success: true, transport: {
        id: transportInfo.id,
        iceParameters: transportInfo.iceParameters,
        iceCandidates: transportInfo.iceCandidates,
        dtlsParameters: transportInfo.dtlsParameters
      }});
    } catch (err) {
      console.error('mediasoup-create-transport handler error:', err);
      cb && cb({ success: false, error: err.message });
    }
  });

  socket.on('mediasoup-get-rtpCapabilities', async (data, cb) => {
    try {
      if (!mediasoupService) return cb && cb({ success: false, error: 'mediasoup-disabled' });
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId) return cb && cb({ success: false, error: 'missing-session' });

      // Ensure router exists and return its RTP capabilities
      const router = await mediasoupService.createRouter(sessionId);
      const caps = router.rtpCapabilities || null;
      cb && cb({ success: true, rtpCapabilities: caps });
    } catch (err) {
      console.error('mediasoup-get-rtpCapabilities handler error:', err);
      cb && cb({ success: false, error: err.message });
    }
  });

  socket.on('mediasoup-connect-transport', async (data, cb) => {
    try {
      if (!mediasoupService) return cb && cb({ success: false, error: 'mediasoup-disabled' });
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId) return cb && cb({ success: false, error: 'missing-session' });

      await mediasoupService.connectTransport(sessionId, data.transportId, data.dtlsParameters);
      cb && cb({ success: true });
    } catch (err) {
      console.error('mediasoup-connect-transport handler error:', err);
      cb && cb({ success: false, error: err.message });
    }
  });

  socket.on('mediasoup-produce', async (data, cb) => {
    try {
      if (!mediasoupService) return cb && cb({ success: false, error: 'mediasoup-disabled' });
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId) return cb && cb({ success: false, error: 'missing-session' });

      const res = await mediasoupService.produce(sessionId, data.transportId, data.kind || 'audio', data.rtpParameters, { socketId: socket.id });
      cb && cb({ success: true, id: res.id });
    } catch (err) {
      console.error('mediasoup-produce handler error:', err);
      cb && cb({ success: false, error: err.message });
    }
  });

  // Audio control and music sync events (defensive)
  socket.on('audio-control', (data) => {
    try {
      if (!audioSignalingEnabled) return;
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId || !data.action) return;
      const room = `audio-${sessionId}`;
      safeEmitToRoom(room, 'audio-control', {
        action: data.action,
        userId: data.userId || null,
        sessionId,
        ...data
      });
    } catch (err) {
      console.error('audio-control handler error:', err);
    }
  });

  socket.on('music-sync', (data) => {
    try {
      if (!audioSignalingEnabled) return;
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId) return;
      // Rate limit music-sync: max 10 per 10 seconds per socket
      if (!rateLimitSocketEvent(socket, 'musicSync', 10, 10000)) {
        console.warn(`Rate limit exceeded for music-sync from ${socket.id}`);
        return;
      }
      const room = `audio-${sessionId}`;
      safeEmitToRoom(room, 'music-sync', {
        ...data,
        from: socket.id
      });
    } catch (err) {
      console.error('music-sync handler error:', err);
    }
  });
  }
  
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

  // Runtime toggle endpoints for audio signaling (debugging)
  // Debug routes moved to src/routes/debug.routes.js and mounted earlier.
  // Keep the top-level audioSignalingEnabled variable and app.locals in sync.
  // app.locals.audioSignalingEnabled may be updated by the debug router.
  // Synchronize on each request to ensure runtime reads the latest value.
  app.use((req, res, next) => {
    if (typeof req.app.locals.audioSignalingEnabled === 'boolean') {
      audioSignalingEnabled = req.app.locals.audioSignalingEnabled;
    } else {
      req.app.locals.audioSignalingEnabled = audioSignalingEnabled;
    }
    next();
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
  // --- Defensive middleware: collapse duplicate /api prefixes (e.g. /api/api/... -> /api/...) ---
  app.use((req, res, next) => {
    try {
      if (req.url && /^\/api(?:\/api)+/.test(req.url)) {
        const oldUrl = req.url;
        req.url = req.url.replace(/^\/api(?:\/api)+/, '/api');
        console.log(`Normalized duplicate /api prefix: ${oldUrl} -> ${req.url}`);
      }
    } catch (e) {
      // non-fatal
    }
    next();
  });

  // --- Compatibility middleware: rewrite requests that lost the /api prefix ---
  // Some reverse proxies or misconfigured nginx instances may strip the leading
  // /api prefix before forwarding. To keep runtime behavior resilient, rewrite
  // incoming requests that appear to target known API roots (e.g. /auth, /users,
  // /groups, etc.) by prefixing /api so the existing routers match.
  app.use((req, res, next) => {
    try {
      const p = req.path || req.url || '';
      if (!p.startsWith('/api/')) {
        const roots = ['auth', 'users', 'groups', 'audio', 'location', 'subscriptions', 'notifications'];
        for (const r of roots) {
          if (p === `/${r}` || p.startsWith(`/${r}/`)) {
            const old = req.url;
            req.url = '/api' + req.url;
            console.log(`Rewriting request URL -> ${old} -> ${req.url}`);
            break;
          }
        }
      }
    } catch (e) {
      // non-fatal
    }
    next();
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/groups', groupRoutes);
  app.use('/api', placesRoutes);
  app.use('/api/audio', audioRoutes);
  app.use('/api/location', locationRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/config', configRoutes);
  app.use('/api/invitations', invitationsRoutes);

  // Health check endpoint
  app.get('/health', async (req, res) => {
    let postgresStatus = 'disconnected';
    try {
      await sequelize.authenticate();
      postgresStatus = 'connected';
    } catch (err) {
      postgresStatus = 'disconnected';
    }

    res.status(200).json({
      status: 'ok',
      timestamp: new Date(),
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      mongodb_state: getMongoConnectionStateDescription(mongoose.connection.readyState),
      postgres: postgresStatus,
      socketio: io ? 'initialized' : 'not initialized'
    });
  });

  // Mediasoup debug/status endpoint (lazy-load service)
  app.get('/api/debug/mediasoup', (req, res) => {
    if (process.env.DISABLE_MEDIASOUP === 'true') {
      return res.json({ enabled: false, message: 'mediasoup disabled via DISABLE_MEDIASOUP' });
    }

    try {
      const ms = require('./services/mediasoup.service');
      const status = ms && typeof ms.getStatus === 'function' ? ms.getStatus() : { worker: false, routers: 0, transports: 0 };
      return res.json({ enabled: true, status });
    } catch (e) {
      console.error('Error loading mediasoup service for debug endpoint:', e);
      return res.status(500).json({ enabled: false, error: e.message });
    }
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

  // Status endpoint to check if the server is running
  app.get('/api/status', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'TrafficJamz backend is live',
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
    try {
      console.log(`Attempting to start server on port ${PORT}...`);
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Server successfully started and listening on port ${PORT}`);
        console.log(`MongoDB connection state: ${getMongoConnectionStateDescription(mongoose.connection.readyState)}`);
      });
    } catch (serverError) {
      console.error('❌ Failed to start server:', serverError);
      console.error('Server error stack:', serverError.stack);
      process.exit(1);
    }
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
    console.log('Setting up server...');
    setupServer();
    console.log('Server setup complete.');
    
  } catch (error) {
    console.error('Application startup error:', error);
    console.error('Error stack:', error.stack);
    console.warn('Starting server with limited functionality due to startup error.');
    setupServer();
  }
}

// Start the application
startApplication();

// Global error handlers to catch crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
