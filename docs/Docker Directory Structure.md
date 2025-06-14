# Docker Directory Structure for Real-Time Audio Communication App

## Overview

This document outlines the recommended directory structure for containerizing the real-time audio communication application. The structure is designed to support:

1. Multi-service architecture (API, WebRTC/mediasoup, frontend)
2. Clear separation between environments (local, development, staging, production)
3. Local-to-cloud development workflow
4. Cross-platform deployment compatibility (DigitalOcean, AWS, GCP)
5. Efficient Docker container management

## Directory Structure

```
/audio-group-app/
├── .github/                      # GitHub Actions workflows
│   └── workflows/
│       ├── ci.yml                # CI pipeline
│       └── deploy-*.yml          # Deployment workflows for different platforms
│
├── docker/                       # Docker-specific files
│   ├── api/                      # API service Docker files
│   │   ├── Dockerfile.dev        # Development Dockerfile
│   │   └── Dockerfile.prod       # Production Dockerfile
│   ├── webrtc/                   # WebRTC/mediasoup service Docker files
│   │   ├── Dockerfile.dev
│   │   └── Dockerfile.prod
│   ├── frontend/                 # Frontend Docker files
│   │   ├── Dockerfile.dev
│   │   └── Dockerfile.prod
│   └── scripts/                  # Docker helper scripts
│       ├── docker-entrypoint.sh
│       └── wait-for-it.sh
│
├── backend/                      # Backend services
│   ├── src/                      # Source code
│   │   ├── api/                  # API service
│   │   │   ├── controllers/
│   │   │   ├── middlewares/
│   │   │   ├── routes/
│   │   │   └── server.js         # API entry point
│   │   ├── webrtc/               # WebRTC/mediasoup service
│   │   │   ├── mediasoup/
│   │   │   ├── room/
│   │   │   └── server.js         # WebRTC entry point
│   │   ├── shared/               # Shared backend code
│   │   │   ├── models/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   └── index.js              # Main entry point
│   ├── config/                   # Configuration
│   │   ├── environment.js        # Main configuration loader
│   │   ├── local.js              # Local overrides
│   │   ├── development.js        # Development environment
│   │   ├── staging.js            # Staging environment
│   │   ├── production.js         # Production environment
│   │   └── secrets/              # Gitignored secrets
│   │       ├── local.js
│   │       ├── development.js
│   │       ├── staging.js
│   │       └── production.js
│   └── tests/                    # Backend tests
│
├── frontend/                     # Web frontend
│   ├── src/
│   ├── public/
│   └── tests/
│
├── mobile/                       # Mobile apps
│   ├── android/
│   └── ios/
│
├── shared/                       # Code shared between frontend and backend
│   ├── types/                    # TypeScript types/interfaces
│   └── utils/                    # Shared utilities
│
├── infrastructure/               # Infrastructure as Code
│   ├── digitalocean/             # DigitalOcean specific
│   ├── aws/                      # AWS specific
│   └── gcp/                      # GCP specific
│
├── scripts/                      # Project utility scripts
│   ├── endpoints.js              # Endpoint management
│   ├── setup-dev.sh              # Development setup
│   └── deploy.sh                 # Deployment script
│
├── docker-compose.yml            # Main Docker Compose file
├── docker-compose.override.yml   # Local overrides for Docker Compose
├── docker-compose.prod.yml       # Production Docker Compose
├── .env.example                  # Example environment variables
├── .dockerignore                 # Docker ignore file
├── .gitignore
├── package.json
└── README.md
```

## Key Benefits

### 1. Service Separation

Each service (API, WebRTC, frontend) has its own directory and Dockerfiles, enabling:
- Independent development and deployment
- Service-specific scaling
- Clearer responsibility boundaries
- Easier debugging and maintenance

### 2. Environment Isolation

Configuration is separated by environment while maintaining a consistent structure:
- `local.js` for local development overrides
- `development.js` for cloud development environment
- `staging.js` for pre-production testing
- `production.js` for production deployment

This ensures clear separation between local and production variables as requested.

### 3. Docker-Specific Files Centralization

All Docker-related files are in the `/docker` directory:
- Keeps the root directory clean
- Makes Docker configurations easier to find and manage
- Separates application code from infrastructure code
- Allows for service-specific Docker optimizations

### 4. Shared Code Management

The `/shared` directory enables code sharing between frontend and backend:
- Prevents code duplication
- Ensures type consistency across the stack
- Simplifies maintenance of common utilities
- Facilitates full-stack development

### 5. Platform-Agnostic Infrastructure

