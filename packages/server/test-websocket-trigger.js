/**
 * WebSocket Event Trigger Script
 * 
 * This script triggers various actions via the REST API to test WebSocket events
 * 
 * Usage:
 *   node test-websocket-trigger.js <JWT_TOKEN>
 */

const token = process.argv[2];

if (!token) {
  console.error('❌ Error: JWT token required');
  console.log('\nUsage: node test-websocket-trigger.js <JWT_TOKEN>');
  process.exit(1);
}

const BASE_URL = 'http://localhost:5000/api';

async function makeRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
}

async function testWebSocketEvents() {
  console.log('🧪 Testing WebSocket Events\n');
  console.log('Make sure you have the test client running in another terminal!');
  console.log('Run: node test-websocket-client.js <TOKEN>\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Wait a bit for user to start the client
    console.log('⏳ Waiting 3 seconds for you to start the client...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 1: Create a menu item (triggers menu:updated)
    console.log('1️⃣  Creating a menu item...');
    const menuItem = await makeRequest('POST', '/menu', {
      name: 'Test Burger',
      category: 'Main Course',
      price: 12.99,
      description: 'A delicious test burger',
      available: true
    });
    console.log(`   ✓ Menu item created: ${menuItem.id}\n`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Update table status (triggers table:updated)
    console.log('2️⃣  Updating table status...');
    const table = await makeRequest('PATCH', '/tables/1/status', {
      status: 'OCCUPIED'
    });
    console.log(`   ✓ Table updated: ${table.name} - ${table.status}\n`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Create an order (triggers order:created)
    console.log('3️⃣  Creating an order...');
    const order = await makeRequest('POST', '/orders', {
      tableId: 1,
      items: [
        {
          menuItemId: menuItem.id,
          quantity: 2,
          notes: 'No onions'
        }
      ]
    });
    console.log(`   ✓ Order created: ${order.id}\n`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 4: Update order status (triggers order:updated)
    console.log('4️⃣  Updating order status to PREPARING...');
    const updatedOrder = await makeRequest('PATCH', `/orders/${order.id}/status`, {
      status: 'PREPARING'
    });
    console.log(`   ✓ Order updated: ${updatedOrder.status}\n`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('5️⃣  Updating order status to READY...');
    await makeRequest('PATCH', `/orders/${order.id}/status`, {
      status: 'READY'
    });
    console.log(`   ✓ Order updated: READY\n`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('6️⃣  Updating order status to SERVED...');
    await makeRequest('PATCH', `/orders/${order.id}/status`, {
      status: 'SERVED'
    });
    console.log(`   ✓ Order updated: SERVED\n`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 5: Process payment (triggers payment:completed)
    console.log('7️⃣  Processing payment...');
    const payment = await makeRequest('POST', '/payments', {
      orderId: order.id,
      amount: order.total,
      method: 'CARD'
    });
    console.log(`   ✓ Payment completed: ${payment.id}\n`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 6: Update menu item availability (triggers menu:updated)
    console.log('8️⃣  Toggling menu item availability...');
    await makeRequest('PATCH', `/menu/${menuItem.id}/availability`);
    console.log(`   ✓ Menu item availability toggled\n`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ All tests completed!');
    console.log('\nCheck the test client terminal to see the WebSocket events.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testWebSocketEvents();
