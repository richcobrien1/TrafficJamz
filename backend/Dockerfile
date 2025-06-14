# Use an optimized Node.js base image for faster builds
FROM node:20 as builder

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies first
COPY package.json package-lock.json ./
RUN npm ci --no-cache

# Copy the rest of the application code
COPY . . 

# Build the application (optional if needed)
RUN npm run build

# Use Ubuntu 20.04 for the production container
FROM ubuntu:20.04

# Set the working directory
WORKDIR /app

# Set non-interactive mode to prevent manual prompts
ENV DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC

# Install required system dependencies in one step (no redundant updates)
RUN apt-get update && apt-get install -y --no-install-recommends \
    software-properties-common \
    ca-certificates \
    curl \
    tzdata \
    python3 \
    python3-pip \
    nodejs \
    npm && \
    update-ca-certificates && \
    ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata

# Copy backend code from the builder stage
COPY --from=builder /app /app

# Install Python dependencies efficiently
RUN python3 -m pip install --no-cache-dir invoke

# Ensure dependencies are up to date
RUN npm rebuild mediasoup

# Expose port 5000
EXPOSE 5000

# Start the backend server
CMD ["node", "src/index.js"]
