# Simple Load Test Script
param(
    [int]$Requests = 5,
    [string]$Url = "http://localhost:7000"
)

Write-Host "Load Testing Platform" -ForegroundColor Green
Write-Host "URL: $Url" -ForegroundColor Gray
Write-Host "Requests: $Requests" -ForegroundColor Gray

# Check server
Write-Host ""
Write-Host "Checking server..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing
    Write-Host "Server OK - Status: $($response.StatusCode)" -ForegroundColor Green
}
catch {
    Write-Host "Server NOT available" -ForegroundColor Red
    Write-Host "Run: npm run dev" -ForegroundColor Yellow
    exit 1
}

# Load testing
Write-Host ""
Write-Host "Starting load test..." -ForegroundColor Cyan

$successful = 0
$failed = 0
$totalTime = 0

for ($i = 1; $i -le $Requests; $i++) {
    try {
        $start = Get-Date
        $result = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing
        $end = Get-Date
        
        $responseTime = ($end - $start).TotalMilliseconds
        $totalTime += $responseTime
        $successful++
        
        Write-Host "Request $i : SUCCESS ($($result.StatusCode)) - $([math]::Round($responseTime, 2))ms" -ForegroundColor Green
    }
    catch {
        $failed++
        Write-Host "Request $i : FAILED" -ForegroundColor Red
    }
}

# Results
Write-Host ""
Write-Host "RESULTS:" -ForegroundColor Magenta
Write-Host "Success: $successful" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red

if ($successful -gt 0) {
    $avgTime = $totalTime / $successful
    Write-Host "Average Response Time: $([math]::Round($avgTime, 2))ms" -ForegroundColor Yellow
    
    if ($avgTime -lt 500) {
        Write-Host "EXCELLENT! Very fast performance" -ForegroundColor Green
    } elseif ($avgTime -lt 1500) {
        Write-Host "GOOD! Acceptable performance" -ForegroundColor Yellow  
    } else {
        Write-Host "SLOW - needs optimization" -ForegroundColor Red
    }
}

# Test API
Write-Host ""
Write-Host "Testing Login API..." -ForegroundColor Cyan

$loginData = '{"email":"test@example.com","password":"password123"}'

try {
    $start = Get-Date
    $loginResult = Invoke-WebRequest -Uri "$Url/api/auth/login" -Method POST -Body $loginData -ContentType "application/json" -TimeoutSec 10 -UseBasicParsing
    $end = Get-Date
    $apiTime = ($end - $start).TotalMilliseconds
    
    Write-Host "API Works - Status: $($loginResult.StatusCode) - $([math]::Round($apiTime, 2))ms" -ForegroundColor Green
}
catch {
    $statusCode = 0
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.Value__
    }
    
    if ($statusCode -eq 401 -or $statusCode -eq 400) {
        Write-Host "API Works - Rejected invalid credentials (normal)" -ForegroundColor Green
    } else {
        Write-Host "API Problem - Status: $statusCode" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Test Complete!" -ForegroundColor Green

if ($successful -eq $Requests) {
    Write-Host "RESULT: Platform is stable and ready!" -ForegroundColor Green
} else {
    Write-Host "RESULT: May need review and optimization" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "For advanced testing:" -ForegroundColor Gray
Write-Host "npm run stress-test-quick" -ForegroundColor Gray