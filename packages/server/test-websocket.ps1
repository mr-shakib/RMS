# Complete WebSocket Test Script
# This script will:
# 1. Get a JWT token
# 2. Show you how to test the WebSocket

Write-Host "🧪 WebSocket Testing Script" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Step 1: Get JWT Token
Write-Host "Step 1: Getting JWT Token..." -ForegroundColor Yellow
$body = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    $token = $response.data.token
    Write-Host "✅ Token obtained successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Copy to clipboard
    try {
        $token | Set-Clipboard
        Write-Host "✅ Token copied to clipboard!" -ForegroundColor Green
    } catch {
        # Clipboard not available
    }
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Step 2: Test WebSocket Connection" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Open a NEW terminal and run:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  cd packages/server" -ForegroundColor White
    Write-Host "  node test-websocket-client.js $token" -ForegroundColor White
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Step 3: Trigger Events (Optional)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Open ANOTHER terminal and run:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  cd packages/server" -ForegroundColor White
    Write-Host "  node test-websocket-trigger.js $token" -ForegroundColor White
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Your JWT Token:" -ForegroundColor Yellow
    Write-Host $token -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure the server is running:" -ForegroundColor Yellow
    Write-Host "  cd packages/server" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
    exit 1
}
