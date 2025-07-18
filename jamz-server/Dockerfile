# Dockerfile for TrafficJamz Backend
# This Dockerfile builds the backend service using Node.js and prepares it for production deployment.

# ⛏️ Build Stage
FROM node:20 AS builder

WORKDIR /app

# Install Python (required by mediasoup postinstall)
RUN apt-get update && apt-get install -y python3-pip

# Copy root-level configs
COPY package.json package-lock.json ./

# Copy only the backend workspace for build
COPY backend/ ./backend/

# Install workspace dependencies scoped to backend
RUN npm install --global npm@latest && npm install --workspace=backend

# Rebuild native modules (e.g., mediasoup)
RUN npm --workspace=backend rebuild mediasoup

# ⛏️ Production Stage
FROM node:20-slim

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  tzdata \
  python3 \
  python3-pip \
  && update-ca-certificates \
  && ln -fs /usr/share/zoneinfo/$TZ /etc/localtime \
  && dpkg-reconfigure -f noninteractive tzdata

# Copy built backend only
COPY --from=builder /app/backend ./backend

# Install Python CLI support (if needed by backend)
RUN python3 -m pip install --break-system-packages --no-cache-dir invoke

EXPOSE 5000

CMD ["node", "backend/src/index.js"]
