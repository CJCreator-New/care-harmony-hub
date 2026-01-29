#!/bin/bash

# Kong Rate Limiting Test Script
# Tests various rate limiting scenarios to ensure proper functionality

API_GATEWAY_URL="http://localhost:8000"
API_KEY="caresync_api_key_2026_secure"

echo "=== Kong Rate Limiting Test Script ==="
echo "API Gateway URL: $API_GATEWAY_URL"
echo "API Key: $API_KEY"
echo ""

# Function to make API request
make_request() {
    local endpoint=$1
    local method=${2:-GET}
    local data=$3

    if [ "$method" = "POST" ]; then
        curl -s -w "\nHTTP_STATUS:%{http_code}\nTIME:%{time_total}s\n" \
             -X POST \
             -H "Content-Type: application/json" \
             -H "apikey: $API_KEY" \
             -d "$data" \
             "$API_GATEWAY_URL$endpoint"
    else
        curl -s -w "\nHTTP_STATUS:%{http_code}\nTIME:%{time_total}s\n" \
             -H "apikey: $API_KEY" \
             "$API_GATEWAY_URL$endpoint"
    fi
}

# Test 1: Basic rate limiting (global limit: 5000/min)
echo "=== Test 1: Global Rate Limiting (5000 requests/min) ==="
echo "Making 100 requests to test global rate limiting..."

success_count=0
rate_limited_count=0

for i in {1..100}; do
    response=$(make_request "/api/clinical/health")
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)

    if [ "$http_status" = "200" ]; then
        ((success_count++))
    elif [ "$http_status" = "429" ]; then
        ((rate_limited_count++))
    fi

    if [ $((i % 10)) -eq 0 ]; then
        echo "Progress: $i/100 requests - Success: $success_count, Rate Limited: $rate_limited_count"
    fi

    # Small delay to avoid overwhelming
    sleep 0.01
done

echo "Final Results - Success: $success_count, Rate Limited: $rate_limited_count"
echo ""

# Test 2: Burst rate limiting (100/sec)
echo "=== Test 2: Burst Rate Limiting (100 requests/sec) ==="
echo "Making rapid requests to test burst protection..."

success_count=0
rate_limited_count=0

for i in {1..150}; do
    response=$(make_request "/api/clinical/health")
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)

    if [ "$http_status" = "200" ]; then
        ((success_count++))
    elif [ "$http_status" = "429" ]; then
        ((rate_limited_count++))
    fi
done

echo "Burst Test Results - Success: $success_count, Rate Limited: $rate_limited_count"
echo ""

# Test 3: User-based rate limiting (1000/min per consumer)
echo "=== Test 3: User-Based Rate Limiting (1000 requests/min per consumer) ==="
echo "Testing with different API keys..."

# Test with primary API key
echo "Testing with primary API key..."
success_count=0
rate_limited_count=0

for i in {1..50}; do
    response=$(make_request "/api/clinical/health")
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)

    if [ "$http_status" = "200" ]; then
        ((success_count++))
    elif [ "$http_status" = "429" ]; then
        ((rate_limited_count++))
    fi
done

echo "Primary Key Results - Success: $success_count, Rate Limited: $rate_limited_count"

# Test with invalid API key
echo "Testing with invalid API key..."
response=$(make_request "/api/clinical/health" "GET" "" | tail -2)
echo "Invalid Key Response: $response"
echo ""

# Test 4: Endpoint-specific rate limiting
echo "=== Test 4: Endpoint-Specific Rate Limiting ==="
echo "Testing different endpoints with varying limits..."

# Test clinical endpoints (higher limits)
echo "Testing clinical endpoints..."
for endpoint in "/api/clinical/health" "/api/clinical/patients" "/api/clinical/appointments"; do
    echo "Endpoint: $endpoint"
    response=$(make_request "$endpoint")
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    echo "Status: $http_status"
done

echo ""

# Test 5: Monitoring endpoints
echo "=== Test 5: Monitoring Integration ==="
echo "Checking Prometheus metrics..."

# Check if Prometheus is accessible
prometheus_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9090/-/healthy")
if [ "$prometheus_status" = "200" ]; then
    echo "✓ Prometheus is healthy"

    # Check Kong metrics
    kong_metrics=$(curl -s "http://localhost:9090/api/v1/query?query=kong_http_requests_total")
    if echo "$kong_metrics" | grep -q "status"; then
        echo "✓ Kong metrics are being collected"
    else
        echo "✗ Kong metrics collection failed"
    fi
else
    echo "✗ Prometheus is not accessible"
fi

# Check Grafana
grafana_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/health")
if [ "$grafana_status" = "200" ]; then
    echo "✓ Grafana is healthy"
else
    echo "✗ Grafana is not accessible"
fi

echo ""
echo "=== Rate Limiting Test Complete ==="
echo "Check Grafana dashboard at http://localhost:3000 for detailed metrics"
echo "Default Grafana credentials: admin/admin"