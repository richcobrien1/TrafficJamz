const mediasoup = require('mediasoup');
const os = require('os');

// Simple in-memory mediasoup manager: one worker, routers per session
let worker = null;
const routers = new Map();

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

  return {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
    sctpParameters: transport.sctpParameters,
    _transport: transport
  };
}

async function connectTransport(sessionId, transportId, dtlsParameters) {
  const router = await createRouter(sessionId);
  const trans = Array.from(router.transports).find(t => t[0] === transportId || (t[1] && t[1].id === transportId));
  // traverse router.transports map entries
  let transport = null;
  for (const [id, t] of router._transports || []) {
    if (id === transportId) transport = t;
  }
  // fallback: try router.getTransportById if available
  if (!transport && typeof router.getTransportById === 'function') {
    try { transport = router.getTransportById(transportId); } catch (e) { /* ignore */ }
  }

  if (!transport) {
    // Attempt to find in router._transports map by iterating
    for (const pair of router._transports || []) {
      if (pair && pair[0] === transportId) transport = pair[1];
    }
  }

  if (!transport) throw new Error('Transport not found');
  await transport.connect({ dtlsParameters });
  return true;
}

async function produce(sessionId, transportId, kind, rtpParameters, appData = {}) {
  const router = await createRouter(sessionId);
  // find transport object
  let transport = null;
  if (typeof router.getTransportById === 'function') {
    transport = router.getTransportById(transportId);
  } else {
    for (const pair of router._transports || []) {
      if (pair && pair[0] === transportId) transport = pair[1];
    }
  }
  if (!transport) throw new Error('Transport not found for produce');
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
