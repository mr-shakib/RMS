# Buffet Feature Documentation

## Overview
The PWA now supports a professional buffet ordering system where customers can choose between regular à la carte ordering or buffet dining.

## Features

### 1. Buffet Selection
- Customers see a prominent buffet banner on the menu page
- Multiple buffet categories can be configured (e.g., Lunch Buffet, Dinner Buffet)
- Each buffet category has its own price
- Customers can select a buffet option to enter "Buffet Mode"

### 2. Buffet Mode
When a customer selects a buffet:
- The cart is cleared of any previous items
- Only items from the selected buffet category are shown
- All items are marked as "Included" in the cart
- The total price is the fixed buffet price (not per-item pricing)
- Customers can order unlimited items from the buffet category

### 3. Regular Mode
When not in buffet mode:
- All non-buffet categories are shown
- Items are priced individually
- Standard à la carte ordering applies

### 4. Cart Behavior
- **Buffet Mode**: Shows buffet banner, items marked as "Included", fixed buffet price
- **Regular Mode**: Shows individual item prices, calculates subtotal from items
- Tax is calculated on the final amount (buffet price or subtotal)

## Admin Configuration

### Setting Up Buffet Categories
Buffet categories are managed through the admin panel:

1. Create a category with `isBuffet: true`
2. Set the `buffetPrice` (e.g., 29.99 for dinner buffet)
3. Add menu items to this category
4. Set the `sortOrder` to control display order

### Example Category Structure
```json
{
  "id": "cat-123",
  "name": "Dinner Buffet",
  "isBuffet": true,
  "buffetPrice": 29.99,
  "sortOrder": 1
}
```

## User Experience Flow

### Scenario 1: Customer Chooses Buffet
1. Customer scans QR code and opens menu
2. Sees buffet options banner at the top
3. Clicks "Dinner Buffet - $29.99"
4. Menu filters to show only dinner buffet items
5. Customer adds items (all marked as "Included")
6. Goes to cart, sees fixed buffet price
7. Places order

### Scenario 2: Customer Exits Buffet Mode
1. Customer is in buffet mode
2. Clicks "Exit Buffet Mode" button
3. Returns to regular menu with all categories
4. Can now order à la carte items

### Scenario 3: Regular À La Carte Order
1. Customer scans QR code and opens menu
2. Sees buffet banner but doesn't select it
3. Browses regular menu categories
4. Adds items with individual pricing
5. Cart shows itemized prices
6. Places order

## Technical Implementation

### Data Flow
1. **Menu Load**: Fetches menu items with category information
2. **Category Extraction**: Separates buffet and regular categories
3. **Buffet Selection**: Sets cart to buffet mode with selected category
4. **Filtering**: Shows only items from selected buffet category
5. **Order Creation**: Includes `isBuffet` and `buffetCategoryId` in order data

### Cart State
The cart maintains:
- `isBuffet`: boolean flag
- `buffetCategory`: selected Category object
- Items: array of cart items

### Order Data Structure
```typescript
{
  tableId: number,
  isBuffet: boolean,
  buffetCategoryId?: string,
  items: [
    {
      menuItemId: string,
      quantity: number,
      notes?: string
    }
  ]
}
```

## UI/UX Improvements

### Professional Design
- Modern gradient color scheme (amber/orange theme)
- Smooth animations and transitions
- Card-based layout for menu items
- Prominent buffet banner with visual hierarchy
- Clear visual feedback for selections
- Responsive design for all screen sizes

### Visual Elements
- 🍽️ Menu icon in header
- 🎉 Buffet celebration icon
- 🛒 Shopping cart icon
- Gradient backgrounds for premium feel
- Shadow effects for depth
- Hover states for interactivity

### Typography
- Bold, clear headings
- Readable body text
- Proper hierarchy with font sizes
- Color contrast for accessibility

## Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Progressive Web App (PWA) capabilities
- Offline support with service workers
- Mobile-first responsive design

## Future Enhancements
- Multiple buffet selections per order
- Time-based buffet pricing (lunch vs dinner)
- Buffet item limits or restrictions
- Special dietary filters for buffet items
- Buffet duration tracking
