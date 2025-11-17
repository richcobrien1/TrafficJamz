# Kubernetes Multi-Node Socket.IO Configuration

## Problem Statement

**Current Setup**: Single Docker container on one DigitalOcean droplet
- All Socket.IO connections terminate on single Node.js process
- All events broadcast to all connected clients on that one instance
- ✅ Works perfectly for single-node deployment

**Multi-Node Challenge**: Kubernetes with multiple backend pods
- User A connects to Pod 1
- User B connects to Pod 2  
- User A emits `music-take-control` event → reaches Pod 1
- Pod 1 emits `music-control-changed` to broadcast update
- ❌ **Only clients connected to Pod 1 receive the event**
- User B on Pod 2 never gets the update → state desync

## Solution: Socket.IO Redis Adapter

### Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Pod 1     │         │   Pod 2     │         │   Pod 3     │
│ Socket.IO   │◄───────►│ Socket.IO   │◄───────►│ Socket.IO   │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                        │
       └───────────────────────┼────────────────────────┘
                               ▼
                        ┌─────────────┐
                        │    Redis    │
                        │  (Pub/Sub)  │
                        └─────────────┘

How it works:
1. User A on Pod 1 emits music-take-control
2. Pod 1 broadcasts music-control-changed via Socket.IO
3. Redis adapter publishes event to Redis pub/sub channel
4. Pod 2 and Pod 3 subscribe to Redis channel
5. All pods receive event and broadcast to their connected clients
6. All users across all pods get real-time update ✅
```

### Implementation Steps

#### 1. Install Redis Adapter

```bash
cd jamz-server
npm install @socket.io/redis-adapter redis
```

#### 2. Update Backend Code

**File**: `jamz-server/src/index.js`

Add imports at top:
```javascript
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
```

After Socket.IO initialization (around line 301), add Redis adapter:
```javascript
// Socket.IO server setup
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "https://jamz.v2u.us",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// CRITICAL: Redis adapter for multi-pod Socket.IO clustering
if (process.env.REDIS_URL) {
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log("✅ Socket.IO Redis adapter connected - multi-pod clustering enabled");
    })
    .catch((err) => {
      console.error("❌ Redis adapter connection failed:", err.message);
      console.warn("⚠️  Socket.IO running in single-instance mode");
    });
} else {
  console.warn("⚠️  REDIS_URL not set - Socket.IO running in single-instance mode");
  console.warn("⚠️  Multi-pod deployments will NOT sync events across pods");
}

// Rest of Socket.IO handlers...
io.on("connection", (socket) => {
  // ... existing handlers
});
```

#### 3. Add Environment Variable

**Production** (`.env.local`):
```bash
REDIS_URL=redis://redis-service.default.svc.cluster.local:6379
```

**Local Development** (optional):
```bash
# Leave empty or use local Redis if testing multi-instance
REDIS_URL=redis://localhost:6379
```

#### 4. Deploy Redis to Kubernetes

**File**: `kubernetes/redis-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: default
spec:
  serviceName: redis-service
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
          name: redis
        command:
        - redis-server
        - --appendonly
        - "yes"
        volumeMounts:
        - name: redis-data
          mountPath: /data
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "250m"
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 1Gi
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: default
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  clusterIP: None  # Headless service for StatefulSet
```

Deploy:
```bash
kubectl apply -f kubernetes/redis-deployment.yaml
kubectl get pods | grep redis  # Verify running
```

#### 5. Update Backend Deployment

**File**: `kubernetes/backend-deployment.yaml`

Add Redis URL to environment:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trafficjamz-backend
spec:
  replicas: 3  # Multiple pods now supported!
  template:
    spec:
      containers:
      - name: backend
        image: trafficjamz-backend:latest
        env:
        - name: REDIS_URL
          value: "redis://redis-service.default.svc.cluster.local:6379"
        # ... other env vars from ConfigMap/Secret
```

#### 6. Optional: Sticky Sessions

**File**: `kubernetes/ingress.yaml`

Add annotation for session affinity:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: trafficjamz-ingress
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "trafficjamz-session"
    nginx.ingress.kubernetes.io/session-cookie-max-age: "86400"
spec:
  # ... rest of ingress config
```

**Why Sticky Sessions Help**:
- Same client always routed to same pod (fewer pod-to-pod Redis messages)
- Better WebSocket performance (persistent connection to one pod)
- Redis adapter still provides fallback if pod restarts or scales

## Testing Multi-Node Sync

### Local Test (Simulate Multi-Node)

1. Start Redis locally:
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

2. Set env var:
```bash
export REDIS_URL=redis://localhost:6379
```

3. Start two backend instances on different ports:
```bash
# Terminal 1
PORT=5000 npm start

