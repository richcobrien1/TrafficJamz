# Dockerfile
# This Dockerfile is used to build and run the TrafficJamz application.

# Use an optimized Node.js base image for faster builds
FROM node:20 AS builder

# Set the working directory
WORKDIR /app

# Install pip for mediasoup's postinstall script
RUN apt-get update && apt-get install -y python3-pip

# Copy the workspace-level package files
COPY package.json package-lock.json ./

# Copy the entire repo (this brings in frontend/ and backend/)
COPY . .

# Install all workspace dependencies
RUN npm install --global npm@latest && npm install --workspaces

# Rebuild mediasoup dependencies
RUN npm rebuild mediasoup

# Build the application (only if required)
RUN npm run build

# Use Node.js slim for the production container
FROM node:20-slim

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

# Expose port 5000
EXPOSE 5000

# Start the backend server
CMD ["node", "src/index.js"]