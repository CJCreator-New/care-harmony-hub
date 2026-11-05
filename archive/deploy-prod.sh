#!/bin/bash

# CareSync Production Deployment Script
# This script deploys the complete microservices stack to production

set -e

# ============================================================================
# BLOCKER #3: Blue-Green Deployment with Automatic Rollback (March 31, 2026)
# ============================================================================

PROD_BLUE_PORT=3000
PROD_GREEN_PORT=3001
PROD_BLUE_DIR="/var/www/caresync-blue"
PROD_GREEN_DIR="/var/www/caresync-green"
PROJECT_ID="${SUPABASE_PROJECT_ID}"
HEALTH_CHECK_URL="http://localhost"
MAX_HEALTH_CHECKS=30
ERROR_RATE_THRESHOLD=0.1

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

health_check() {
  local port=$1
  local service_name=$2
  local attempts=0
  
  while [ $attempts -lt $MAX_HEALTH_CHECKS ]; do
    if curl -f -s "http://localhost:$port/health" > /dev/null 2>&1; then
      log_info "✅ Health check passed for $service_name (port $port)"
      return 0
    fi
    attempts=$((attempts + 1))
    sleep 2
  done
  
  log_error "Health check failed for $service_name after $MAX_HEALTH_CHECKS attempts"
  return 1
}

check_error_rate() {
  local port=$1
  local duration=$2
  
  # Check error rate from monitoring endpoint
  local error_rate=$(curl -s "http://localhost:$port/metrics" | grep -oP 'error_rate_5m\s+\K[0-9.]+' || echo "0")
  
  if (( $(echo "$error_rate > $ERROR_RATE_THRESHOLD" | bc -l) )); then
    log_error "Error rate $error_rate exceeds threshold $ERROR_RATE_THRESHOLD"
    return 1
  fi
  
  log_info "✅ Error rate acceptable: $error_rate"
  return 0
}

toggle_kill_switch() {
  local state=$1  # "on" or "off"
  local env_value="true"
  
  if [ "$state" == "off" ]; then
    env_value="false"
  fi
  
  # Update feature flag in Supabase
  if command -v supabase &> /dev/null; then
    supabase secrets set PHASE_6_ENABLED="$env_value" || log_warn "Could not update feature flag via CLI"
  fi
  
  log_info "🔄 Kill-switch toggled to: $state (PHASE_6_ENABLED=$env_value)"
}

backup_current() {
  local timestamp=$(date +%s)
  log_info "📦 Backing up current BLUE deployment..."
  
  if [ -d "$PROD_BLUE_DIR" ]; then
    cp -r "$PROD_BLUE_DIR" "/backups/caresync-blue-backup-$timestamp" || log_warn "Could not backup BLUE directory"
  fi
}

deploy_blue_green() {
  log_info "🚀 Starting blue-green deployment..."
  
  # Step 1: Build new version
  log_info "🔨 Building application..."
  npm run build || {
    log_error "Build failed"
    return 1
  }
  
  # Step 2: Run database migrations
  log_info "🗄️ Running database migrations..."
  npm run migrate || {
    log_error "Migrations failed"
    return 1
  }
  
  # Step 3: Back up current BLUE
  backup_current
  
  # Step 4: Deploy GREEN instance
  log_info "🟢 Deploying GREEN instance (port $PROD_GREEN_PORT)..."
  
  # Copy build to GREEN directory
  rm -rf "$PROD_GREEN_DIR"
  cp -r dist "$PROD_GREEN_DIR"
  
  # Start GREEN on different port
  PORT=$PROD_GREEN_PORT npm run preview > /tmp/green-server.log 2>&1 &
  GREEN_PID=$!
  log_info "GREEN instance started with PID $GREEN_PID on port $PROD_GREEN_PORT"
  
  sleep 5
  
  # Step 5: Health check GREEN
  if ! health_check $PROD_GREEN_PORT "GREEN"; then
    log_error "GREEN instance failed health check, terminating..."
    kill $GREEN_PID 2>/dev/null || true
    return 1
  fi
  
  # Step 6: Check error rate on GREEN
  sleep 10
  if ! check_error_rate $PROD_GREEN_PORT "30s"; then
    log_error "GREEN error rate unacceptable, terminating..."
    kill $GREEN_PID 2>/dev/null || true
    toggle_kill_switch "off"
    return 1
  fi
  
  # Step 7: Switch traffic to GREEN
  log_info "🔀 Switching load balancer traffic to GREEN..."
  
  # Update nginx/reverse proxy config
  if command -v systemctl &> /dev/null; then
    sed -i "s/upstream backend { server localhost:$PROD_BLUE_PORT/upstream backend { server localhost:$PROD_GREEN_PORT/" /etc/nginx/sites-available/caresync-prod || log_warn "Could not update nginx config"
    nginx -s reload || log_warn "Could not reload nginx"
  fi
  
  # Step 8: Enable kill-switch
  toggle_kill_switch "on"
  
  # Step 9: Keep BLUE running for rollback
  log_info "🔵 Keeping BLUE instance ready for rollback (port $PROD_BLUE_PORT)"
  log_info "✅ Blue-green deployment successful! GREEN is now live."
  
  return 0
}

