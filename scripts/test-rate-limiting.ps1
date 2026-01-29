# Kong Rate Limiting Test Script
# Tests various rate limiting scenarios to ensure proper functionality

$API_GATEWAY_URL = "http://localhost:8000"
$API_KEY = "caresync_api_key_2026_secure"

Write-Host "=== Kong Rate Limiting Test Script ===" -ForegroundColor Cyan
Write-Host "API Gateway URL: $API_GATEWAY_URL"
Write-Host "API Key: $API_KEY"
Write-Host ""

# Function to make API request
function Make-Request {
    param (
        [string]$endpoint,
        [string]$method = "GET",
        [string]$data = ""
    )

    $headers = @{
        "apikey" = $API_KEY
    }

    if ($method -eq "POST") {
        $headers["Content-Type"] = "application/json"
        try {
            $response = Invoke-WebRequest -Uri "$API_GATEWAY_URL$endpoint" -Method $method -Headers $headers -Body $data -SkipHttpErrorCheck
            return $response.StatusCode
        } catch {
            return $_.Exception.Response.StatusCode
        }
    } else {
        try {
            $response = Invoke-WebRequest -Uri "$API_GATEWAY_URL$endpoint" -Method $method -Headers $headers -SkipHttpErrorCheck
            return $response.StatusCode
        } catch {
            return $_.Exception.Response.StatusCode
        }
    }
}

# Test 1: Basic connectivity
Write-Host "=== Test 1: Basic Connectivity ===" -ForegroundColor Yellow
$statusCode = Make-Request "/api/clinical/health"
Write-Host "Health Check Status: $statusCode" -ForegroundColor $(if ($statusCode -eq 200) { "Green" } else { "Red" })
Write-Host ""

# Test 2: Basic rate limiting (global limit: 5000/min)
Write-Host "=== Test 2: Global Rate Limiting (5000 requests/min) ===" -ForegroundColor Yellow
Write-Host "Making 50 requests to test global rate limiting..."
Write-Host ""

$success_count = 0
$rate_limited_count = 0

for ($i = 1; $i -le 50; $i++) {
    $statusCode = Make-Request "/api/clinical/health"

    if ($statusCode -eq 200) {
        $success_count++
    } elseif ($statusCode -eq 429) {
        $rate_limited_count++
    }

    if ($i % 10 -eq 0) {
        Write-Host "Progress: $i/50 requests - Success: $success_count, Rate Limited: $rate_limited_count"
    }

    # Small delay to avoid overwhelming
    Start-Sleep -Milliseconds 10
}

Write-Host "Final Results - Success: $success_count, Rate Limited: $rate_limited_count" -ForegroundColor Green
Write-Host ""

# Test 3: Invalid API key
Write-Host "=== Test 3: Invalid API Key Test ===" -ForegroundColor Yellow
try {
    $headers = @{
        "apikey" = "invalid_key"
    }
    $response = Invoke-WebRequest -Uri "$API_GATEWAY_URL/api/clinical/health" -Headers $headers -SkipHttpErrorCheck
    $statusCode = $response.StatusCode
} catch {
    $statusCode = $_.Exception.Response.StatusCode
}
Write-Host "Invalid Key Response Status: $statusCode" -ForegroundColor $(if ($statusCode -eq 401 -or $statusCode -eq 403) { "Green" } else { "Red" })
Write-Host ""

# Test 4: Monitoring services
Write-Host "=== Test 4: Monitoring Services ===" -ForegroundColor Yellow

# Check Prometheus
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9090/-/healthy" -SkipHttpErrorCheck
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Prometheus is healthy" -ForegroundColor Green
    } else {
        Write-Host "✗ Prometheus is not accessible" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Prometheus health check failed" -ForegroundColor Red
}

# Check Grafana
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -SkipHttpErrorCheck
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Grafana is healthy" -ForegroundColor Green
    } else {
        Write-Host "✗ Grafana is not accessible" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Grafana health check failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Rate Limiting Test Complete ===" -ForegroundColor Cyan
Write-Host "Check Grafana dashboard at http://localhost:3000 for detailed metrics"
Write-Host "Default Grafana credentials: admin/admin"