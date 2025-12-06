# Quick Build and Package Script for Windows
# Automates the entire build and package process

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   RMS Production Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Get script directory and navigate to desktop package
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktopDir = $scriptDir
$projectRoot = Split-Path -Parent (Split-Path -Parent $desktopDir)

Write-Host "Project Root: $projectRoot" -ForegroundColor Gray
Write-Host "Desktop Dir: $desktopDir" -ForegroundColor Gray
Write-Host ""

# Function to print section headers
function Write-Section {
    param([string]$Message)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Yellow
    Write-Host "  $Message" -ForegroundColor Yellow
    Write-Host ("=" * 60) -ForegroundColor Yellow
    Write-Host ""
}

# Function to check if a command succeeded
function Test-LastCommand {
    param([string]$ErrorMessage)
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: $ErrorMessage" -ForegroundColor Red
        exit 1
    }
}

try {
    # Step 1: Clean previous builds
    Write-Section "Cleaning Previous Builds"
    
    Set-Location $desktopDir
    Write-Host "Cleaning desktop build artifacts..." -ForegroundColor Cyan
    npm run clean
    Test-LastCommand "Clean failed"
    
    Write-Host "Clean complete" -ForegroundColor Green
    Write-Host ""
    
    # Step 2: Verify environment configuration
    Write-Section "Verifying Environment Configuration"
    
    $envFile = Join-Path $desktopDir ".env.production"
    if (Test-Path $envFile) {
        Write-Host ".env.production exists" -ForegroundColor Green
        
        $envContent = Get-Content $envFile -Raw
        Write-Host ""
        Write-Host "Environment Configuration:" -ForegroundColor Cyan
        Write-Host $envContent -ForegroundColor Gray
        
        # Check for correct port
        if ($envContent -match "localhost:5000") {
            Write-Host "API URL correctly configured (port 5000)" -ForegroundColor Green
        }
        else {
            Write-Host "WARNING: API URL may not be correctly configured!" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "ERROR: .env.production not found!" -ForegroundColor Red
        exit 1
    }
    
    # Step 3: Install dependencies
    Write-Section "Installing Dependencies"
    
    Set-Location $projectRoot
    Write-Host "Installing root dependencies..." -ForegroundColor Cyan
    npm install
    Test-LastCommand "npm install failed"
    
    Write-Host "Dependencies installed" -ForegroundColor Green
    Write-Host ""
    
    # Step 4: Build the application
    Write-Section "Building Application"
    
    Set-Location $desktopDir
    Write-Host "Building for production..." -ForegroundColor Cyan
    npm run build
    Test-LastCommand "Build failed"
    
    Write-Host "Build complete" -ForegroundColor Green
    Write-Host ""
    
    # Step 5: Verify build structure
    Write-Section "Verifying Build Structure"
    
    Write-Host "Running verification..." -ForegroundColor Cyan
    npm run verify
    Test-LastCommand "Verification failed"
    
    Write-Host "Build structure verified" -ForegroundColor Green
    Write-Host ""
    
    # Step 6: Package for Windows
    Write-Section "Packaging for Windows"
    
    Write-Host "Creating Windows installer..." -ForegroundColor Cyan
    Write-Host "This may take several minutes..." -ForegroundColor Gray
    Write-Host ""
    
    npm run package
    Test-LastCommand "Packaging failed"
    
    Write-Host "Packaging complete" -ForegroundColor Green
    Write-Host ""
    
    # Step 7: Check output
    Write-Section "Build Complete!"
    
    $releaseDir = Join-Path $desktopDir "release"
    if (Test-Path $releaseDir) {
        Write-Host "Output directory: $releaseDir" -ForegroundColor Cyan
        Write-Host ""
        
        $exeFiles = Get-ChildItem $releaseDir -Filter "*.exe" | Where-Object { $_.Name -notlike "*blockmap*" }
        
        if ($exeFiles.Count -gt 0) {
            Write-Host "Installer(s) created:" -ForegroundColor Green
            foreach ($file in $exeFiles) {
                $sizeMB = [math]::Round($file.Length / 1MB, 2)
                Write-Host "   $($file.Name) ($sizeMB MB)" -ForegroundColor Green
            }
            
            Write-Host ""
            Write-Host "Next Steps:" -ForegroundColor Yellow
            Write-Host "   1. Navigate to: $releaseDir" -ForegroundColor White
            Write-Host "   2. Run the installer to test" -ForegroundColor White
            Write-Host "   3. Check PRODUCTION_BUILD_CHECKLIST.md for testing procedures" -ForegroundColor White
            Write-Host ""
            Write-Host "   Log files location after installation:" -ForegroundColor Gray
            Write-Host "   %APPDATA%\@rms\desktop\startup.log" -ForegroundColor Gray
            Write-Host "   %APPDATA%\@rms\desktop\error.log" -ForegroundColor Gray
        }
        else {
            Write-Host "WARNING: No .exe files found in release directory!" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "WARNING: Release directory not found!" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   Build Process Completed Successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
}
catch {
    Write-Host ""
    Write-Host "Build failed with error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Stack trace:" -ForegroundColor Gray
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}
