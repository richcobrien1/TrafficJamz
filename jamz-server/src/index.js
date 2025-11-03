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

// Import models to set up associations
const models = require('./models');

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
// Dynamic CORS configuration using environment variables
const allowedOrigins = [
  process.env.CORS_ORIGIN_DEV || 'http://localhost:5175',      // TrafficJamz frontend dev
  process.env.CORS_ORIGIN_PROD || 'http://localhost:8080',     // TrafficJamz frontend prod
  'https://jamz.v2u.us',             // Vercel Frontend
  'https://trafficjamz.onrender.com', // Render Backend
  'capacitor://trafficjam.v2u.us',   // iOS apps
  'ionic://trafficjam.v2u.us',       // Android apps
  'http://192.176.58.146:5173',      // User's network IP for mobile testing
  'http://192.176.58.146:5174',      // Additional port for mobile testing
  'http://192.176.58.146:5175',      // Network access port for mobile testing
  'http://192.178.58.146:5173',      // Previous network IP for mobile testing
  'http://192.178.58.146:5174',      // Previous additional port for mobile testing
  'http://192.178.58.146:5175',       // Previous network access port for mobile testing
  'https://192.178.58.146:5175'       // Previous network access port for mobile testing
];

// Middleware to console log 🔎 Express (REST API) logging Origin header for every HTTP request
app.use((req, res, next) => {
  console.log("🌐 Incoming request:", {
    method: req.method,
    url: req.originalUrl,
    origin: req.headers.origin,
  });
  next();
});

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

// Helper: check if origin is a Vercel preview deployment
function isVercelPreviewOrigin(origin) {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    // Match Vercel preview URLs: traffic-jamz-*-v2u.vercel.app or jamz-*-v2u.vercel.app
    return /^(traffic-jamz|jamz)-.*-v2u\.vercel\.app$/.test(u.hostname);
  } catch (e) {
    return false;
  }
}

const corsOptionsDelegate = function (req, callback) {
  const origin = req.header('Origin');

  // No Origin header (curl, server-to-server) → allow
  if (!origin) {
    return callback(null, {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Content-Length', 'Authorization'],
      optionsSuccessStatus: 204
    });
  }

  // Allowed origins, localhost variants, or Vercel preview deployments
  if (allowedOrigins.includes(origin) || isLocalhostOrigin(origin) || isVercelPreviewOrigin(origin)) {
    return callback(null, {
      origin: origin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Content-Length', 'Authorization'],
      optionsSuccessStatus: 204
    });
  }

  // Not allowed → reject gracefully (no 500)
  console.log('🔒 Blocked CORS for origin:', origin);
  return callback(null, { origin: false });
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

// ===== STATIC FILE SERVING FOR FRONTEND =====
// Serve built React frontend from jamz-client-vite/dist
// This allows the backend to serve the frontend on Render Standard
const path = require('path');
const fs = require('fs');

// Try multiple possible paths for the frontend build
const possiblePaths = [
  path.join(__dirname, '../../jamz-client-vite/dist'), // From jamz-server/src/
  path.join(process.cwd(), 'jamz-client-vite/dist'),   // From project root
  path.join(__dirname, '../../../jamz-client-vite/dist'), // From deeper in jamz-server/
  '/opt/render/project/jamz-client-vite/dist',         // Render's default path
];

let frontendPath = null;
for (const testPath of possiblePaths) {
  console.log('� Checking frontend path:', testPath);
  if (fs.existsSync(testPath)) {
    frontendPath = testPath;
    console.log('✅ Found frontend at:', frontendPath);
    break;
  }
}

if (!frontendPath) {
  console.error('❌ Frontend build not found in any expected location');
  console.log('📂 Current working directory:', process.cwd());
  console.log('📂 __dirname:', __dirname);

  // List contents of potential directories
  const dirsToCheck = [
    path.dirname(__dirname), // jamz-server/
    path.dirname(path.dirname(__dirname)), // project root
  ];

  dirsToCheck.forEach(dir => {
    try {
      const contents = fs.readdirSync(dir);
      console.log(`📁 Contents of ${dir}:`, contents);
    } catch (e) {
      console.log(`❌ Cannot read ${dir}:`, e.message);
    }
  });
}

// Serve static files from the React build directory if found
if (frontendPath) {
  app.use(express.static(frontendPath));
}

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Catch-all handler: send back index.html for any non-API routes
// This enables client-side routing for the React SPA
app.get('*', (req, res, next) => {
  // Skip API routes - let them be handled by the API routers
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
    return next();
  }

  console.log('🌐 Serving frontend for path:', req.path);

  if (frontendPath) {
    // Check if index.html exists before serving
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.log('❌ index.html not found at:', indexPath);
      res.status(404).json({ error: 'Frontend not built yet' });
    }
  } else {
    res.status(503).json({ error: 'Frontend not available - build in progress' });
  }
});// Mount debug routes early (router implemented in src/routes/debug.routes.js)
const debugRoutes = require('./routes/debug.routes');
app.use('/api/debug', debugRoutes);

