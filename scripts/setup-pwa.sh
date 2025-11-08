#!/bin/bash

echo "🚀 Restaurant Management System - PWA Setup"
echo "==========================================="
echo ""

# Get the local IP address
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}')
else
    echo "⚠️  Could not detect IP automatically. Please find your IP manually:"
    echo "   Windows: ipconfig"
    echo "   Mac: ifconfig"
    echo "   Linux: ip addr show"
    echo ""
    read -p "Enter your LAN IP address: " LOCAL_IP
fi

echo "📡 Detected IP Address: $LOCAL_IP"
echo ""

# Update PWA .env file
echo "📝 Updating PWA configuration..."
cat > packages/pwa/.env << EOF
# API Server URL
VITE_API_URL=http://$LOCAL_IP:5000
EOF

echo "✅ PWA configured with API URL: http://$LOCAL_IP:5000"
echo ""

# Build PWA
echo "🔨 Building PWA..."
npm run build:pwa --workspace=packages/server

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Start the server: npm run dev:server"
    echo "   2. Access PWA at: http://$LOCAL_IP:5000/?table=1"
    echo "   3. Generate QR codes with URL: http://$LOCAL_IP:5000/?table=[TABLE_NUMBER]"
    echo ""
    echo "📱 Test on iPad/Phone (same network):"
    echo "   http://$LOCAL_IP:5000/?table=1"
    echo ""
else
    echo ""
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi
