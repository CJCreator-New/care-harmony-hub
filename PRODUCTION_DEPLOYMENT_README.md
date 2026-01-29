# CareSync Production Deployment Guide

This guide provides instructions for deploying the CareSync microservices stack to production using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed
- GitHub Container Registry access (for pulling images)
- Environment variables configured

## Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.prod.example .env.prod
   ```

2. **Configure environment variables in `.env.prod`:**
   - Database credentials
   - Redis password
   - JWT secrets
   - GitHub organization name
   - Monitoring credentials
   - Alert notification settings

## Deployment

### Option 1: Automated Deployment (Recommended)

```bash
./deploy-prod.sh
```

### Option 2: Manual Deployment

1. **Pull latest images:**
   ```bash
   docker-compose -f docker-compose.prod.yml pull
   ```

2. **Start services:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Check service health:**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

## Service Architecture

The production deployment includes:

- **API Gateway (Kong):** Routes requests to microservices with rate limiting and caching
- **Clinical Service:** Handles clinical data operations
- **Patient Service:** Manages patient information
- **Appointment Service:** Handles appointment scheduling
- **Databases:** Separate PostgreSQL instances for each service
- **Cache:** Redis for session storage and caching
- **Message Queue:** Kafka for inter-service communication
- **Monitoring:** Prometheus, Grafana, and AlertManager stack

## Access Points

### Application
- **Frontend:** http://localhost:80
- **API Gateway:** http://localhost:8000

### Management Interfaces
- **Kong Admin:** http://localhost:8001
- **Grafana:** http://localhost:3000 (admin/${GRAFANA_PASSWORD})
- **Prometheus:** http://localhost:9090
- **AlertManager:** http://localhost:9093

## API Endpoints

All API endpoints are prefixed with the API Gateway URL:

- Clinical Service: `http://localhost:8000/api/clinical`
- Patient Service: `http://localhost:8000/api/patient`
- Appointment Service: `http://localhost:8000/api/appointment`

## Monitoring and Alerting

### Dashboards
- **System Overview:** Comprehensive metrics dashboard in Grafana
- **Service Health:** Individual service performance metrics
- **Infrastructure:** Container and host resource usage

### Alerts
Configured alerts include:
- Service downtime
- High error rates
- High latency
- Resource usage thresholds
- Database connection issues

## Scaling

### Horizontal Scaling
```bash
# Scale a service to multiple instances
docker-compose -f docker-compose.prod.yml up -d --scale clinical-service=3
```

### Vertical Scaling
Update resource limits in `docker-compose.prod.yml` and restart services.

## Backup and Recovery

### Database Backups
```bash
# Create database backup
docker exec -t caresync_postgres_1 pg_dump -U ${DB_USER} caresync > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker exec -i caresync_postgres_1 psql -U ${DB_USER} caresync < backup_file.sql
```

### Configuration Backups
- Environment files: `.env.prod`
- Kong configuration: `kong.yml`
- Monitoring configuration: `monitoring/` directory

## Troubleshooting

### Common Issues

1. **Service fails to start:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs <service-name>
   ```

2. **Database connection issues:**
   - Check database credentials in `.env.prod`
   - Verify database containers are running
   - Check database logs

3. **API Gateway issues:**
   - Check Kong configuration in `kong.yml`
   - Verify Kong database is accessible
   - Check Kong admin interface

### Logs
```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f <service-name>

# View last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 <service-name>
```

## Security Considerations

- All services run as non-root users
- Secrets are managed via environment variables
- Network isolation between services
- Rate limiting and request size limits
- IP restrictions and bot detection
- Encrypted database connections

## Performance Tuning

### Resource Allocation
- Adjust CPU and memory limits based on load
- Monitor resource usage via Grafana dashboards
- Scale services based on metrics

### Database Optimization
- Connection pooling configuration
- Query optimization and indexing
- Regular maintenance and vacuum operations

### Caching Strategy
- API response caching via Kong
- Database query result caching
- Session storage in Redis

## Maintenance

### Updates
1. Pull latest images: `docker-compose -f docker-compose.prod.yml pull`
2. Update services: `docker-compose -f docker-compose.prod.yml up -d`
3. Verify health checks pass

### Monitoring
- Regular review of Grafana dashboards
- Alert response procedures
- Log analysis and anomaly detection

## Support

For issues or questions:
1. Check service logs
2. Review monitoring dashboards
3. Consult troubleshooting guide
4. Contact DevOps team