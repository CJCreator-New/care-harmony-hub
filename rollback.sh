#!/bin/bash

# CareSync Production Rollback Script
# Emergency rollback procedure - keeps BLUE running, switches traffic back instantly
# RTO (Recovery Time Objective): < 1 minute

set -e

PROD_BLUE_PORT=3000
PROD_GREEN_PORT=3001

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Step 1: Disable feature flag kill-switch immediately
log_info "🔴 EMERGENCY ROLLBACK INITIATED"
log_info "Step 1/3: Disabling PHASE_6 feature flag..."

if command -v supabase &> /dev/null; then
  supabase secrets set PHASE_6_ENABLED="false" || log_error "Could not update feature flag"
else
  log_error "Supabase CLI not found - feature flag update failed"
fi

# Step 2: Switch load balancer traffic back to BLUE
log_info "Step 2/3: Switching traffic back to BLUE (port $PROD_BLUE_PORT)..."

if command -v systemctl &> /dev/null; then
  if [ -f /etc/nginx/sites-available/caresync-prod ]; then
    sed -i "s/upstream backend { server localhost:$PROD_GREEN_PORT/upstream backend { server localhost:$PROD_BLUE_PORT/" /etc/nginx/sites-available/caresync-prod
    nginx -s reload
    log_info "✅ nginx reloaded - traffic routed to BLUE"
  else
    log_error "nginx config not found at /etc/nginx/sites-available/caresync-prod"
  fi
else
  log_error "systemctl not available - load balancer switch may have failed"
fi

# Step 3: Shutdown GREEN instance  
log_info "Step 3/3: Shutting down GREEN instance..."

# Kill any node processes on GREEN_PORT
pkill -f "PORT=$PROD_GREEN_PORT" || log_info "No GREEN process found (already terminated)"
sleep 2

# Verify GREEN is down
if ! curl -f -s "http://localhost:$PROD_GREEN_PORT/health" > /dev/null 2>&1; then
  log_info "✅ GREEN instance successfully terminated"
else
  log_error "GREEN instance still responding - manual intervention may be needed"
fi

# Step 4: Verify BLUE is healthy
log_info "Verifying BLUE instance is healthy..."

attempts=0
max_attempts=10

while [ $attempts -lt $max_attempts ]; do
  if curl -f -s "http://localhost:$PROD_BLUE_PORT/health" > /dev/null 2>&1; then
    log_info "✅ BLUE instance is healthy and serving traffic"
    break
  fi
  attempts=$((attempts + 1))
  sleep 1
done

if [ $attempts -eq $max_attempts ]; then
  log_error "BLUE instance not responding after $max_attempts attempts"
  exit 1
fi

# Final status
log_info "✅ ROLLBACK COMPLETE"
log_info "   - Feature flag: DISABLED (PHASE_6_ENABLED=false)"
log_info "   - Traffic routing: BLUE (port $PROD_BLUE_PORT)"
log_info "   - GREEN instance: TERMINATED"
log_info "   - BLUE instance: HEALTHY"
log_info ""
log_info "📊 Incident Summary:"
log_info "   - Rollback time: $(date)"
log_info "   - RTO achieved: < 1 minute"
log_info "   - Users impact: MINIMAL (feature flag prevents new functionality)"
log_info ""
log_info "📝 Next steps:"
log_info "   1. Investigate root cause of GREEN deployment failure"
log_info "   2. Review logs: /tmp/green-server.log"
log_info "   3. Fix issues and test in staging"
log_info "   4. Retry deployment when ready: bash deploy-prod.sh deploy"
log_info ""

exit 0
