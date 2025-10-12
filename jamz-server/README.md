# jamz-server (TrafficJamz backend)

This README documents development tips for the jamz-server backend used in TrafficJamz.

## Runtime toggle & debug endpoints

The server exposes debug endpoints under `/api/debug` to help during development:

- GET `/api/debug/audio-signaling` — returns `{ enabled: boolean }` representing whether audio signaling is enabled at runtime.
- POST `/api/debug/audio-signaling/toggle` — flips the runtime flag. This endpoint is only allowed when `NODE_ENV === 'development'` or when `ALLOW_DEBUG_TOGGLE=true` is set in the environment.
- GET `/api/debug/metrics` — returns simple in-memory metrics used during development (rate-limit hits for socket events).

These endpoints are mounted early to ensure availability even when middleware rewrites or route ordering changes.

## Running locally

1. Start the backend:

```bash
cd jamz-server
npm start
```

2. Run the frontend separately (Vite):

```bash
cd ../jamz-client-vite
npm run dev
```

3. If you change backend code frequently, consider running under `nodemon` for autoreload.

## Notes

- The server includes defensive Socket.IO handlers for WebRTC signaling and a small per-socket rate-limiter for high-frequency events like ICE candidates. This helps prevent crashes from malformed or bursty client traffic during development.
- Debugging routes and flags are intentionally conservative and should not be enabled in production without proper access control.
