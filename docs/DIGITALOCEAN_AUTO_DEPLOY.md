# DigitalOcean Auto-Deploy Setup

This guide configures automatic deployment to DigitalOcean when pushing to the `main` branch.

## GitHub Secrets Required

Add these secrets in GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### 1. `DO_HOST`
```
157.230.165.156
```
*Your DigitalOcean droplet IP address*

### 2. `DO_USER`
```
root
```
*SSH username for the droplet*

### 3. `DO_SSH_KEY`
```
-----BEGIN OPENSSH PRIVATE KEY-----
[Your private SSH key content]
-----END OPENSSH PRIVATE KEY-----
```
*Your SSH private key for authentication*

**To get your SSH key:**
```bash
# On your local machine where you can already SSH to DO
cat ~/.ssh/id_rsa
# Or if using a different key:
cat ~/.ssh/digitalocean_key
```

## How It Works

1. **Developer pushes to `main` branch**
2. **GitHub Actions triggers** `.github/workflows/deploy-docker.yml`
3. **SSH into DigitalOcean** using stored credentials
4. **Pull latest code** from GitHub
5. **Restart Docker container** (`docker restart trafficjamz`)
6. **Verify deployment** with health checks
7. **Show logs** for confirmation

## Workflow Features

- ✅ Automatic deployment on every push to `main`
- ✅ Manual trigger available (Actions tab → "Deploy to DigitalOcean Docker" → Run workflow)
- ✅ Health check verification after deployment
- ✅ Container log output for debugging
- ✅ Fail-fast if container doesn't start

## Testing the Workflow

### Manual Trigger Test
1. Go to **Actions** tab in GitHub
2. Select **"Deploy to DigitalOcean Docker"** workflow
3. Click **"Run workflow"** → Select `main` branch → **"Run workflow"**
4. Watch the deployment logs in real-time

### Automatic Trigger Test
1. Make a small change (e.g., update README.md)
2. Commit and push to `main`
3. GitHub Actions automatically deploys
4. Check Actions tab to see deployment progress

## Troubleshooting

### SSH Connection Failed
```
Error: ssh: connect to host 157.230.165.156 port 22: Connection refused
```
**Solution:** Verify `DO_HOST` and firewall allows SSH (port 22)

### Authentication Failed
```
Error: Permission denied (publickey)
```
**Solution:** 
1. Verify `DO_SSH_KEY` is the correct private key
2. Test manually: `ssh -i ~/.ssh/your_key root@157.230.165.156`
3. Ensure key has no passphrase (GitHub Actions can't enter passphrase)

### Container Restart Failed
```
Error: No such container: trafficjamz
```
**Solution:** Container name mismatch - check actual name with `docker ps -a`

### Health Check Failed
```
⚠️ Backend health check failed
```
**Not necessarily an error** - container might still be starting. Check logs manually:
```bash
ssh root@157.230.165.156 "docker logs trafficjamz"
```

## Local Deploy Script

You can still deploy manually using the updated script:

```bash
bash remote-deploy.sh
```

This uses the same deployment logic as GitHub Actions.

## Current Deployment Status

- **Frontend**: Vercel auto-deploys on push (already configured) ✅
- **Backend**: DigitalOcean auto-deploys on push (configured with this workflow) ✅

---

## Next Steps (Kubernetes - Later This Week)

When ready to test Kubernetes:
1. Run `kubernetes/kubernetes-cluster-ubuntu-calico.sh` on K8s nodes
2. Install Redis + Socket.IO adapter for clustering
3. Deploy with `kubectl apply -f kubernetes/`
4. Test multi-pod Socket.IO sync

See `docs/ARCHITECTURAL_DETAILS.md` for K8s architecture details.
