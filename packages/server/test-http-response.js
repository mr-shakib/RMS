const http = require('http');

function testMenuEndpoint() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/menu',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        
        console.log('\n=== HTTP API Response Test ===\n');
        console.log('Status:', res.statusCode);
        console.log('Total items:', response.data.menuItems.length);
        
        const testItems = response.data.menuItems.filter(item => 
          ['Burgiiiiir', 'Drink', 'Burgir'].includes(item.name)
        );
        
        console.log('\n=== Test Items ===\n');
        testItems.forEach(item => {
          console.log(`${item.name}:`);
          console.log(`  Has alwaysPriced field: ${'alwaysPriced' in item}`);
          console.log(`  alwaysPriced value: ${item.alwaysPriced}`);
          console.log(`  typeof: ${typeof item.alwaysPriced}`);
          console.log(`  Price: €${item.price}`);
          console.log(`  Category: ${item.category?.name}`);
          console.log('');
        });
        
      } catch (e) {
        console.error('Failed to parse response:', e.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Request failed: ${e.message}`);
    console.log('\nMake sure the server is running:');
    console.log('  cd packages/server');
    console.log('  npm run dev');
  });

  req.end();
}

// Wait a moment then test
setTimeout(testMenuEndpoint, 1000);

console.log('Starting test in 1 second...');
console.log('Make sure the server is running on port 3001');
