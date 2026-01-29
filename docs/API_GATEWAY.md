# API Gateway Setup Guide

## Overview

The CareSync HMS uses Kong as its API Gateway to provide a unified entry point for all microservices. Kong handles routing, authentication, rate limiting, and other cross-cutting concerns.

## Architecture

```
┌─────────────────┐    ┌─────────────┐    ┌──────────────────┐
│   Frontend      │────│    Kong     │────│  Clinical Service │
│   (React)       │    │  Gateway    │    │   (Node.js)       │
└─────────────────┘    └─────────────┘    └──────────────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │   Future    │
                       │  Services   │
                       │   (Go,      │
                       │    Python)  │
                       └─────────────┘
```

## Services

### Kong Gateway
- **Proxy Port**: `http://localhost:8000`
- **Admin API**: `http://localhost:8001`
- **Admin GUI**: `http://localhost:8002`
- **Status**: `http://localhost:8100`

### Clinical Service
- **Direct Access**: `http://localhost:3003`
- **Via Gateway**: `http://localhost:8000/api/clinical`

## Authentication

### API Keys
The gateway uses API key authentication for service-to-service communication:

- **Frontend**: `caresync_frontend_key_2026_secure`
- **Mobile**: `caresync_mobile_key_2026_secure`
- **Admin**: `caresync_admin_key_2026_secure`

### JWT Tokens
User authentication uses JWT tokens passed in the `Authorization` header.

## Rate Limiting

- **Per Minute**: 1000 requests
- **Per Hour**: 10000 requests
- **Policy**: Local (in-memory)

## CORS Configuration

Allowed origins:
- `http://localhost:5173` (Development)
- `http://localhost:3000` (Development)
- `https://care-harmony-hub.vercel.app`
- `https://*.vercel.app`

## Plugins Enabled

- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **Request Transformer**: Add headers and modify requests
- **Response Transformer**: Add headers and modify responses
- **Request Size Limiting**: 10MB payload limit
- **IP Restriction**: Allow local and Docker networks
- **Bot Detection**: Block common bots
- **Key Auth**: API key authentication

## Development Setup

### Start Services
```bash
# Start all services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Initialize Kong (one-time setup)
docker-compose --profile init up kong-init

# View logs
docker-compose logs -f kong
docker-compose logs -f clinical-service
```

### Kong Admin GUI
Access the Kong Admin GUI at `http://localhost:8002` to:
- View routes and services
- Monitor request traffic
- Configure plugins
- View consumer information

### Testing API Gateway

```bash
# Test clinical service through gateway
curl -H "X-API-Key: caresync_frontend_key_2026_secure" \
     http://localhost:8000/api/clinical/health

# Test with authentication
curl -H "X-API-Key: caresync_frontend_key_2026_secure" \
     -H "Authorization: Bearer <jwt_token>" \
     http://localhost:8000/api/clinical/consultations
```

## Production Deployment

### Environment Variables
```bash
# Kong Configuration
KONG_DATABASE=postgres
KONG_PG_HOST=your-db-host
KONG_PG_PASSWORD=secure-password

# SSL Configuration (recommended for production)
KONG_SSL_CERT=/path/to/cert.pem
KONG_SSL_CERT_KEY=/path/to/key.pem
```

### Security Considerations
- Enable SSL/TLS in production
- Use strong API keys
- Configure proper CORS origins
- Set up proper rate limiting
- Enable request logging and monitoring
- Use Kong's RBAC features

## Monitoring

### Health Checks
- Kong: `http://localhost:8100/status`
- Clinical Service: `http://localhost:8000/api/clinical/health`

### Metrics
Kong exposes metrics at the status endpoint for integration with monitoring systems like Prometheus.

## Troubleshooting

### Common Issues

1. **Kong not starting**: Check database connectivity
2. **Routes not working**: Verify declarative config syntax
3. **Authentication failing**: Check API key headers
4. **CORS errors**: Verify allowed origins configuration

### Logs
```bash
# Kong logs
docker-compose logs kong

# Kong database logs
docker-compose logs kong-database

# Clinical service logs
docker-compose logs clinical-service
```

## Configuration Files

- `kong.yml`: Declarative configuration
- `docker-compose.yml`: Production services
- `docker-compose.dev.yml`: Development overrides
- `scripts/init-kong.sh`: Initialization script