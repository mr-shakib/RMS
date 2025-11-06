/**
 * WebSocket Test Client
 * 
 * This script tests the WebSocket server implementation by:
 * 1. Connecting to the server with a JWT token
 * 2. Subscribing to various rooms
 * 3. Listening for events
 * 
 * Usage:
 *   node test-websocket-client.js <JWT_TOKEN>
 * 
 * To get a JWT token:
 *   1. Start the server: npm run dev
 *   2. Login via API: POST http://localhost:5000/api/auth/login
 *   3. Copy the token from the response
 */

const { io } = require('socket.io-client');

// Get token from command line argument
const token = process.argv[2];

if (!token) {
  console.error('❌ Error: JWT token required');
  console.log('\nUsage: node test-websocket-client.js <JWT_TOKEN>');
  console.log('\nTo get a token:');
  console.log('1. Start the server: npm run dev');
  console.log('2. Login via API:');
  console.log('   curl -X POST http://localhost:5000/api/auth/login \\');
  console.log('        -H "Content-Type: application/json" \\');
  console.log('        -d \'{"username":"admin","password":"admin123"}\'');
  console.log('3. Copy the token from the response');
  process.exit(1);
}

console.log('🔌 Connecting to WebSocket server...\n');

// Create socket connection
const socket = io('http://localhost:5000', {
  auth: {
    token: token
  }
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log(`   Socket ID: ${socket.id}\n`);

  // Subscribe to all rooms
  console.log('📡 Subscribing to rooms...');
  socket.emit('subscribe:orders');
  console.log('   ✓ Subscribed to orders room');
  
  socket.emit('subscribe:tables');
  console.log('   ✓ Subscribed to tables room');
  
  socket.emit('subscribe:kds');
  console.log('   ✓ Subscribed to KDS room');
  
  socket.emit('subscribe:table', 1);
  console.log('   ✓ Subscribed to table:1 room\n');

  console.log('👂 Listening for events...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
    console.log('\n💡 Tip: Make sure you are using a valid JWT token');
    console.log('   Get a new token by logging in via the API');
  }
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('\n❌ Disconnected:', reason);
  process.exit(0);
});

// Order events
socket.on('order:created', (order) => {
  console.log('📦 ORDER CREATED');
  console.log(`   Order ID: ${order.id}`);
  console.log(`   Table: ${order.tableId}`);
  console.log(`   Status: ${order.status}`);
  console.log(`   Total: $${order.total.toFixed(2)}`);
  console.log(`   Items: ${order.items?.length || 0}`);
  console.log('');
});

socket.on('order:updated', (order) => {
  console.log('🔄 ORDER UPDATED');
  console.log(`   Order ID: ${order.id}`);
  console.log(`   Table: ${order.tableId}`);
  console.log(`   Status: ${order.status}`);
  console.log(`   Total: $${order.total.toFixed(2)}`);
  console.log('');
});

socket.on('order:cancelled', ({ orderId, tableId }) => {
  console.log('❌ ORDER CANCELLED');
  console.log(`   Order ID: ${orderId}`);
  console.log(`   Table: ${tableId}`);
  console.log('');
});

// Table events
socket.on('table:updated', (table) => {
  console.log('🪑 TABLE UPDATED');
  console.log(`   Table ID: ${table.id}`);
  console.log(`   Name: ${table.name}`);
  console.log(`   Status: ${table.status}`);
  console.log('');
});

// Menu events
socket.on('menu:updated', (menuItem) => {
  console.log('🍽️  MENU UPDATED');
  console.log(`   Item ID: ${menuItem.id}`);
  console.log(`   Name: ${menuItem.name}`);
  console.log(`   Category: ${menuItem.category}`);
  console.log(`   Price: $${menuItem.price.toFixed(2)}`);
  console.log(`   Available: ${menuItem.available ? 'Yes' : 'No'}`);
  console.log('');
});

// Payment events
socket.on('payment:completed', (payment) => {
  console.log('💰 PAYMENT COMPLETED');
  console.log(`   Payment ID: ${payment.id}`);
  console.log(`   Order ID: ${payment.orderId}`);
  console.log(`   Amount: $${payment.amount.toFixed(2)}`);
  console.log(`   Method: ${payment.method}`);
  console.log('');
});

// Keep the script running
console.log('Press Ctrl+C to exit\n');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Disconnecting...');
  socket.disconnect();
  process.exit(0);
});
