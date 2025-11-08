# How to Clear PWA Cache on iPhone

If the PWA styles are not updating on your iPhone, follow these steps:

## Method 1: Clear Safari Cache (Recommended)

1. Open **Settings** app on your iPhone
2. Scroll down and tap **Safari**
3. Scroll down and tap **Clear History and Website Data**
4. Confirm by tapping **Clear History and Data**
5. Reopen Safari and navigate to the PWA URL
6. The app should reload with the new styles

## Method 2: Remove PWA from Home Screen

If you added the PWA to your home screen:

1. Long press the PWA icon on your home screen
2. Tap **Remove App** or **Delete App**
3. Confirm deletion
4. Open Safari and navigate to the PWA URL
5. Tap the Share button (square with arrow)
6. Tap **Add to Home Screen**
7. Tap **Add**

## Method 3: Force Reload in Safari

1. Open the PWA in Safari (not from home screen)
2. Pull down to refresh the page
3. If that doesn't work, close Safari completely:
   - Swipe up from bottom (or double-click home button)
   - Swipe up on Safari to close it
4. Reopen Safari and navigate to the PWA

## Method 4: Developer Mode (Advanced)

If you have Safari Developer mode enabled:

1. Open Safari on your iPhone
2. Navigate to the PWA
3. Tap the **aA** button in the address bar
4. Tap **Website Settings**
5. Toggle **Use Content Blockers** off and on
6. Reload the page

## After Clearing Cache

Once you've cleared the cache:
1. Navigate to your PWA URL
2. The service worker will automatically update
3. The new styles should be visible immediately

## Verify the Update

To verify the cart page is working:
1. Navigate to the menu
2. Add an item to cart
3. Go to cart page
4. Check if the styling looks correct (proper spacing, colors, buttons)

## Still Not Working?

If the issue persists:
1. Make sure the PWA has been rebuilt on the server: `npm run build` in packages/pwa
2. Check that the server is serving the latest files
3. Try accessing the PWA in Safari's private browsing mode
4. Check the browser console for any errors (enable Web Inspector in Settings > Safari > Advanced)
