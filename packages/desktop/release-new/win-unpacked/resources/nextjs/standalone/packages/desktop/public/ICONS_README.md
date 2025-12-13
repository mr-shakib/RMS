# Application Icons

This directory should contain the application icons for different platforms.

## Required Icons

### Windows
- `icon.ico` - Application icon (256x256 or multiple sizes)
- `tray-icon.png` - System tray icon (16x16 or 32x32)

### macOS
- `icon.icns` - Application icon (multiple sizes)
- `tray-iconTemplate.png` - System tray icon (16x16 or 32x32, with @2x version)
- `tray-iconTemplate@2x.png` - Retina system tray icon (32x32)

## Icon Guidelines

### Application Icon
- Should be a clear, recognizable symbol representing the restaurant management system
- Recommended: A combination of restaurant elements (plate, utensils) with tech elements
- Must work well at small sizes (16x16) and large sizes (512x512)

### Tray Icon
- Should be simple and monochromatic
- Must be visible on both light and dark backgrounds
- For macOS, use "Template" suffix for automatic color adaptation
- Recommended size: 16x16 with @2x version at 32x32

## Temporary Solution

Until proper icons are created, the application uses a placeholder icon.
You can generate icons using tools like:
- https://www.electron.build/icons
- https://icon.kitchen/
- Adobe Illustrator or Figma

## Icon Generation

Once you have a source image (preferably SVG or high-res PNG), you can use:

```bash
# For Windows .ico
npm install -g electron-icon-maker
electron-icon-maker --input=source.png --output=./public

# For macOS .icns
# Use Icon Composer (Xcode) or online tools
```
