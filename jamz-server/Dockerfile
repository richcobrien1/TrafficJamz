# Dockerfile for TrafficJamz Backend
# This Dockerfile builds the backend service using Node.js and prepares it for production deployment.

# ⛏️ Build Stage
FROM node:20-bullseye AS builder

WORKDIR /app

# Install build tools and Python (required by mediasoup and native modules)
RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential \
  python3 \
  python3-pip \
  pkg-config \
  libssl-dev \
  git \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Allow skipping mediasoup native rebuild via build-arg for faster CI iterations
ARG DISABLE_MEDIASOUP=false
ENV DISABLE_MEDIASOUP=${DISABLE_MEDIASOUP}

# Copy package and source files for build
COPY package.json package-lock.json ./
COPY src ./src
COPY scripts ./scripts
COPY sql ./sql

# Install dependencies (regular install inside jamz-server)
# Use `npm install` here to avoid failing when package-lock.json is out of sync during CI iteration.
RUN npm install --global npm@latest && npm install

# Rebuild native modules (e.g., mediasoup) unless explicitly disabled
RUN if [ "$DISABLE_MEDIASOUP" = "true" ]; then \
      echo "DISABLE_MEDIASOUP is true - skipping mediasoup rebuild"; \
    else \
      echo "Running mediasoup rebuild..."; \
      npm rebuild mediasoup; \
    fi

# ⛏️ Production Stage
FROM node:20-bullseye

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

# Copy built app from builder
COPY --from=builder /app /app

# Install Python CLI support (if needed by the app)
# '--break-system-packages' isn't available on the pip shipped in the base image;
# use a compatible install invocation.
# RUN python3 -m pip install --no-cache-dir invoke

RUN python3 -m venv /opt/venv \
  && /opt/venv/bin/pip install --no-cache-dir invoke \
  && ln -s /opt/venv/bin/invoke /usr/local/bin/invoke

EXPOSE 5000

# Start the server (jamz-server uses src/index.js)
CMD ["node", "src/index.js"]
