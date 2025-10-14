# TrafficJamz / Jamz

## Overview

TrafficJamz (Jamz) is a comprehensive real-time communication and location tracking platform designed for group activities. It provides secure, scalable audio communication and location services for subscribed users in active group settings.

## Core Features

### 🎵 Real-Time Audio Communication
- **Group Voice Chat**: Full-duplex audio communication between group members
- **Music Streaming**: Shared music playback across the group
- **Audio Controls**: Independent mute controls for microphone and speakers
- **WebRTC Powered**: Low-latency peer-to-peer audio using MediaSoup

### 📍 Real-Time Location Tracking
- **Live Location Sharing**: GPS tracking with real-time position updates
- **Proximity Alerts**: Audio notifications for group member distances
- **Location History**: Historical location data with InfluxDB time-series storage
- **Privacy Controls**: Granular location sharing permissions (precise, approximate, hidden)
- **Geographic Anchor Pins**: Map pins are anchored to geographic coordinates and move naturally with map panning and zooming. Pin positions update automatically as the map viewport changes, maintaining their real-world positions.

### 👥 Group Management
- **Dynamic Groups**: Create and manage groups with role-based permissions
- **Membership System**: Owner, Subscriber, Member, and Invitee roles
- **Invitation System**: Secure group joining with token-based invites
- **Subscription Model**: Premium features for paying subscribers

### 🔐 Security & Privacy
- **End-to-End Security**: Encrypted audio and location data
- **Group Isolation**: Data accessible only to authorized group members
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against abuse and DoS attacks

## Supported Platforms

- **Web Application**: React/Vite-based responsive web app
- **iOS App**: Native iPhone application
- **Android App**: Native Android application
- **Cross-Platform**: Capacitor/Ionic hybrid app support

## Technology Stack

### Frontend
- **React 19** with Vite build system
- **Material-UI** component library
- **Mapbox GL JS** for interactive maps
- **Socket.io Client** for real-time communication

### Backend
- **Node.js/Express** API server
- **Socket.io** for WebSocket connections
- **MediaSoup** for WebRTC audio processing
- **PostgreSQL** for relational data
- **MongoDB** for document storage
- **Redis** for caching and sessions
- **InfluxDB** for time-series location data
- **Kafka** for internal messaging

### Infrastructure
- **Docker** containerization
- **Kubernetes** orchestration
- **NGINX** reverse proxy and load balancing
- **AWS/GCP/Azure** cloud deployment options

## Example Use Cases

- **Winter Sports**: Skiers maintaining group communication while on slopes
- **Hiking Groups**: Outdoor enthusiasts tracking locations and communicating
- **Event Coordination**: Festival attendees staying connected
- **Team Activities**: Any group requiring real-time coordination

## Architecture Highlights

- **Microservices Design**: Modular backend services
- **Scalable Infrastructure**: Horizontal scaling with Kubernetes
- **Real-Time Processing**: Event-driven architecture with Kafka
- **Multi-Cloud Support**: Flexible deployment across cloud providers

## Getting Started

See [Development Stack Overview](docs/Development_Stack_Overview.md) for local development setup.

## Documentation

- [Development Runs](docs/DEV_RUNS.md)
- [Infrastructure Deployment](docs/Infrastructure_Deployment.md)
- [Users Roles](docs/Users_Roles.md)
- [API Endpoints](docs/pre-docker/api_endpoints.md)

## Contributing

This is a commercial application with specific business requirements. Contributions should align with the core mission of secure group communication and location services.
