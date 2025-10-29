const mediasoup = require('mediasoup');

// Simple in-memory mediasoup manager: one worker, routers per session
let worker = null;
const routers = new Map();
const transports = new Map(); // sessionId -> Map(transportId -> transport)
const producers = new Map(); // sessionId -> Map(producerId -> producer)

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

  console.log(`🔌 Connecting transport ${transportId} in session ${sessionId}...`);
  await transport.connect({ dtlsParameters });
  console.log(`✅ Transport ${transportId} connected successfully (DTLS handshake complete)`);
  return true;
}

async function produce(sessionId, transportId, kind, rtpParameters, appData = {}) {
  const sessionTransports = transports.get(sessionId);
  if (!sessionTransports) throw new Error('Session not found');

  const transport = sessionTransports.get(transportId);
  if (!transport) throw new Error('Transport not found');

  const producer = await transport.produce({ kind, rtpParameters, appData });
  
  // Store producer
  if (!producers.has(sessionId)) {
    producers.set(sessionId, new Map());
  }
  producers.get(sessionId).set(producer.id, producer);
  
  console.log(`✅ Producer created in session ${sessionId}: ${producer.id}`);
  return { id: producer.id };
}

async function consume(sessionId, transportId, producerId, rtpCapabilities) {
  const router = routers.get(sessionId);
  if (!router) throw new Error('Router not found for session');
  
  const sessionTransports = transports.get(sessionId);
  if (!sessionTransports) throw new Error('Session not found');
  
  const transport = sessionTransports.get(transportId);
  if (!transport) throw new Error('Transport not found');
  
  const sessionProducers = producers.get(sessionId);
  if (!sessionProducers) throw new Error('No producers in session');
  
  const producer = sessionProducers.get(producerId);
  if (!producer) throw new Error('Producer not found');
  
  // Check if we can consume
  if (!router.canConsume({ producerId, rtpCapabilities })) {
    throw new Error('Cannot consume this producer');
  }
  
  const consumer = await transport.consume({
    producerId,
    rtpCapabilities,
    paused: false
  });
  
  console.log(`✅ Consumer created in session ${sessionId}: ${consumer.id} for producer ${producerId}`);
  
  return {
    id: consumer.id,
    producerId: producer.id,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters
  };
}

function getProducers(sessionId) {
  const sessionProducers = producers.get(sessionId);
  if (!sessionProducers) return [];
  return Array.from(sessionProducers.keys());
}

module.exports = {
  createWorkerIfNeeded,
  createRouter,
  createWebRtcTransport,
  connectTransport,
  produce,
  consume,
  getProducers
};