The `/infrastructure` directory contains platform-specific configurations:
- Enables easy deployment to different cloud providers
- Keeps infrastructure code separate from application code
- Supports future migration between platforms
- Facilitates comparison between different hosting options

### 6. Local-to-Cloud Development

The structure supports local code accessing cloud resources:
- Environment variables control connection to cloud or local resources
- Docker Compose mounts local code directories for live development
- Endpoint management system tracks service locations
- Configuration system handles environment-specific settings

## Docker Compose Configuration

### Main Docker Compose File (docker-compose.yml)

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: docker/api/Dockerfile.dev
    volumes:
      - ./backend:/app/backend
      - ./shared:/app/shared
    env_file: .env
    environment:
      - NODE_ENV=development
      - IS_LOCAL=true
    ports:
      - "3000:3000"
    networks:
      - app-network

  webrtc:
    build:
      context: .
      dockerfile: docker/webrtc/Dockerfile.dev
    volumes:
      - ./backend:/app/backend
      - ./shared:/app/shared
    env_file: .env
    environment:
      - NODE_ENV=development
      - IS_LOCAL=true
      - MEDIASOUP_WORKERS=2
      - RTC_MIN_PORT=10000
      - RTC_MAX_PORT=10099
    ports:
      - "5000:5000"
      - "10000-10099:10000-10099/udp"
    networks:
      - app-network

  frontend:
    build:
      context: .
      dockerfile: docker/frontend/Dockerfile.dev
    volumes:
      - ./frontend:/app/frontend
      - ./shared:/app/shared
    env_file: .env
    environment:
      - NODE_ENV=development
      - REACT_APP_API_URL=http://localhost:5000
      - REACT_APP_WEBRTC_URL=http://localhost:5000
    ports:
      - "8080:8080"
    networks:
      - app-network
    depends_on:
      - api
      - webrtc

networks:
  app-network:
    driver: bridge
```

### Production Docker Compose (docker-compose.prod.yml)

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: docker/api/Dockerfile.prod
    environment:
      - NODE_ENV=production
      - IS_LOCAL=false
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G

  webrtc:
    build:
      context: .
      dockerfile: docker/webrtc/Dockerfile.prod
    environment:
      - NODE_ENV=production
      - IS_LOCAL=false
      - MEDIASOUP_WORKERS=3
    restart: always
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G

  frontend:
    build:
      context: .
      dockerfile: docker/frontend/Dockerfile.prod
    environment:
      - NODE_ENV=production
    restart: always
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

## Sample Dockerfiles

### API Service Development Dockerfile (docker/api/Dockerfile.dev)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies for development
RUN apk add --no-cache python3 make g++ linux-headers

# Copy package files
COPY backend/package*.json ./
RUN npm install

# Set environment variables
ENV NODE_ENV=development
ENV IS_LOCAL=true

# Expose API port
EXPOSE 3000

# Use nodemon for hot reloading in development
RUN npm install -g nodemon

CMD ["nodemon", "--watch", "backend/src", "backend/src/api/server.js"]
```

### WebRTC Service Development Dockerfile (docker/webrtc/Dockerfile.dev)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies for mediasoup
RUN apk add --no-cache python3 make g++ linux-headers

# Copy package files
COPY backend/package*.json ./
RUN npm install

# Set environment variables
ENV NODE_ENV=development
ENV IS_LOCAL=true
ENV MEDIASOUP_WORKERS=2
ENV RTC_MIN_PORT=10000
ENV RTC_MAX_PORT=10099

# Expose ports
EXPOSE 5000
EXPOSE 10000-10099/udp

# Use nodemon for hot reloading in development
RUN npm install -g nodemon

CMD ["nodemon", "--watch", "backend/src", "backend/src/webrtc/server.js"]
```

## Environment Configuration System

### Main Configuration Loader (backend/config/environment.js)

```javascript
const path = require('path');
const fs = require('fs');

// Determine environment
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_LOCAL = process.env.IS_LOCAL === 'true';

