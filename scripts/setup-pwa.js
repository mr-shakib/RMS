const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

console.log('\n🚀 Restaurant Management System - PWA Setup');
console.log('===========================================\n');

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();
console.log(`📡 Detected IP Address: ${localIP}\n`);

// Update PWA .env file
console.log('📝 Updating PWA configuration...');
const envContent = `# API Server URL
VITE_API_URL=http://${localIP}:5000
`;

const envPath = path.join(__dirname, '../packages/pwa/.env');
fs.writeFileSync(envPath, envContent);

console.log(`✅ PWA configured with API URL: http://${localIP}:5000\n`);

// Build PWA
console.log('🔨 Building PWA...');
try {
  execSync('npm run build:pwa --workspace=packages/server', { stdio: 'inherit' });
  
  console.log('\n✅ Setup complete!\n');
  console.log('📋 Next steps:');
  console.log('   1. Start the server: npm run dev:server');
  console.log(`   2. Access PWA at: http://${localIP}:5000/?table=1`);
  console.log(`   3. Generate QR codes with URL: http://${localIP}:5000/?table=[TABLE_NUMBER]\n`);
  console.log('📱 Test on iPad/Phone (same network):');
  console.log(`   http://${localIP}:5000/?table=1\n`);
} catch (error) {
  console.error('\n❌ Build failed. Please check the errors above.');
  process.exit(1);
}
