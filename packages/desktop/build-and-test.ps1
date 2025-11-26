#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Build and package the RMS desktop application
    
.DESCRIPTION
    This script automates the build and packaging process for the Restaurant Management System desktop app.
    It handles cleaning, building, and packaging with proper error handling.
    
.PARAMETER Clean
    Clean all build artifacts before building
    
.PARAMETER SkipTests
    Skip running tests before packaging
    
.PARAMETER Platform
    Platform to build for: win, mac, linux, or all (default: win)
    
.PARAMETER Environment
    Environment to build for: development, staging, or production (default: production)
    
.EXAMPLE
    .\build-and-test.ps1
    Build for Windows production
    
.EXAMPLE
    .\build-and-test.ps1 -Clean -Platform all
    Clean and build for all platforms
    
.EXAMPLE
    .\build-and-test.ps1 -Environment staging
    Build for Windows staging environment
#>

param(
    [switch]$Clean,
    [switch]$SkipTests,
    [ValidateSet('win', 'mac', 'linux', 'all')]
    [string]$Platform = 'win',
    [ValidateSet('development', 'staging', 'production')]
    [string]$Environment = 'production'
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Err { Write-Host $args -ForegroundColor Red }

# Get script location
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DesktopDir = $ScriptDir
$RootDir = Split-Path -Parent (Split-Path -Parent $DesktopDir)

Write-Info "========================================="
Write-Info "RMS Desktop App Build Script"
Write-Info "========================================="
Write-Info "Platform: $Platform"
Write-Info "Environment: $Environment"
Write-Info "Root: $RootDir"
Write-Info "========================================="
Write-Host ""

# Step 1: Clean if requested
if ($Clean) {
    Write-Info "Step 1: Cleaning build artifacts..."
    
    Set-Location $DesktopDir
    
    # Clean desktop package
    if (Test-Path ".next") {
        Remove-Item -Recurse -Force .next
        Write-Success "Removed .next"
    }
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force dist
        Write-Success "Removed dist"
    }
    if (Test-Path "release") {
        Remove-Item -Recurse -Force release
        Write-Success "Removed release"
    }
    
    # Clean server temp
    $ServerTempDir = Join-Path $RootDir "packages\server\temp-prod"
    if (Test-Path $ServerTempDir) {
        Remove-Item -Recurse -Force $ServerTempDir
        Write-Success "Removed server temp-prod"
    }
    
    Write-Success "Clean complete"
    Write-Host ""
} else {
    Write-Info "Step 1: Skipping clean (use -Clean to clean first)"
    Write-Host ""
}

# Step 2: Build shared package
Write-Info "Step 2: Building shared package..."
Set-Location $RootDir
try {
    npm run build --workspace=packages/shared
    Write-Success "Shared package built"
} catch {
    Write-Err "Failed to build shared package"
    Write-Err $_.Exception.Message
    exit 1
}
Write-Host ""

# Step 3: Build server
Write-Info "Step 3: Building server..."
try {
    npm run build --workspace=packages/server
    Write-Success "Server built"
} catch {
    Write-Err "Failed to build server"
    Write-Err $_.Exception.Message
    exit 1
}
Write-Host ""

# Step 4: Build desktop app
Write-Info "Step 4: Building desktop app..."
Set-Location $DesktopDir
try {
    if ($Environment -eq 'production') {
        npm run build
    } elseif ($Environment -eq 'staging') {
        npm run build:staging
    } else {
        npm run build:dev
    }
    Write-Success "Desktop app built"
} catch {
    Write-Err "Failed to build desktop app"
    Write-Err $_.Exception.Message
    exit 1
}
Write-Host ""

# Step 5: Package
Write-Info "Step 5: Packaging for $Platform..."
try {
    $PackageScript = if ($Environment -eq 'production') {
        "package:$Platform"
    } else {
        "package:${Platform}:${Environment}"
    }
    
    if ($Platform -eq 'all') {
        npm run package
    } else {
        npm run $PackageScript
    }
    
    Write-Success "Packaging complete"
} catch {
    Write-Err "Failed to package"
    Write-Err $_.Exception.Message
    exit 1
}
Write-Host ""

# Step 6: Show output location
Write-Info "Step 6: Build complete!"
$ReleaseDir = Join-Path $DesktopDir "release"
if (Test-Path $ReleaseDir) {
    Write-Success "========================================="
    Write-Success "Build artifacts:"
    Write-Success "========================================="
    
    Get-ChildItem $ReleaseDir -Recurse -Include *.exe,*.dmg,*.AppImage,*.deb | ForEach-Object {
        $Size = [math]::Round($_.Length / 1MB, 2)
        Write-Info "Package: $($_.Name) ($Size MB)"
        Write-Info "Path: $($_.FullName)"
    }
    
    Write-Success "========================================="
}
Write-Host ""

# Step 7: Offer to test
if ($Platform -eq 'win' -or $Platform -eq 'all') {
    Write-Info "To test the packaged app:"
    Write-Host "1. Uninstall any previous version" -ForegroundColor Yellow
    Write-Host "2. Delete user data: $env:APPDATA\@rms\desktop" -ForegroundColor Yellow
    Write-Host "3. Run the installer from the release folder" -ForegroundColor Yellow
    Write-Host "4. Check logs at: $env:APPDATA\@rms\desktop\startup.log" -ForegroundColor Yellow
    Write-Host ""
    
    $Test = Read-Host "Would you like to clean user data and test now? (y/N)"
    if ($Test -eq 'y' -or $Test -eq 'Y') {
        $UserDataDir = Join-Path $env:APPDATA "@rms\desktop"
        if (Test-Path $UserDataDir) {
            Write-Host "Removing user data directory..." -ForegroundColor Yellow
            Remove-Item -Recurse -Force $UserDataDir
            Write-Success "User data cleaned"
        }
        
        # Find the installer
        $Installer = Get-ChildItem $ReleaseDir -Recurse -Filter "*.exe" | 
            Where-Object { $_.Name -notlike "*portable*" } | 
            Select-Object -First 1
        
        if ($Installer) {
            Write-Info "Launching installer: $($Installer.Name)"
            Start-Process $Installer.FullName
        } else {
            Write-Host "No installer found in release folder" -ForegroundColor Yellow
        }
    }
}

Write-Success "========================================="
Write-Success "Script complete!"
Write-Success "========================================="
