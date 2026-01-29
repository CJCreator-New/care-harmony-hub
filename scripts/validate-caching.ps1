# Kong Response Caching Setup Validation

Write-Host "=== Kong Response Caching Setup Validation ===" -ForegroundColor Cyan
Write-Host ""

# Check if Kong is running
Write-Host "Checking Kong status..." -ForegroundColor Yellow
try {
    $kongResponse = Invoke-WebRequest -Uri "http://localhost:8100/status" -TimeoutSec 5
    Write-Host "✓ Kong is running (Status: $($kongResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "✗ Kong is not accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# Check Kong Admin API
Write-Host "Checking Kong Admin API..." -ForegroundColor Yellow
try {
    $adminResponse = Invoke-WebRequest -Uri "http://localhost:8001/" -TimeoutSec 5
    Write-Host "✓ Kong Admin API accessible (Status: $($adminResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "✗ Kong Admin API not accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# Check Prometheus
Write-Host "Checking Prometheus..." -ForegroundColor Yellow
try {
    $promResponse = Invoke-WebRequest -Uri "http://localhost:9090/-/healthy" -TimeoutSec 5
    Write-Host "✓ Prometheus is running (Status: $($promResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "✗ Prometheus not accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# Check Grafana
Write-Host "Checking Grafana..." -ForegroundColor Yellow
try {
    $grafanaResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 5
    Write-Host "✓ Grafana is running (Status: $($grafanaResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "✗ Grafana not accessible: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Configuration Status ===" -ForegroundColor Cyan
Write-Host "Response caching has been configured with:" -ForegroundColor White
Write-Host "  • Proxy-cache plugin enabled in Kong" -ForegroundColor White
Write-Host "  • Redis backend for cache storage" -ForegroundColor White
Write-Host "  • Multiple cache policies by endpoint type" -ForegroundColor White
Write-Host "  • Grafana dashboard for cache monitoring" -ForegroundColor White
Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Yellow
Write-Host "1. Start the services: docker-compose up -d" -ForegroundColor White
Write-Host "2. Test caching: .\scripts\test-response-caching.ps1" -ForegroundColor White
Write-Host "3. Monitor performance: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Cache TTL Configuration:" -ForegroundColor Green
Write-Host "  • Default: 5 minutes" -ForegroundColor White
Write-Host "  • Patient data: 10 minutes" -ForegroundColor White
Write-Host "  • Appointments: 1 minute" -ForegroundColor White
Write-Host "  • Reference data: 1 hour" -ForegroundColor White