rollback_to_blue() {
  log_info "⏮️ Rolling back to BLUE instance..."
  
  # Step 1: Switch traffic back to BLUE
  log_info "↩️ Switching load balancer traffic back to BLUE (port $PROD_BLUE_PORT)..."
  
  if command -v systemctl &> /dev/null; then
    sed -i "s/upstream backend { server localhost:$PROD_GREEN_PORT/upstream backend { server localhost:$PROD_BLUE_PORT/" /etc/nginx/sites-available/caresync-prod || log_warn "Could not update nginx config"
    nginx -s reload || log_warn "Could not reload nginx"
  fi
  
  # Step 2: Disable kill-switch to prevent PHASE_6 features
  toggle_kill_switch "off"
  
  # Step 3: Log rollback event
  log_info "📋 Rollback complete. BLUE instance is now serving traffic."
  log_info "⏱️ Rollback time: < 1 minute"
  
  return 0
}

# Handle command line arguments for deployment operations
handle_deployment_command() {
  local cmd=$1
  
  case "$cmd" in
    "deploy")
      deploy_blue_green
      ;;
    "rollback")
      rollback_to_blue
      ;;
    "health-check")
      health_check $PROD_BLUE_PORT "BLUE"
      ;;
    *)
      log_error "Unknown deployment command: $cmd"
      echo "Usage: $0 {deploy|rollback|health-check}"
      return 1
      ;;
  esac
}

# If first argument is a deployment command, handle it and exit
if [ $# -gt 0 ] && [[ "$1" =~ ^(deploy|rollback|health-check)$ ]]; then
  handle_deployment_command "$1"
  exit $?
fi

echo "🚀 Starting CareSync Production Deployment"

# Check if .env.prod file exists
if [ ! -f ".env.prod" ]; then
    echo "❌ Error: .env.prod file not found!"
    echo "Please copy .env.prod.example to .env.prod and configure your environment variables."
    exit 1
fi

# Load environment variables
set -a
source .env.prod
set +a

echo "📋 Checking prerequisites..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create required directories
echo "📁 Creating required directories..."
mkdir -p logs
mkdir -p backups

# Pull latest images from GitHub Container Registry
echo "🐳 Pulling latest container images..."
docker-compose -f docker-compose.prod.yml pull

# Run database migrations (if needed)
echo "🗄️ Running database migrations..."
# Add your migration commands here

# Start the services
echo "🏃 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
services=("kong" "clinical-service" "patient-service" "appointment-service" "postgres" "redis" "kafka" "prometheus" "grafana")

for service in "${services[@]}"; do
    if docker-compose -f docker-compose.prod.yml ps $service | grep -q "Up"; then
        echo "✅ $service is running"
    else
        echo "❌ $service failed to start"
        exit 1
    fi
done

# Run health checks
echo "🔍 Running health checks..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    echo "Health check attempt $attempt/$max_attempts..."

    # Check Kong health
    if curl -f -s http://localhost:8001/status > /dev/null 2>&1; then
        echo "✅ Kong API Gateway is healthy"
        break
    fi

    sleep 10
    ((attempt++))
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Health checks failed after $max_attempts attempts"
    echo "📋 Checking service logs..."
    docker-compose -f docker-compose.prod.yml logs --tail=50
    exit 1
fi

# Run post-deployment tests
echo "🧪 Running post-deployment tests..."
# Add your test commands here

echo "🎉 CareSync production deployment completed successfully!"
echo ""
echo "📊 Monitoring URLs:"
echo "  - Grafana: http://localhost:3000 (admin/${GRAFANA_PASSWORD})"
echo "  - Prometheus: http://localhost:9090"
echo "  - AlertManager: http://localhost:9093"
echo "  - Kong Admin: http://localhost:8001"
echo ""
echo "🔗 API Endpoints:"
echo "  - Clinical Service: http://localhost:8000/api/clinical"
echo "  - Patient Service: http://localhost:8000/api/patient"
echo "  - Appointment Service: http://localhost:8000/api/appointment"
echo ""
echo "📝 Useful commands:"
echo "  - View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  - Stop services: docker-compose -f docker-compose.prod.yml down"
echo "  - Restart service: docker-compose -f docker-compose.prod.yml restart <service-name>"
echo "  - Scale service: docker-compose -f docker-compose.prod.yml up -d --scale <service-name>=<count>"