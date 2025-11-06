# Get JWT Token Script
# Usage: .\get-token.ps1

$body = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your JWT Token:" -ForegroundColor Yellow
    Write-Host $response.data.token
    Write-Host ""
    Write-Host "Copy this token and use it to test WebSocket:" -ForegroundColor Cyan
    Write-Host "  node test-websocket-client.js $($response.data.token)" -ForegroundColor White
    
    # Copy to clipboard if available
    try {
        $response.data.token | Set-Clipboard
        Write-Host ""
        Write-Host "✅ Token copied to clipboard!" -ForegroundColor Green
    } catch {
        # Clipboard not available, that's okay
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure the server is running:" -ForegroundColor Yellow
    Write-Host "  cd packages/server" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
}
