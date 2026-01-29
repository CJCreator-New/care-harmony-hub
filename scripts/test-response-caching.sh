#!/bin/bash

# Kong Response Caching Test Script
# Tests various caching scenarios to ensure proper functionality

API_GATEWAY_URL="http://localhost:8000"
API_KEY="caresync_api_key_2026_secure"

echo "=== Kong Response Caching Test Script ==="
echo "API Gateway URL: $API_GATEWAY_URL"
echo "API Key: $API_KEY"
echo ""

# Function to make API request and show cache headers
make_cached_request() {
    local endpoint=$1
    local method=${2:-GET}
    local data=$3

    echo "Request: $method $endpoint"
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\nCACHE_STATUS:%{header:X-Cache-Status}\nCACHE_TTL:%{header:X-Cache-TTL}\nRESPONSE_TIME:%{time_total}s\n" \
                 -X POST \
                 -H "Content-Type: application/json" \
                 -H "apikey: $API_KEY" \
                 -d "$data" \
                 "$API_GATEWAY_URL$endpoint")
    else
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\nCACHE_STATUS:%{header:X-Cache-Status}\nCACHE_TTL:%{header:X-Cache-TTL}\nRESPONSE_TIME:%{time_total}s\n" \
                 -H "apikey: $API_KEY" \
                 "$API_GATEWAY_URL$endpoint")
    fi

    echo "Status: $(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)"
    echo "Cache Status: $(echo "$response" | grep "CACHE_STATUS:" | cut -d: -f2)"
    echo "Cache TTL: $(echo "$response" | grep "CACHE_TTL:" | cut -d: -f2)"
    echo "Response Time: $(echo "$response" | grep "RESPONSE_TIME:" | cut -d: -f2)"
    echo "---"
}

# Test 1: Basic caching functionality
echo "=== Test 1: Basic Caching Test ==="
echo "Making multiple requests to test caching..."
echo ""

# First request (should be MISS)
echo "First request (should cache):"
make_cached_request "/api/clinical/health"

# Second request (should be HIT)
echo "Second request (should be cached):"
make_cached_request "/api/clinical/health"

# Third request (should still be HIT)
echo "Third request (should be cached):"
make_cached_request "/api/clinical/health"

echo ""

# Test 2: Cache TTL expiration
echo "=== Test 2: Cache TTL Test ==="
echo "Testing cache expiration (TTL: 5 minutes)..."
echo "Note: Cache should expire after 5 minutes"
echo ""

# Test 3: Different cache configurations
echo "=== Test 3: Endpoint-Specific Caching ==="
echo ""

# Test patient data caching (10 minute TTL)
echo "Testing patient data caching (10 min TTL):"
make_cached_request "/api/clinical/patients"

# Test appointment availability (1 minute TTL)
echo "Testing appointment availability (1 min TTL):"
make_cached_request "/api/clinical/appointments/availability"

# Test reference data (1 hour TTL)
echo "Testing reference data (1 hour TTL):"
make_cached_request "/api/clinical/reference/diagnoses"

echo ""

# Test 4: Cache invalidation
echo "=== Test 4: Cache Invalidation Test ==="
echo "Testing cache invalidation with POST/PUT/DELETE requests..."
echo ""

# Make a GET request to cache data
echo "Caching data with GET request:"
make_cached_request "/api/clinical/health"

# Make a POST request (should not be cached but may invalidate)
echo "Making POST request (should not be cached):"
make_cached_request "/api/clinical/health" "POST" '{"test": "data"}'

# Check if cache was invalidated
echo "Checking if cache was invalidated:"
make_cached_request "/api/clinical/health"

echo ""

# Test 5: Cache headers and performance
echo "=== Test 5: Cache Performance Analysis ==="
echo "Testing response times with and without cache..."
echo ""

# Measure response time for first request (cache miss)
echo "Cache MISS response time:"
time make_cached_request "/api/clinical/health"

# Measure response time for cached request (cache hit)
echo "Cache HIT response time:"
time make_cached_request "/api/clinical/health"

echo ""

# Test 6: Cache monitoring
echo "=== Test 6: Cache Monitoring ==="
echo "Checking Kong cache metrics..."
echo ""

# Check Kong metrics for cache statistics
if curl -s "http://localhost:9090/api/v1/query?query=kong_http_requests_total" | grep -q "status"; then
    echo "✓ Kong metrics available"

    # Check cache-specific metrics
    cache_metrics=$(curl -s "http://localhost:9090/api/v1/query?query=kong_cache_datastore_misses_total" 2>/dev/null)
    if echo "$cache_metrics" | grep -q "result"; then
        echo "✓ Cache metrics being collected"
    else
        echo "✗ Cache metrics not available"
    fi
else
    echo "✗ Kong metrics not accessible"
fi

echo ""
echo "=== Response Caching Test Complete ==="
echo "Cache TTLs:"
echo "  - Default endpoints: 5 minutes"
echo "  - Patient data: 10 minutes"
echo "  - Appointment availability: 1 minute"
echo "  - Reference data: 1 hour"
echo ""
echo "Check Grafana dashboard at http://localhost:3000 for cache performance metrics"