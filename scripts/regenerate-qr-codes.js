const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');
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

async function regenerateQRCodes() {
  try {
    const localIP = getLocalIP();
    const serverUrl = `http://${localIP}:5000`;

    console.log(`\n🔄 Regenerating QR codes with server URL: ${serverUrl}\n`);

    // Get all tables
    const tables = await prisma.table.findMany();

    if (tables.length === 0) {
      console.log('⚠️  No tables found in database');
      return;
    }

    console.log(`Found ${tables.length} tables\n`);

    // Regenerate QR code for each table
    for (const table of tables) {
      const tableUrl = `${serverUrl}/?table=${table.id}`;
      
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(tableUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });

        await prisma.table.update({
          where: { id: table.id },
          data: { qrCodeUrl: qrCodeDataUrl },
        });

        console.log(`✅ ${table.name}: ${tableUrl}`);
      } catch (error) {
        console.error(`❌ Failed to generate QR for ${table.name}:`, error.message);
      }
    }

    console.log(`\n✅ All QR codes regenerated successfully!\n`);
    console.log('📱 QR codes now point to:');
    console.log(`   ${serverUrl}/?table=[TABLE_ID]\n`);
    console.log('🎯 Scan any QR code with your iPhone to test!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateQRCodes();
