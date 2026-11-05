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

# Load declarative configuration (S0-11 / SECF-19).
# kong.template.yml is the committed kong.yml with ${VAR} placeholders; the
# secrets come from this container's environment (see docker-compose.yml kong-init).
echo "📝 Rendering and loading Kong configuration..."
TEMPLATE="${KONG_TEMPLATE:-/usr/local/kong/kong.template.yml}"
VARS="KONG_FRONTEND_API_KEY KONG_MOBILE_API_KEY KONG_ADMIN_API_KEY LOGGLY_TOKEN"
rendered="$(cat "$TEMPLATE")"
for v in $VARS; do
  val="${!v:-}"
  if [ -z "$val" ]; then
    echo "❌ $v is not set; refusing to load a config with placeholder keys" >&2
    exit 1
  fi
  placeholder="\${$v}"
  rendered="${rendered//"$placeholder"/"$val"}"
done
printf '%s\n' "$rendered" | curl -sS -f -X POST http://localhost:8001/config -F config=@- > /dev/null

echo "🎉 Kong Gateway initialization complete!"
echo ""
echo "📋 Kong Services:"
echo "  • Proxy: http://localhost:8000"
echo "  • Admin API: http://localhost:8001"
echo "  • Admin GUI: http://localhost:8002"
echo "  • Status: http://localhost:8100"
echo ""
echo "🔑 Consumer API keys were loaded from KONG_*_API_KEY (not printed)."
