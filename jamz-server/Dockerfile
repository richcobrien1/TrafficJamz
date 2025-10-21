# Dockerfile for TrafficJamz Backend
# Hardened for Node 22 with PEP 668 compliance and native module rebuild support

# ⛏️ Build Stage
FROM node:22 AS builder

WORKDIR /app

# Install build tools and Python (required by mediasoup and native modules)
RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential \
  python3 \
  python3-pip \
  python3-venv \
  pkg-config \
  libssl-dev \
  git \
  ca-certificates \
  curl \
  && ln -s /usr/bin/python3 /usr/bin/python || true \
  && python3 -m pip install --break-system-packages --upgrade pip setuptools wheel \
  && rm -rf /var/lib/apt/lists/*

# Allow skipping mediasoup native rebuild via build-arg for faster CI iterations
ARG DISABLE_MEDIASOUP=false
ENV DISABLE_MEDIASOUP=${DISABLE_MEDIASOUP}

# Copy package and source files for build
COPY package.json package-lock.json ./
COPY src ./src
COPY scripts ./scripts
COPY sql ./sql

# Install dependencies
RUN npm install --global npm@latest && npm install

# Rebuild native modules (e.g., mediasoup) unless explicitly disabled
RUN if [ "$DISABLE_MEDIASOUP" = "true" ]; then \
      echo "DISABLE_MEDIASOUP is true - skipping mediasoup rebuild"; \
    else \
      echo "Running mediasoup rebuild..."; \
      npm rebuild mediasoup; \
    fi

# 🧼 Optional: Remove dev tools to reduce final image size
RUN rm -rf ~/.npm /tmp/*

# ⛏️ Production Stage
FROM node:22

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC

# Minimal runtime dependencies + Python CLI support
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  python3-pip \
  python3-venv \
  ca-certificates \
  curl \
  tzdata \
  && ln -fs /usr/share/zoneinfo/$TZ /etc/localtime \
  && dpkg-reconfigure -f noninteractive tzdata \
  && ln -s /usr/bin/python3 /usr/bin/python || true \
  && python3 -m pip install --break-system-packages --upgrade pip setuptools wheel \
  && python3 -m pip install --break-system-packages --no-cache-dir invoke \
  && rm -rf /var/lib/apt/lists/*

# Copy built app from builder
COPY --from=builder /app /app

# Expose the port Render will route to
EXPOSE 10000

# Start the server
CMD ["node", "src/index.js"]
