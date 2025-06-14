# Use an optimized Node.js base image for faster builds
FROM node:20 as builder

# Set the working directory
WORKDIR /app

# Copy package files separately to leverage Docker caching
COPY /Jamz/package-lock.json package-lock.json
COPY /Jamz/package.json package.json

# COPY ../../package-lock.json package-lock.json
# COPY ../../package.json package.json
RUN npm install --workspace backend

# Copy the rest of the backend code
COPY . . 

# Build the application (only if required)
RUN npm run build

# Use Ubuntu 20.04 for the production container
FROM ubuntu:20.04

# Set the working directory
WORKDIR /app

# Set non-interactive mode to prevent manual prompts
ENV DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC

# Install required system dependencies in one step (reducing layers)
RUN apt-get update && apt-get install -y --no-install-recommends \
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

# Ensure dependencies are properly rebuilt for production
RUN npm rebuild mediasoup

# Expose port 5000
EXPOSE 5000

# Start the backend server
CMD ["node", "src/index.js"]