// Base configuration
const config = {
  // Core settings
  core: {
    environment: NODE_ENV,
    isProduction: NODE_ENV === 'production',
    isLocal: IS_LOCAL,
    logLevel: process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug'),
  },
  
  // Endpoint registry - all service endpoints in one place
  endpoints: {
    api: process.env.API_ENDPOINT || 'http://localhost:3000',
    webrtc: process.env.WEBRTC_ENDPOINT || 'http://localhost:5000',
    auth: process.env.AUTH_ENDPOINT || 'http://localhost:3002',
  },
  
  // Database configuration
  database: {
    // Even in local development, point to cloud MongoDB by default
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb+srv://<username>:<password>@cloud-cluster.mongodb.net/audiogroupapp',
      options: {
        serverSelectionTimeoutMS: NODE_ENV === 'production' ? 5000 : 30000,
        socketTimeoutMS: 45000,
      }
    },
    // Even in local development, point to cloud PostgreSQL by default
    postgres: {
      host: process.env.POSTGRES_HOST || 'db.supabase.co',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'audiogroupapp',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      ssl: process.env.POSTGRES_SSL === 'true' || NODE_ENV !== 'local',
    }
  },
  
  // Mediasoup configuration
  mediasoup: {
    numWorkers: parseInt(process.env.MEDIASOUP_WORKERS || 
                        (NODE_ENV === 'production' ? '3' : '7')),
    rtcMinPort: parseInt(process.env.RTC_MIN_PORT || '10000'),
    rtcMaxPort: parseInt(process.env.RTC_MAX_PORT || '59999'),
    logLevel: NODE_ENV === 'production' ? 'warn' : 'debug',
  },
};

// Load environment-specific configuration
const envConfigPath = path.join(__dirname, `${NODE_ENV}.js`);
if (fs.existsSync(envConfigPath)) {
  const envConfig = require(envConfigPath);
  Object.assign(config, envConfig);
}

// Load local overrides if running locally
if (IS_LOCAL) {
  const localConfigPath = path.join(__dirname, 'local.js');
  if (fs.existsSync(localConfigPath)) {
    const localConfig = require(localConfigPath);
    Object.assign(config, localConfig);
  }
}

// Load secrets (gitignored)
const secretsPath = path.join(__dirname, 'secrets', `${IS_LOCAL ? 'local' : NODE_ENV}.js`);
if (fs.existsSync(secretsPath)) {
  const secrets = require(secretsPath);
  Object.assign(config, secrets);
}

// Record all endpoints to a JSON file for reference
const recordEndpoints = () => {
  const endpointsRegistry = path.join(__dirname, '../endpoints-registry.json');
  const existingEndpoints = fs.existsSync(endpointsRegistry) 
    ? JSON.parse(fs.readFileSync(endpointsRegistry, 'utf8')) 
    : {};
  
  existingEndpoints[NODE_ENV] = config.endpoints;
  fs.writeFileSync(endpointsRegistry, JSON.stringify(existingEndpoints, null, 2));
  console.log(`Endpoints for ${NODE_ENV} environment recorded to endpoints-registry.json`);
};

// Record endpoints on startup
recordEndpoints();

module.exports = config;
```

## Implementation Steps

1. **Create the base directory structure**
   ```bash
   mkdir -p .github/workflows docker/{api,webrtc,frontend,scripts} backend/{src/{api,webrtc,shared},config/secrets,tests} frontend/{src,public,tests} mobile/{android,ios} shared/{types,utils} infrastructure/{digitalocean,aws,gcp} scripts
   ```

2. **Move existing files to their appropriate locations**
   ```bash
   # Move MongoDB connection file
   cp /home/ubuntu/updated_mongodb.js backend/config/mongodb.js
   
   # Move routes file
   cp /home/ubuntu/updated_groupsroutes.js backend/src/api/routes/groups.routes.js
   
   # Move main server file
   cp /home/ubuntu/updated_index.js backend/src/index.js
   ```

3. **Create Docker Compose files**
   ```bash
   touch docker-compose.yml docker-compose.override.yml docker-compose.prod.yml
   ```

4. **Create Dockerfiles for each service**
   ```bash
   touch docker/api/Dockerfile.{dev,prod}
   touch docker/webrtc/Dockerfile.{dev,prod}
   touch docker/frontend/Dockerfile.{dev,prod}
   ```

5. **Set up environment configuration files**
   ```bash
   touch backend/config/{local,development,staging,production}.js
   touch backend/config/environment.js
   touch .env.example
   ```

6. **Create helper scripts**
   ```bash
   touch scripts/endpoints.js
   touch scripts/setup-dev.sh
   touch scripts/deploy.sh
   ```

7. **Update import paths in existing code**
   - Update require statements to reflect the new directory structure
   - Ensure shared code is properly imported from the shared directory

## Conclusion

This directory structure provides a solid foundation for containerizing your real-time audio communication application. It supports your requirements for:

1. Local-to-cloud development
2. Clear separation between environments
3. Efficient Docker container management
4. Cross-platform deployment compatibility

By following this structure, you'll be able to develop, test, and deploy your application more efficiently while maintaining flexibility for future scaling and platform migration.
