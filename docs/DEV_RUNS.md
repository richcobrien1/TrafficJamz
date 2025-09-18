Dev notes: running backend + infra while developing frontend with Vite

This project supports running the frontend locally with Vite (hot reload) while running the backend and supporting services (DBs, message bus, nginx) in Docker.

Quick commands (from repository root):

# 1) Build and start backend + infra (skip nginx because you'll run Vite locally)
# (uses docker/docker-compose.prod.yml)

bash docker/build/build_backend_and_services.sh --no-nginx

# 2) Alternatively, start backend only

bash docker/build/build_backend_and_services.sh --only-backend

# 3) If you want nginx in front of the backend (not necessary for Vite dev):

bash docker/build/build_backend_and_services.sh

Notes and caveats:
- The production nginx expects a running `client` service to proxy non-/api routes. If you skip starting the `client` and start nginx, requests to `/` will 502. When developing locally with Vite, you typically skip nginx and set `VITE_BACKEND_URL=http://localhost:5050` in your frontend `.env.local` so Vite proxy sends `/api` to the backend directly.
- The script builds the backend image from the `server` (server) service defined in `docker-compose.prod.yml` using the `Dockerfile.prod` in `jamz-server`.
- For quick debugging of backend logs: `docker compose -f docker-compose.prod.yml logs -f server`
- If you need to rebuild everything from scratch: `docker compose -f docker-compose.prod.yml up -d --build`

More advanced: If you want to run the frontend image as a container instead of Vite, start the `client` service (it depends on `server`).
