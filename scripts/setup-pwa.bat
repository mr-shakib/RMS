@echo off
echo.
echo 🚀 Restaurant Management System - PWA Setup
echo ===========================================
echo.

REM Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set LOCAL_IP=%%a
    goto :found
)

:found
REM Trim spaces
set LOCAL_IP=%LOCAL_IP: =%

if "%LOCAL_IP%"=="" (
    echo ⚠️  Could not detect IP automatically.
    echo Please run 'ipconfig' and find your IPv4 Address
    echo.
    set /p LOCAL_IP="Enter your LAN IP address: "
)

echo 📡 Detected IP Address: %LOCAL_IP%
echo.

REM Update PWA .env file
echo 📝 Updating PWA configuration...
(
echo # API Server URL
echo VITE_API_URL=http://%LOCAL_IP%:5000
) > packages\pwa\.env

echo ✅ PWA configured with API URL: http://%LOCAL_IP%:5000
echo.

REM Build PWA
echo 🔨 Building PWA...
call npm run build:pwa --workspace=packages/server

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Setup complete!
    echo.
    echo 📋 Next steps:
    echo    1. Start the server: npm run dev:server
    echo    2. Access PWA at: http://%LOCAL_IP%:5000/?table=1
    echo    3. Generate QR codes with URL: http://%LOCAL_IP%:5000/?table=[TABLE_NUMBER]
    echo.
    echo 📱 Test on iPad/Phone ^(same network^):
    echo    http://%LOCAL_IP%:5000/?table=1
    echo.
) else (
    echo.
    echo ❌ Build failed. Please check the errors above.
    exit /b 1
)
