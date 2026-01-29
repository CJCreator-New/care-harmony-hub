#!/bin/bash

# Kong Gateway Initialization Script
# This script initializes Kong with the database and loads configuration

set -e

echo "🚀 Initializing Kong Gateway..."

# Wait for Kong database to be ready
echo "⏳ Waiting for Kong database..."
until pg_isready -h kong-database -p 5432 -U kong; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Kong database is ready"

# Run Kong migrations
echo "🔄 Running Kong database migrations..."
kong migrations bootstrap

# Start Kong in the background
echo "🏁 Starting Kong Gateway..."
kong start

# Wait for Kong to be ready
echo "⏳ Waiting for Kong to be ready..."
until curl -f http://localhost:8001/status; do
  echo "Kong is not ready - sleeping"
  sleep 2
done

echo "✅ Kong Gateway is ready"

# Load declarative configuration
echo "📝 Loading Kong configuration..."
curl -X POST http://localhost:8001/config \
  -H "Content-Type: application/json" \
  -d @kong.yml

echo "🎉 Kong Gateway initialization complete!"
echo ""
echo "📋 Kong Services:"
echo "  • Proxy: http://localhost:8000"
echo "  • Admin API: http://localhost:8001"
echo "  • Admin GUI: http://localhost:8002"
echo "  • Status: http://localhost:8100"
echo ""
echo "🔑 API Keys:"
echo "  • Frontend: caresync_frontend_key_2026_secure"
echo "  • Mobile: caresync_mobile_key_2026_secure"
echo "  • Admin: caresync_admin_key_2026_secure"