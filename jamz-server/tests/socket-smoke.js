// Simple smoke test for socket handlers
const io = require('socket.io-client');

const SERVER = process.env.SERVER || 'http://localhost:5000';

async function run() {
  console.log('Connecting to', SERVER);
  const socket = io(SERVER, { transports: ['websocket'], forceNew: true });

  // overall timeout guard
  const overallTimeout = setTimeout(() => {
    console.error('Smoke test timeout');
    process.exit(2);
  }, 30000);

  socket.on('connect', async () => {
    console.log('Connected', socket.id);

    // Send malformed payloads (no sessionId)
    for (let i = 0; i < 3; i++) {
      socket.emit('webrtc-offer', { offer: null, junk: 'x'.repeat(1000) });
    }

    // Send a burst of candidates to trigger rate limiting
    for (let i = 0; i < 70; i++) {
      socket.emit('webrtc-candidate', { sessionId: 'smoke', candidate: { candidate: 'candidate' + i } });
    }

    // Send music-sync bursts
    for (let i = 0; i < 20; i++) {
      socket.emit('music-sync', { sessionId: 'smoke', track: 't' + i });
    }

    // Wait a bit for server to process
    setTimeout(async () => {
      // Fetch metrics
      const fetch = require('node-fetch');
      try {
        const res = await fetch(SERVER + '/api/debug/metrics');
        const json = await res.json();
        console.log('Metrics:', json);
      } catch (e) {
        console.error('Failed to fetch metrics', e.message);
        clearTimeout(overallTimeout);
        socket.disconnect();
        process.exit(0);
      }

      // ensure we clear timeout on normal path too
      clearTimeout(overallTimeout);
      socket.disconnect();
      process.exit(0);
    }, 2000);
  });

  socket.on('connect_error', (err) => {
    console.error('Connect error', err.message);
    process.exit(1);
  });
}

run().catch(e => { console.error(e); process.exit(1); });
