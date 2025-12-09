// Test script to verify API returns alwaysPriced field
const fetch = require('node-fetch');

async function testMenuAPI() {
  try {
    const response = await fetch('http://localhost:3001/api/menu');
    const data = await response.json();
    
    console.log('\n=== API Response Status ===');
    console.log('Status:', response.status);
    console.log('Total items:', data.data.menuItems.length);
    
    console.log('\n=== Items with alwaysPriced field ===');
    
    const dinnerItems = data.data.menuItems.filter(item => 
      item.category?.name === 'Dinner'
    );
    
    console.log('\nDinner category items:');
    dinnerItems.forEach(item => {
      console.log(`\n- ${item.name}`);
      console.log(`  alwaysPriced in response: ${item.alwaysPriced}`);
      console.log(`  Type: ${typeof item.alwaysPriced}`);
      console.log(`  Has field: ${'alwaysPriced' in item}`);
      console.log(`  Price: €${item.price}`);
    });
    
  } catch (error) {
    console.error('Error testing API:', error.message);
    console.log('\nMake sure the server is running on port 3001');
  }
}

testMenuAPI();
