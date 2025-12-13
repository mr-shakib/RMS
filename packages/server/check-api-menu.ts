import fetch from 'node-fetch';

async function checkMenu() {
  try {
    const response = await fetch('http://localhost:5000/api/menu');
    const data = await response.json() as any;
    
    console.log('Status:', response.status);
    console.log('Menu items count:', data.data?.menuItems?.length);
    
    // Check first item
    const firstItem = data.data?.menuItems?.[0];
    if (firstItem) {
      console.log('\nFirst item:', firstItem.name);
      console.log('Has buffetCategories:', !!firstItem.buffetCategories);
      console.log('buffetCategories:', firstItem.buffetCategories);
    }
    
    // Check Caesar Salad which should have buffet assignment
    const caesarSalad = data.data?.menuItems?.find((item: any) => item.name === 'Caesar Salad');
    if (caesarSalad) {
      console.log('\nCaesar Salad:');
      console.log('buffetCategories:', caesarSalad.buffetCategories);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkMenu();
