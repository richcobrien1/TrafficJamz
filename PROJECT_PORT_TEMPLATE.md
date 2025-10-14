# Project Port Configuration Template

## Overview
This document provides the complete configuration template for setting up custom ports for each project. Each project gets its own dedicated port range to avoid conflicts.

## Port Assignments

### TrafficJamz (Current Project)
- **Backend API**: Port 5000
- **Frontend Dev**: Port 5175
- **Frontend Prod**: Port 8080

### SafeShipping
- **Backend API**: Port 5001
- **Frontend Dev**: Port 5176
- **Frontend Prod**: Port 8081

### NewsGatherer
- **Backend API**: Port 5002
- **Frontend Dev**: Port 5177
- **Frontend Prod**: Port 8082

### Project Template (Generic)
- **Backend API**: Port 50XX (where XX = project number)
- **Frontend Dev**: Port 517X (where X = project number + 5)
- **Frontend Prod**: Port 808X (where X = project number)

## Required Configuration Files

### 1. Root Project .env File
Create `.env` in the project root:

```bash
# [PROJECT_NAME] Docker Environment Variables

# Port Configuration for [PROJECT_NAME]
[PROJECT_PREFIX]_BACKEND_PORT=50XX
[PROJECT_PREFIX]_FRONTEND_DEV_PORT=517X
[PROJECT_PREFIX]_FRONTEND_PROD_PORT=808X
```

**Examples:**
- TrafficJamz: `TRAFFICJAMZ_BACKEND_PORT=5000`
- SafeShipping: `SAFESHIPPING_BACKEND_PORT=5001`
- NewsGatherer: `NEWSGATHERER_BACKEND_PORT=5002`

### 2. Backend .env File
Create/update `[project-name]-server/.env`:

```bash
# [PROJECT_NAME] Backend Environment Variables

# Server Configuration
PORT=50XX
NODE_ENV=development

# CORS Configuration - [PROJECT_NAME] specific ports
CORS_ORIGIN_DEV=http://localhost:517X
CORS_ORIGIN_PROD=http://localhost:808X

# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=[project_name]
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/[project_name]

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_REFRESH_EXPIRATION=2592000

# Audio Signaling Configuration
DISABLE_AUDIO_SIGNALING=false
DISABLE_MEDIASOUP=false
```

### 3. Frontend .env File
Create/update `[project-name]-client-vite/.env`:

```bash
# [PROJECT_NAME] Client Environment Variables

VITE_API_BASE=http://localhost:50XX/api
VITE_APP_PORT=517X

VITE_MAPBOX_TOKEN=your-mapbox-token-here
```

### 4. Backend CORS Configuration
Update `[project-name]-server/src/index.js`:

```javascript
// ===== CORS Configuration =====
// Dynamic CORS configuration using environment variables
const allowedOrigins = [
  process.env.CORS_ORIGIN_DEV || 'http://localhost:517X',      // [PROJECT_NAME] frontend dev
  process.env.CORS_ORIGIN_PROD || 'http://localhost:808X',     // [PROJECT_NAME] frontend prod
  'https://[project-name].v2u.us',       // Production client
  'capacitor://[project-name].v2u.us',   // iOS apps
  'ionic://[project-name].v2u.us',       // Android apps
  // Add any additional origins as needed
];
```

### 5. Docker Compose Configuration
Update `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - CORS_ORIGIN_PROD=http://localhost:${[PROJECT_PREFIX]_FRONTEND_PROD_PORT:-808X}
    ports:
      - "${[PROJECT_PREFIX]_BACKEND_PORT:-50XX}:5000"

  frontend:
    ports:
      - "${[PROJECT_PREFIX]_FRONTEND_PROD_PORT:-808X}:80"
```

### 6. Nginx Configuration Template
Create environment-variable-aware nginx config:

```nginx
# Template for docker/frontend/nginx.conf
worker_processes auto;

events { worker_connections 1024; }

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout 65;

    server {
        listen 80;
        server_name localhost;

        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri /index.html;
        }

        location /api/ {
            # CORS preflight handling
            if ($request_method = 'OPTIONS') {
                add_header 'Access-Control-Allow-Origin' '*';
                add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH';
                add_header 'Access-Control-Allow-Headers' 'Authorization,Content-Type,Accept,Origin';
                add_header 'Access-Control-Max-Age' 1728000;
                add_header 'Content-Length' 0;
                add_header 'Content-Type' 'text/plain charset=UTF-8';
                return 204;
            }

            # Proxy to backend using environment variable
            proxy_pass http://backend:5000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
        }
    }
}
```

## Project-Specific Examples

### SafeShipping Configuration

**Root .env:**
```bash
# SafeShipping Docker Environment Variables
SAFESHIPPING_BACKEND_PORT=5001
SAFESHIPPING_FRONTEND_DEV_PORT=5176
SAFESHIPPING_FRONTEND_PROD_PORT=8081
```

**Backend .env:**
```bash
PORT=5001
CORS_ORIGIN_DEV=http://localhost:5176
CORS_ORIGIN_PROD=http://localhost:8081
POSTGRES_DB=safeshipping
MONGODB_URI=mongodb://localhost:27017/safeshipping
```

**Frontend .env:**
```bash
VITE_API_BASE=http://localhost:5001/api
VITE_APP_PORT=5176
```

### NewsGatherer Configuration

**Root .env:**
```bash
# NewsGatherer Docker Environment Variables
NEWSGATHERER_BACKEND_PORT=5002
NEWSGATHERER_FRONTEND_DEV_PORT=5177
NEWSGATHERER_FRONTEND_PROD_PORT=8082
```

**Backend .env:**
```bash
PORT=5002
CORS_ORIGIN_DEV=http://localhost:5177
CORS_ORIGIN_PROD=http://localhost:8082
POSTGRES_DB=newsgatherer
MONGODB_URI=mongodb://localhost:27017/newsgatherer
```

**Frontend .env:**
```bash
VITE_API_BASE=http://localhost:5002/api
VITE_APP_PORT=5177
```

## Development Workflow

1. **Create new project directory** with the naming convention `[project-name]`
2. **Copy template files** from TrafficJamz or use this document
3. **Update port numbers** according to the assigned ranges
4. **Update project-specific variables** (database names, domains, etc.)
5. **Test configurations** by starting services on assigned ports
6. **Update documentation** with new project details

## Port Conflict Prevention

- Always check that assigned ports are not in use by other services
- Use `netstat -an | grep LISTEN` or `lsof -i :PORT` to check port availability
- Reserve port ranges for each project to prevent future conflicts
- Document all port usage in team wiki/repository

## Production Deployment Notes

- Production ports may differ from development ports
- Use reverse proxies (nginx, traefik) for port management in production
- Consider using container orchestration (Kubernetes, Docker Swarm) for multi-project deployments
- Implement proper SSL/TLS termination for production environments