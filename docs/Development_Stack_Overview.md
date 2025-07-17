🧰 TrafficJamz Local Dev Environment
This project uses docker-compose.override.yml and supporting shell scripts to provision a secure, full-stack development setup with hot reloading, optional TLS, and persistent state across services.

🚀 Services Overview
Service	Port(s)	Description
frontend	8080	React/Vite hot reload server
api	5000	Node.js backend (GraphQL / REST)
postgres	5432	Relational DB for core data
mongodb	27017	Document store for unstructured data
redis	6379	In-memory cache & session store
influxdb	8086	Time-series DB for location pings
zookeeper	2181	Kafka coordination service
kafka	9092 / 29092	Stream broker for internal messaging
kafka-ui	8082	Kafka management dashboard
adminer	8081	DB UI for managing Postgres/Mongo
All services run inside app-network for internal resolution and security. Volumes persist state across restarts.

🔐 TLS for Dev (Optional)
To enable HTTPS in local development:

bash
./ssl-bootstrap.sh
Creates self-signed certs in docker/frontend/certs:

fullchain.pem

privkey.pem

Used by NGINX in secure mode.

🕹️ Dev Mode Launcher
Start your local stack using:

bash
./dev_build.sh
Select from:

1️⃣ HTTP — hot reload at http://localhost:8080

2️⃣ HTTPS — NGINX proxy with TLS at https://localhost

0️⃣ Cancel — abort without launching

The script:

Cleans up orphan containers

Validates cert presence

Starts only required services

🧼 Cleanup
To shut down all containers cleanly:

bash
docker-compose -f docker-compose.override.yml down --remove-orphans