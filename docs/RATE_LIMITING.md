# Kong API Gateway - Rate Limiting Implementation

## Overview

This implementation provides enterprise-grade rate limiting for the CareSync HMS API Gateway using Kong with Redis-backed storage and comprehensive monitoring.

## Rate Limiting Policies

### 1. Global Rate Limiting
- **Limit**: 5000 requests per minute
- **Scope**: All API requests
- **Purpose**: Prevent system-wide overload

### 2. Burst Protection
- **Limit**: 100 requests per second
- **Scope**: All API requests
- **Purpose**: Protect against sudden traffic spikes

### 3. User-Based Rate Limiting
- **Limit**: 1000 requests per minute per API consumer
- **Scope**: Per authenticated user/API key
- **Purpose**: Fair resource allocation and abuse prevention

### 4. Endpoint-Specific Limits
- **Clinical Endpoints**: 2000 requests per minute
- **Administrative Endpoints**: 500 requests per minute
- **Public Endpoints**: 1000 requests per minute

## Architecture

```
┌─────────────────┐    ┌─────────────┐    ┌─────────────────┐
│   API Client    │────│    Kong     │────│ Clinical Service │
│                 │    │  Gateway    │    │                 │
└─────────────────┘    └─────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │    Redis    │
                       │  (Rate      │
                       │   Limits)   │
                       └─────────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │ Prometheus  │
                       │  Metrics    │
                       └─────────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │  Grafana    │
                       │ Dashboard   │
                       └─────────────┘
```

## Configuration Files

### Kong Configuration (`kong.yml`)
- Defines all rate limiting plugins
- Configures Redis backend
- Sets up consumer authentication

### Monitoring Configuration
- `monitoring/kong-prometheus.yml`: Prometheus metrics collection
- `monitoring/kong-alert-rules.yml`: Alerting rules for rate limiting violations
- `monitoring/kong-rate-limiting-dashboard.json`: Grafana dashboard

## API Key Authentication

All requests must include the API key in the `apikey` header:

```bash
curl -H "apikey: caresync_api_key_2026_secure" \
     http://localhost:8000/api/clinical/health
```

## Monitoring and Alerting

### Metrics Collected
- Request counts by status code
- Rate limiting violations (429 responses)
- Consumer usage patterns
- Endpoint-specific traffic
- Redis performance metrics

### Alerting Rules
- Rate limiting percentage > 5%
- Service degradation detection
- Redis connectivity issues
- Kong gateway health

## Testing

### Automated Testing
Run the rate limiting test script:

```bash
chmod +x scripts/test-rate-limiting.sh
./scripts/test-rate-limiting.sh
```

### Manual Testing

1. **Global Rate Limiting**:
   ```bash
   for i in {1..5100}; do
     curl -H "apikey: caresync_api_key_2026_secure" \
          http://localhost:8000/api/clinical/health
   done
   ```

2. **Burst Testing**:
   ```bash
   # Use tools like Apache Bench or wrk for high-frequency testing
   ab -n 1000 -c 10 -H "apikey: caresync_api_key_2026_secure" \
      http://localhost:8000/api/clinical/health
   ```

## Dashboard Access

- **Grafana**: http://localhost:3000
  - Username: admin
  - Password: admin
- **Prometheus**: http://localhost:9090
- **Kong Admin**: http://localhost:8001

## Success Criteria

- ✅ < 1% request rejection under normal load
- ✅ Graduated throttling (not binary blocking)
- ✅ Real-time monitoring and alerting
- ✅ Redis-backed persistence
- ✅ Consumer-specific limits

## Troubleshooting

### Common Issues

1. **Rate Limiting Not Working**
   - Check Kong configuration reload
   - Verify Redis connectivity
   - Confirm API key authentication

2. **Metrics Not Appearing**
   - Check Prometheus targets
   - Verify Kong prometheus plugin
   - Restart monitoring services

3. **High False Positives**
   - Adjust rate limiting thresholds
   - Review consumer usage patterns
   - Check for legitimate traffic spikes

### Logs

```bash
# Kong logs
docker logs caresync-kong-1

# Redis logs
docker logs caresync-redis-1

# Prometheus logs
docker logs caresync-prometheus-1
```

## Performance Considerations

- Redis provides sub-millisecond response times
- Kong processes requests with minimal latency overhead
- Monitoring adds ~1-2ms per request
- Rate limiting decisions cached in Redis

## Security Notes

- API keys are required for all requests
- Rate limiting prevents abuse but doesn't replace authentication
- Monitor for API key leakage
- Regular key rotation recommended

## Future Enhancements

- [ ] Dynamic rate limiting based on service health
- [ ] Machine learning-based anomaly detection
- [ ] Geo-based rate limiting
- [ ] Custom rate limiting policies per consumer
- [ ] Integration with external threat intelligence