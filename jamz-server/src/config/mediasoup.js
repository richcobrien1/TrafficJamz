const mediasoup = require('mediasoup');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Mediasoup Worker options
// On Render free tier, we can't use custom UDP ports, so we minimize the range
const workerOptions = {
  logLevel: 'debug', // More verbose for troubleshooting
  logTags: [
    'info',
    'ice',
    'dtls',
    'rtp',
    'srtp',
    'rtcp',
    'rtx',
    'bwe',
    'score',
    'simulcast',
    'svc'
  ],
  // Use a smaller port range that might work on Render
  rtcMinPort: Number(process.env.MEDIASOUP_MIN_PORT) || 40000,
  rtcMaxPort: Number(process.env.MEDIASOUP_MAX_PORT) || 40100
};

// Mediasoup Router options
const routerOptions = {
  mediaCodecs: [
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2
    }
  ]
};

// Mediasoup WebRtcTransport options
// Update in mediasoup.js
const getAnnouncedIp = () => {
  // Auto-detect announced IP based on environment
  if (process.env.MEDIASOUP_ANNOUNCED_IP && process.env.MEDIASOUP_ANNOUNCED_IP !== '127.0.0.1') {
    return process.env.MEDIASOUP_ANNOUNCED_IP;
  }
  
  // On Render, use the RENDER_EXTERNAL_URL
  if (process.env.RENDER_EXTERNAL_URL) {
    // Extract hostname from URL (e.g., https://trafficjamz.onrender.com -> trafficjamz.onrender.com)
    const url = new URL(process.env.RENDER_EXTERNAL_URL);
    console.log('🎤 Auto-detected Render hostname for mediasoup:', url.hostname);
    return url.hostname;
  }
  
  // Fallback to localhost for local development
  console.log('🎤 Using localhost for mediasoup (local development)');
  return '127.0.0.1';
};

const webRtcTransportOptions = {
  listenIps: [
    {
      ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
      announcedIp: getAnnouncedIp()
    }
  ],
  // Prioritize TCP on platforms like Render where UDP may be restricted
  enableUdp: true,
  enableTcp: true,
  preferUdp: false, // Changed to false - prefer TCP on Render
  preferTcp: true,  // Added - explicitly prefer TCP
  initialAvailableOutgoingBitrate: 1000000,
  minimumAvailableOutgoingBitrate: 600000,
  maxSctpMessageSize: 262144,
  maxIncomingBitrate: 1500000
};

// Create mediasoup Workers
let workers = [];
let nextWorkerIndex = 0;

const createWorkers = async (numWorkers = 1) => {
  try {
    console.log(`🎤 Creating ${numWorkers} mediasoup worker(s)...`);
    console.log(`🎤 RTC Port Range: ${workerOptions.rtcMinPort}-${workerOptions.rtcMaxPort}`);
    
    for (let i = 0; i < numWorkers; i++) {
      console.log(`🎤 Creating worker ${i + 1}/${numWorkers}...`);
      const worker = await mediasoup.createWorker(workerOptions);
      
      worker.on('died', () => {
        console.error(`mediasoup Worker died, exiting in 2 seconds... [pid:${worker.pid}]`);
        setTimeout(() => process.exit(1), 2000);
      });
      
      workers.push(worker);
      console.log(`✅ mediasoup Worker ${i + 1} created [pid:${worker.pid}]`);
    }
    
    console.log(`✅ ${numWorkers} mediasoup Workers created successfully.`);
  } catch (error) {
    console.error('❌ Error creating mediasoup Workers:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
};

// Get next mediasoup Worker (round-robin)
const getNextWorker = () => {
  const worker = workers[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
  return worker;
};

// Create a mediasoup Router
const createRouter = async () => {
  const worker = getNextWorker();
  return await worker.createRouter(routerOptions);
};

// Create a mediasoup WebRtcTransport
const createWebRtcTransport = async (router) => {
  return await router.createWebRtcTransport(webRtcTransportOptions);
};

module.exports = {
  createWorkers,
  getNextWorker,
  createRouter,
  createWebRtcTransport,
  workerOptions,
  routerOptions,
  webRtcTransportOptions
};
