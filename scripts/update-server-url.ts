import { PrismaClient } from '@prisma/client';
import os from 'os';

const prisma = new PrismaClient();

async function getLocalIPAddress(): Promise<string | null> {
  const networkInterfaces = os.networkInterfaces();
  
  for (const interfaces of Object.values(networkInterfaces)) {
    if (!interfaces) continue;
    
    for (const iface of interfaces) {
      // Skip internal and non-IPv4 addresses
      if (!iface.internal && iface.family === 'IPv4') {
        return iface.address;
      }
    }
  }
  
  return null;
}

async function updateServerUrl() {
  try {
    const localIP = await getLocalIPAddress();
    
    if (!localIP) {
      console.error('❌ Could not find local IP address');
      process.exit(1);
    }
    
    const serverUrl = `http://${localIP}:5000`;
    
    console.log(`📡 Detected local IP: ${localIP}`);
    console.log(`🔧 Updating server_url to: ${serverUrl}`);
    
    await prisma.setting.upsert({
      where: { key: 'server_url' },
      update: { value: serverUrl },
      create: { key: 'server_url', value: serverUrl },
    });
    
    console.log('✅ Server URL updated successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Regenerate QR codes from the desktop app (Tables > Regenerate All QR Codes)');
    console.log('2. Print new QR codes');
    console.log(`3. Access PWA from your phone at: ${serverUrl}`);
    
  } catch (error) {
    console.error('❌ Failed to update server URL:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateServerUrl();
