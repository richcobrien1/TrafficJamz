const mediasoup = require('mediasoup');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Mediasoup Worker options
const workerOptions = {
  logLevel: 'warn',
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
  rtcMinPort: Number(process.env.MEDIASOUP_MIN_PORT) || 10000,
  rtcMaxPort: Number(process.env.MEDIASOUP_MAX_PORT) || 10100
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
const webRtcTransportOptions = {
  listenIps: [
    {
      ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
      announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1'
    }
  ],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
  initialAvailableOutgoingBitrate: 1000000,
  minimumAvailableOutgoingBitrate: 600000,
  maxSctpMessageSize: 262144,
  maxIncomingBitrate: 1500000,
  // Add STUN/TURN servers
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    {
      urls: process.env.TURN_SERVER_URL,
      username: process.env.TURN_SERVER_USERNAME,
      credential: process.env.TURN_SERVER_CREDENTIAL
    }
  ]
};

// Create mediasoup Workers
let workers = [];
let nextWorkerIndex = 0;

const createWorkers = async (numWorkers = 1) => {
  try {
    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker(workerOptions);
      
      worker.on('died', () => {
        console.error(`mediasoup Worker died, exiting in 2 seconds... [pid:${worker.pid}]`);
        setTimeout(() => process.exit(1), 2000);
      });
      
      workers.push(worker);
      console.log(`mediasoup Worker ${i + 1} created [pid:${worker.pid}]`);
    }
    
    console.log(`${numWorkers} mediasoup Workers created successfully.`);
  } catch (error) {
    console.error('Error creating mediasoup Workers:', error);
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