// Debugging only, Add this near the top of your index.js file
const debug = require('debug')('app:debug');
const routesPath = path.resolve(__dirname, 'routes');
debug('Current directory:', __dirname);
debug('Resolved routes path:', routesPath);
debug('Routes directory exists:', fs.existsSync(routesPath));

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
    origin: (origin, callback) => {
      console.log("🔍 Socket.IO CORS check for origin:", origin);

      if (!origin) {
        console.log("✅ Allowing request with no origin");
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin) || isLocalhostOrigin(origin)) {
        console.log("✅ Allowing origin:", origin);
        return callback(null, true);
      }

      console.log("🔒 Blocked Socket.IO CORS for origin:", origin);
      return callback(null, false); // reject gracefully
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
  pingTimeout: 60000,
  allowEIO3: true,
  transports: ["polling", "websocket"],
});

app.get("/health/socketio", (req, res) => res.send("socketio-ok"));

// Middleware to console log 🔎 Socket.IO handshake logging
io.use((socket, next) => {
  console.log("🔌 Socket.IO handshake:", {
    id: socket.id,
    origin: socket.handshake.headers.origin,
    referer: socket.handshake.headers.referer,
    auth: socket.handshake.auth,
  });
  next();
});

io.on("connection", (socket) => {
  console.log("✅ New client connected:", socket.id,
              "from:", socket.handshake.address,
              "origin:", socket.handshake.headers.origin);

  socket.emit("hello", { ok: true });

  socket._rateState = {
    lastCandidatesTs: 0,
    candidateCountWindow: 0,
    lastMusicSyncTs: 0,
    musicSyncCountWindow: 0,
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
      
      // Get current participants before joining
      const socketsInRoom = io.sockets.adapter.rooms.get(room);
      const currentParticipants = [];
      
      if (socketsInRoom) {
        for (const socketId of socketsInRoom) {
          const participantSocket = io.sockets.sockets.get(socketId);
          if (participantSocket && participantSocket.userData) {
            currentParticipants.push({
              socketId: socketId,
              userId: participantSocket.userData.userId,
              display_name: participantSocket.userData.display_name
            });
          }
        }
      }
      
      // Store user data on socket for future reference
      socket.userData = {
        userId: data.userId || null,
        display_name: data.display_name || 'User',
        sessionId: sessionId
      };
      
      socket.join(room);
      console.log(`Socket ${socket.id} (${socket.userData.display_name}) joined audio session ${sessionId}`);

      // Send current participants list to the newly joined user
      socket.emit('current-participants', {
        participants: currentParticipants
      });

      // Notify others in the session (exclude sender)
      safeEmitToRoom(room, 'participant-joined', {
        userId: data.userId || null,
        socketId: socket.id,
        display_name: data.display_name || 'User'
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
      
      const displayName = socket.userData?.display_name || 'User';
      console.log(`Socket ${socket.id} (${displayName}) left audio session ${sessionId}`);

      safeEmitToRoom(room, 'participant-left', {
        userId: socket.userData?.userId || data.userId || null,
        socketId: socket.id,
        display_name: displayName
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

      // Detect announced IP for Render or use auto-detection
      const announcedIp = process.env.RENDER_EXTERNAL_HOSTNAME || process.env.RENDER_EXTERNAL_URL?.replace(/^https?:\/\//, '') || null;
      console.log(`🌐 Creating transport with announcedIp: ${announcedIp || 'auto-detect'}`);
      const listenIps = announcedIp 
        ? [{ ip: '0.0.0.0', announcedIp }]
        : [{ ip: '0.0.0.0', announcedIp: null }];

      const transportInfo = await mediasoupService.createWebRtcTransport(sessionId, listenIps);
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
      
      // Notify other participants in the room that a new producer is available
      const room = `audio-${sessionId}`;
      socket.to(room).emit('new-producer', { producerId: res.id, socketId: socket.id });
      
      cb && cb({ success: true, id: res.id });
    } catch (err) {
      console.error('mediasoup-produce handler error:', err);
      cb && cb({ success: false, error: err.message });
    }
  });

  socket.on('mediasoup-consume', async (data, cb) => {
    try {
      if (!mediasoupService) return cb && cb({ success: false, error: 'mediasoup-disabled' });
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId) return cb && cb({ success: false, error: 'missing-session' });

      const res = await mediasoupService.consume(sessionId, data.transportId, data.producerId, data.rtpCapabilities);
      cb && cb({ success: true, consumer: res });
    } catch (err) {
      console.error('mediasoup-consume handler error:', err);
      cb && cb({ success: false, error: err.message });
    }
  });

  socket.on('mediasoup-get-producers', async (data, cb) => {
    try {
      if (!mediasoupService) return cb && cb({ success: false, error: 'mediasoup-disabled' });
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId) return cb && cb({ success: false, error: 'missing-session' });

      const producerIds = mediasoupService.getProducers(sessionId);
      cb && cb({ success: true, producerIds });
    } catch (err) {
      console.error('mediasoup-get-producers handler error:', err);
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

  // ===== MUSIC SESSION EVENTS =====
  
  // Join music session (same as audio session)
  socket.on('join-music-session', async (data) => {
    try {
      if (!audioSignalingEnabled) return;
      const { sessionId } = data;
      if (!sessionId) {
        console.warn('join-music-session missing sessionId from socket:', socket.id);
        return;
      }
      
      const room = `audio-${sessionId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined music session: ${sessionId}`);
      
      // Send current music state to the newly joined user
      try {
        const session = await audioService.getSession(sessionId);
        if (session && session.music) {
          console.log(`📝 Sending current playlist to ${socket.id}:`, session.music.playlist?.length || 0, 'tracks');
          socket.emit('playlist-update', {
            playlist: session.music.playlist || [],
            from: 'server',
            timestamp: Date.now()
          });
          
          // Also send currently playing track if it exists
          if (session.music.currently_playing) {
            socket.emit('music-change-track', {
              track: session.music.currently_playing,
              autoPlay: false,
              from: 'server'
            });
          }
        }
      } catch (err) {
        console.error('Error fetching music state for new user:', err);
      }
      
      // Notify others in the room
      socket.to(room).emit('user-joined-music', {
        socketId: socket.id,
        sessionId
      });
    } catch (err) {
      console.error('join-music-session handler error:', err);
    }
  });
  
  // Music control events (play, pause, seek)
  socket.on('music-control', (data) => {
    try {
      if (!audioSignalingEnabled) return;
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId) return;
      
      const { action, position, trackId } = data;
      const room = `audio-${sessionId}`;
      
      // Broadcast to all others in the room
      socket.to(room).emit(`music-${action}`, {
        position,
        trackId,
        from: socket.id,
        timestamp: Date.now()
      });
      
      console.log(`Music ${action} from ${socket.id} in session ${sessionId}`);
    } catch (err) {
      console.error('music-control handler error:', err);
    }
  });
  
  // Track change event
  socket.on('music-track-change', (data) => {
    try {
      if (!audioSignalingEnabled) return;
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId) return;
      
      const room = `audio-${sessionId}`;
      socket.to(room).emit('music-track-change', {
        track: data.track,
        from: socket.id,
        timestamp: Date.now()
      });
      
      console.log(`Track change from ${socket.id} in session ${sessionId}:`, data.track?.title);
    } catch (err) {
      console.error('music-track-change handler error:', err);
    }
  });
  
  // Controller (DJ) mode events
  socket.on('music-take-control', async (data) => {
    try {
      if (!audioSignalingEnabled) return;
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId) return;
      
      const userId = data.userId;
      
      // Persist controller to database
      try {
        await audioService.setMusicController(sessionId, userId);
      } catch (err) {
        console.error('Failed to persist music controller:', err);
        // Continue anyway - socket notification still works
      }
      
      const room = `audio-${sessionId}`;
      socket.to(room).emit('music-controller-changed', {
        controllerId: socket.id,
        userId: userId,
        timestamp: Date.now()
      });
      
      console.log(`${socket.id} (user ${userId}) took DJ control in session ${sessionId}`);
    } catch (err) {
      console.error('music-take-control handler error:', err);
    }
  });
  
  socket.on('music-release-control', async (data) => {
    try {
      if (!audioSignalingEnabled) return;
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId) return;
      
      // Persist release to database
      try {
        await audioService.releaseMusicController(sessionId);
      } catch (err) {
        console.error('Failed to persist controller release:', err);
        // Continue anyway - socket notification still works
      }
      
      const room = `audio-${sessionId}`;
      socket.to(room).emit('music-controller-changed', {
        controllerId: null,
        userId: null,
        timestamp: Date.now()
      });
      
      console.log(`${socket.id} released DJ control in session ${sessionId}`);
    } catch (err) {
      console.error('music-release-control handler error:', err);
    }
  });
  
  // Playlist update event
  socket.on('playlist-update', (data) => {
    try {
      if (!audioSignalingEnabled) return;
      const sessionId = requireSessionId(data, { socketId: socket.id, logger: console });
      if (!sessionId) return;
      
      const room = `audio-${sessionId}`;
      socket.to(room).emit('playlist-update', {
        playlist: data.playlist,
        from: socket.id,
        timestamp: Date.now()
      });
      
      console.log(`Playlist update from ${socket.id} in session ${sessionId}`);
    } catch (err) {
      console.error('playlist-update handler error:', err);
    }
  });
  
  // Music sync event (for periodic synchronization)
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
    const displayName = socket.userData?.display_name || 'User';
    const sessionId = socket.userData?.sessionId;
    
    console.log(`Client disconnected: ${socket.id} (${displayName})`);
    
    // Notify session participants if user was in a session
    if (sessionId) {
      const room = `audio-${sessionId}`;
      safeEmitToRoom(room, 'participant-left', {
        userId: socket.userData?.userId || null,
        socketId: socket.id,
        display_name: displayName
      });
      console.log(`Notified room ${room} about disconnect of ${displayName}`);
    }
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

  // Health check endpoint with /api prefix for frontend keep-alive
  app.get('/api/health', async (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date()
    });
  });

  // Email test endpoint - helps diagnose SMTP issues
  app.get('/api/test/email', async (req, res) => {
    try {
      const emailService = require('./services/email.service');
      
      // Log current SMTP settings (without password)
      const smtpInfo = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        secure: process.env.SMTP_SECURE,
        hasPassword: !!process.env.SMTP_PASS
      };
      
      console.log('📧 Testing email with config:', smtpInfo);
      
      // Try to send a test email
      await emailService.sendInvitationEmail('richcobrien@hotmail.com', {
        groupName: 'Test Group',
        inviterName: 'System Test',
        invitationLink: 'https://jamz.v2u.us/test'
      });
      
      res.json({
        success: true,
        message: 'Test email sent successfully',
        smtpConfig: smtpInfo
      });
    } catch (error) {
      console.error('❌ Email test failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        code: error.code,
        command: error.command,
        smtpConfig: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
          hasPassword: !!process.env.SMTP_PASS
        }
      });
    }
  });

  // Mediasoup debug/status endpoint (lazy-load service)
  app.get('/api/debug/mediasoup', (req, res) => {
    if (process.env.DISABLE_MEDIASOUP === 'true') {
      return res.json({ 
        enabled: false, 
        message: 'mediasoup disabled via DISABLE_MEDIASOUP',
        env: {
          DISABLE_MEDIASOUP: process.env.DISABLE_MEDIASOUP,
          RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL
        }
      });
    }

    try {
      const mediasoupConfig = require('./config/mediasoup');
      const ms = require('./services/mediasoup.service');
      const status = ms && typeof ms.getStatus === 'function' ? ms.getStatus() : { worker: false, routers: 0, transports: 0 };
      
      return res.json({ 
        enabled: true, 
        status,
        config: {
          rtcMinPort: mediasoupConfig.workerOptions.rtcMinPort,
          rtcMaxPort: mediasoupConfig.workerOptions.rtcMaxPort,
          logLevel: mediasoupConfig.workerOptions.logLevel
        },
        env: {
          RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL,
          MEDIASOUP_MIN_PORT: process.env.MEDIASOUP_MIN_PORT,
          MEDIASOUP_MAX_PORT: process.env.MEDIASOUP_MAX_PORT
        }
      });
    } catch (e) {
      console.error('Error loading mediasoup service for debug endpoint:', e);
      return res.status(500).json({ enabled: false, error: e.message, stack: e.stack });
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
  const PORT = process.env.PORT || 10000;

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
