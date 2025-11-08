const { PrismaClient } = require('@prisma/client');
const os = require('os');

const prisma = new PrismaClient();

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function updateServerUrl() {
  try {
    const localIP = getLocalIP();
    const serverUrl = `http://${localIP}:5000`;

    console.log(`\n🔧 Updating server URL to: ${serverUrl}\n`);

    // Update or create server_url setting
    await prisma.setting.upsert({
      where: { key: 'server_url' },
      update: { value: serverUrl },
      create: { key: 'server_url', value: serverUrl },
    });

    console.log('✅ Server URL updated successfully!\n');
    console.log('📋 Next step: Regenerate QR codes from the desktop app:');
    console.log('   Settings → Server & QR → Generate All QR Codes\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateServerUrl();
