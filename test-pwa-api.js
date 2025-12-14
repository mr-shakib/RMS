const http = require('http');

function testAPI() {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/pwa/menu',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('\n=== PWA API Response ===\n');
        console.log(`Status: ${res.statusCode}`);
        console.log(`Total items: ${response.data?.menuItems?.length || 0}\n`);
        
        if (response.data?.menuItems) {
          response.data.menuItems.forEach(item => {
            console.log(`📦 ${item.name} (ID: ${item.id.substring(0, 8)}...)`);
            console.log(`   Category: ${item.category?.name || 'N/A'}`);
            console.log(`   Price: €${item.price}`);
            console.log(`   alwaysPriced: ${item.alwaysPriced} (type: ${typeof item.alwaysPriced})`);
            
            if (item.buffetCategories && item.buffetCategories.length > 0) {
              const buffetNames = item.buffetCategories.map(bc => bc.buffetCategory?.name).join(', ');
              console.log(`   Buffet Categories: ${buffetNames}`);
            }
            console.log('');
          });
        }
      } catch (error) {
        console.error('Error parsing response:', error);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Error calling API:', error.message);
    console.log('\nMake sure the server is running on port 5000');
  });

  req.end();
}

testAPI();
