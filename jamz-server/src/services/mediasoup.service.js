const mediasoup = require('mediasoup');

// Simple in-memory mediasoup manager: one worker, routers per session
let worker = null;
const routers = new Map();
const transports = new Map(); // sessionId -> Map(transportId -> transport)

async function createWorkerIfNeeded() {
  if (worker) return worker;
  worker = await mediasoup.createWorker({
    rtcMinPort: 20000,
    rtcMaxPort: 20200,
    logLevel: 'warn',
    logTags: ['info', 'ice', 'dtls']
  });

  worker.on('died', () => {
    console.error('Mediasoup worker died, exiting in 2 seconds...');
    setTimeout(() => process.exit(1), 2000);
  });

  return worker;
}

async function createRouter(sessionId) {
  const w = await createWorkerIfNeeded();
  if (routers.has(sessionId)) return routers.get(sessionId);
  const mediaCodecs = [
    { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 }
  ];
  const router = await w.createRouter({ mediaCodecs });
  routers.set(sessionId, router);
  return router;
}

async function createWebRtcTransport(sessionId, listenIps = [{ ip: '0.0.0.0', announcedIp: null }]) {
  const router = await createRouter(sessionId);

  const transport = await router.createWebRtcTransport({
    listenIps,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 100000,
  });

  // Store transport
  if (!transports.has(sessionId)) {
    transports.set(sessionId, new Map());
  }
  transports.get(sessionId).set(transport.id, transport);

  return transport;
}

async function connectTransport(sessionId, transportId, dtlsParameters) {
  const sessionTransports = transports.get(sessionId);
  if (!sessionTransports) throw new Error('Session not found');

  const transport = sessionTransports.get(transportId);
  if (!transport) throw new Error('Transport not found');

  await transport.connect({ dtlsParameters });
  return true;
}

async function produce(sessionId, transportId, kind, rtpParameters, appData = {}) {
  const sessionTransports = transports.get(sessionId);
  if (!sessionTransports) throw new Error('Session not found');

  const transport = sessionTransports.get(transportId);
  if (!transport) throw new Error('Transport not found');

  const producer = await transport.produce({ kind, rtpParameters, appData });
  return { id: producer.id };
}

module.exports = {
  createWorkerIfNeeded,
  createRouter,
  createWebRtcTransport,
  connectTransport,
  produce
};
