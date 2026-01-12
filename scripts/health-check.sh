#!/bin/bash

echo "Running health checks..."

# Check if app is running
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173)
if [ "$HTTP_CODE" -ne 200 ]; then
  echo "❌ App health check failed (HTTP $HTTP_CODE)"
  exit 1
fi
echo "✅ App is running"

# Check database connection
if command -v psql &> /dev/null; then
  psql $DATABASE_URL -c "SELECT 1" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "✅ Database connection OK"
  else
    echo "❌ Database connection failed"
    exit 1
  fi
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
  echo "⚠️  Disk usage high: ${DISK_USAGE}%"
else
  echo "✅ Disk usage OK: ${DISK_USAGE}%"
fi

# Check memory
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$MEM_USAGE" -gt 90 ]; then
  echo "⚠️  Memory usage high: ${MEM_USAGE}%"
else
  echo "✅ Memory usage OK: ${MEM_USAGE}%"
fi

echo "✅ All health checks passed"
exit 0
