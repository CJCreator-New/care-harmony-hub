#!/bin/bash

# CareSync Production Deployment Script
# This script deploys the complete microservices stack to production

set -e

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