# Terminal 2  
PORT=5001 npm start
```

4. Connect frontend to each:
- Client A → http://localhost:5000
- Client B → http://localhost:5001

5. Test Socket.IO events:
- Client A emits `music-take-control`
- Verify Client B receives `music-control-changed`
- ✅ If both receive update → Redis adapter working

### Kubernetes Test

1. Deploy backend with 3 replicas
2. Connect multiple browsers (different devices/incognito)
3. Check which pod each client connected to:
```bash
kubectl logs -l app=trafficjamz-backend | grep "Socket.IO connection"
```

4. Test Socket.IO events across pods:
- One client takes control
- Verify all clients on all pods receive update
- Check Redis logs for pub/sub activity:
```bash
kubectl logs -l app=redis | tail -20
```

## Verification Commands

**Check Redis connectivity from pod**:
```bash
kubectl exec -it trafficjamz-backend-xxxxx -- redis-cli -u redis://redis-service:6379 PING
# Should return: PONG
```

**Monitor Redis pub/sub**:
```bash
kubectl exec -it redis-0 -- redis-cli MONITOR
# Watch Socket.IO events being published
```

**Check adapter logs**:
```bash
kubectl logs -l app=trafficjamz-backend | grep "Redis adapter"
# Should see: "✅ Socket.IO Redis adapter connected"
```

## Troubleshooting

### Error: "Redis adapter connection failed"
- Check Redis pod running: `kubectl get pods | grep redis`
- Verify service exists: `kubectl get svc redis-service`
- Test DNS resolution from pod: `kubectl exec -it backend-pod -- nslookup redis-service`
- Check firewall rules (should be open within cluster)

### Events not syncing across pods
- Verify all pods connected to Redis: `kubectl logs -l app=backend | grep "Redis adapter connected"`
- Check Redis memory: `kubectl exec -it redis-0 -- redis-cli INFO memory`
- Monitor pub/sub channels: `kubectl exec -it redis-0 -- redis-cli PUBSUB CHANNELS`

### Performance issues
- Increase Redis resources (memory/CPU)
- Consider Redis Cluster for high-scale deployments
- Enable sticky sessions to reduce pod-to-pod messages
- Monitor Redis latency: `kubectl exec -it redis-0 -- redis-cli --latency`

## Migration Path

### Phase 1: Single-Node (Current) ✅
- Docker container on DigitalOcean
- No Redis needed
- Socket.IO works fine (all connections to one instance)

### Phase 2: Multi-Node with Redis (This Week)
1. Deploy Redis StatefulSet to Kubernetes
2. Add Redis adapter code to backend
3. Test with 2-3 backend replicas
4. Verify Socket.IO events sync across pods
5. Enable sticky sessions for performance

### Phase 3: Production Hardening
- Redis persistence (already configured with appendonly)
- Redis backup/restore strategy
- Monitoring (Redis metrics, Socket.IO connections per pod)
- Horizontal Pod Autoscaler for backend (scale based on CPU/connections)
- Consider Redis Sentinel or Cluster for HA

## Critical Success Metrics

✅ **Working Multi-Node Socket.IO**:
- User on Pod A emits event → User on Pod B receives update
- Redis adapter logs show connection established
- No "event not received" errors in frontend

✅ **Performance**:
- Socket.IO event latency < 100ms (pod-to-pod + Redis)
- Redis memory usage stable (not growing unbounded)
- Backend pods healthy (no crash-loops after Redis added)

✅ **Reliability**:
- Pod restarts don't drop all Socket.IO connections
- Redis pod restart doesn't crash backend pods
- Graceful degradation if Redis unavailable (log warning, continue in single-instance mode)

## Cost Considerations

**Redis Resources**:
- Minimal: 128Mi memory, 0.1 CPU, 1Gi storage
- Estimated cost: ~$5-10/month on DigitalOcean managed Redis
- Alternative: Self-hosted in Kubernetes (cost included in node pool)

**Backend Scaling**:
- 3 replicas recommended for HA
- Each pod: ~256Mi memory, 0.25 CPU
- Total backend: ~768Mi memory, 0.75 CPU
- Fits comfortably in 2GB/$12/month DigitalOcean node

## References

- [Socket.IO Redis Adapter Docs](https://socket.io/docs/v4/redis-adapter/)
- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Nginx Ingress Session Affinity](https://kubernetes.github.io/ingress-nginx/examples/affinity/cookie/)
- [Redis Persistence](https://redis.io/docs/management/persistence/)
