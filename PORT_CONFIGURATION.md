# TrafficJamz Development Port Configuration

## Port Assignment Strategy
Each project gets its own port range to avoid conflicts:
- Backend API servers: 5000-5099
- Frontend development servers (Vite/Webpack): 5175-5274
- Frontend production servers (nginx): 8080-8179

## Current Project: TrafficJamz
- **Backend API**: Port 5000
- **Frontend Dev**: Port 5175 (Vite default)
- **Frontend Prod**: Port 8080 (nginx)

## Future Projects Port Assignments

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

## Environment Variables Required

### Backend (.env)
```
PORT=5000
CORS_ORIGIN_DEV=http://localhost:5175
CORS_ORIGIN_PROD=http://localhost:8080
NODE_ENV=development
```

### Frontend (.env)
```
VITE_API_BASE=http://localhost:5000/api
VITE_APP_PORT=5175
```

### Nginx (nginx.conf)
```
server {
    listen 8080;
    server_name localhost;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### Docker (docker-compose.yml)
```yaml
services:
  backend:
    ports:
      - "5000:5000"
  frontend:
    ports:
      - "5175:5175"  # dev
      - "8080:80"    # prod via nginx
```

## Implementation Checklist
- [ ] Update all .env files with port variables
- [ ] Update backend CORS to use environment variables
- [ ] Update nginx configs with port variables
- [ ] Update Docker compose files
- [ ] Test all services start on correct ports
- [ ] Document port usage for team