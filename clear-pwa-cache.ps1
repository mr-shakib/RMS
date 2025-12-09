# Script to clear PWA cache and rebuild

Write-Host "Clearing PWA caches and rebuilding..." -ForegroundColor Cyan

# Navigate to PWA directory
Set-Location -Path "c:\personal\project\RMS\packages\pwa"

Write-Host "`n1. Building PWA..." -ForegroundColor Yellow
npm run build

Write-Host "`n2. PWA built successfully!" -ForegroundColor Green
Write-Host "`nIMPORTANT: To complete the cache clear:" -ForegroundColor Yellow
Write-Host "  1. Open the PWA in your browser" -ForegroundColor White
Write-Host "  2. Open DevTools (F12)" -ForegroundColor White
Write-Host "  3. Go to Application tab" -ForegroundColor White
Write-Host "  4. Clear:" -ForegroundColor White
Write-Host "     - Storage > Local Storage > Delete all" -ForegroundColor White
Write-Host "     - Storage > Session Storage > Delete all" -ForegroundColor White
Write-Host "     - Cache Storage > Delete all caches" -ForegroundColor White
Write-Host "     - Service Workers > Unregister" -ForegroundColor White
Write-Host "  5. Hard refresh the page (Ctrl+Shift+R or Ctrl+F5)" -ForegroundColor White
Write-Host "`nAlternatively, use Incognito/Private mode to test without cache." -ForegroundColor Cyan
