# Kong Response Caching Test Script
# Tests basic caching functionality

$API_GATEWAY_URL = "http://localhost:8000"
$API_KEY = "caresync_api_key_2026_secure"

Write-Host "=== Kong Response Caching Test Script ===" -ForegroundColor Cyan
Write-Host "API Gateway URL: $API_GATEWAY_URL"
Write-Host "API Key: $API_KEY"
Write-Host ""

# Function to make API request and show cache headers
function Make-CachedRequest {
    param (
        [string]$endpoint,
        [string]$method = "GET"
    )

    Write-Host "Request: $method $endpoint" -ForegroundColor Yellow

    try {
        $headers = @{
            "apikey" = $API_KEY
        }
        $response = Invoke-WebRequest -Uri "$API_GATEWAY_URL$endpoint" -Method $method -Headers $headers -SkipHttpErrorCheck

        $statusCode = $response.StatusCode
        $cacheStatus = $response.Headers["X-Cache-Status"]
        $cacheTTL = $response.Headers["X-Cache-TTL"]

        Write-Host "Status: $statusCode" -ForegroundColor $(if ($statusCode -eq 200) { "Green" } else { "Red" })
        Write-Host "Cache Status: $($cacheStatus -join ', ')" -ForegroundColor $(if ($cacheStatus -contains "HIT") { "Green" } elseif ($cacheStatus -contains "MISS") { "Yellow" } else { "Gray" })
        Write-Host "Cache TTL: $($cacheTTL -join ', ')" -ForegroundColor Blue

    } catch {
        Write-Host "Request failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host "---" -ForegroundColor Gray
}

# Test 1: Basic caching functionality
Write-Host "=== Test 1: Basic Caching Test ===" -ForegroundColor Yellow
Write-Host "Making multiple requests to test caching..."
Write-Host ""

# First request (should be MISS)
Write-Host "First request (should cache):" -ForegroundColor Cyan
Make-CachedRequest "/api/clinical/health"

# Second request (should be HIT)
Write-Host "Second request (should be cached):" -ForegroundColor Cyan
Make-CachedRequest "/api/clinical/health"

# Third request (should still be HIT)
Write-Host "Third request (should be cached):" -ForegroundColor Cyan
Make-CachedRequest "/api/clinical/health"

Write-Host ""

# Test 2: Different endpoints
Write-Host "=== Test 2: Endpoint-Specific Caching ===" -ForegroundColor Yellow
Write-Host ""

# Test patient data caching (10 minute TTL)
Write-Host "Testing patient data caching (10 min TTL):" -ForegroundColor Cyan
Make-CachedRequest "/api/clinical/patients"

# Test appointment availability (1 minute TTL)
Write-Host "Testing appointment availability (1 min TTL):" -ForegroundColor Cyan
Make-CachedRequest "/api/clinical/appointments/availability"

Write-Host ""
Write-Host "=== Response Caching Test Complete ===" -ForegroundColor Cyan
Write-Host "Cache TTLs:" -ForegroundColor White
Write-Host "  - Default endpoints: 5 minutes" -ForegroundColor White
Write-Host "  - Patient data: 10 minutes" -ForegroundColor White
Write-Host "  - Appointment availability: 1 minute" -ForegroundColor White
Write-Host "  - Reference data: 1 hour" -ForegroundColor White
Write-Host ""
Write-Host "Check Grafana dashboard at http://localhost:3000 for cache performance metrics" -ForegroundColor White