KubeSail deployment notes

This folder contains a minimal Kubernetes manifest and notes to deploy the jamz-server to KubeSail.

Steps:

1. Build and publish the container image via GitHub Actions (workflow created: .github/workflows/build-and-push.yml). The workflow pushes to GitHub Container Registry `ghcr.io/<owner>/trafficjamz-jamz-server:latest`.

2. Create secrets in KubeSail (example):

kubectl create secret generic jamz-secrets \
  --from-literal=JWT_SECRET="your_jwt_secret" \
  --from-literal=DB_URL="your_db_url" \
  --from-literal=SMTP_USER="user" \
  --from-literal=SMTP_PASS="pass" 

3. Apply manifest:

kubectl apply -f backend-deployment.kubesail.yaml

4. KubeSail will provide a public IP for the LoadBalancer service. Configure DNS and TLS as needed.

Notes:
- The manifest uses a LoadBalancer service which KubeSail supports. If you prefer an Ingress with TLS, add an Ingress resource and configure cert-manager.
- Keep provider-specific features to a minimum to ease migration to GKE/EKS/AKS.
