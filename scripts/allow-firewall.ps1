# PowerShell script to allow Node.js through Windows Firewall
# Run as Administrator

Write-Host "🔥 Configuring Windows Firewall for Restaurant Management System" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Right-click PowerShell and select 'Run as Administrator', then run this script again." -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

# Add firewall rule for port 5000
Write-Host "Adding firewall rule for port 5000..." -ForegroundColor Yellow

try {
    # Remove existing rule if it exists
    Remove-NetFirewallRule -DisplayName "Restaurant Management System - Server" -ErrorAction SilentlyContinue
    
    # Add new rule
    New-NetFirewallRule -DisplayName "Restaurant Management System - Server" `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort 5000 `
        -Action Allow `
        -Profile Any `
        -Description "Allow incoming connections to RMS server on port 5000"
    
    Write-Host "✅ Firewall rule added successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Port 5000 is now accessible from other devices on your network." -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 You can now access the PWA from iPad/Phone at:" -ForegroundColor Cyan
    Write-Host "   http://192.168.0.100:5000/?table=1" -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "❌ Failed to add firewall rule: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "You may need to manually add the rule in Windows Firewall settings." -ForegroundColor Yellow
    Write-Host ""
}

pause
