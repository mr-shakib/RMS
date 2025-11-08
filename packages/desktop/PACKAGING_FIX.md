# Packaging Fix - Missing Icons Issue

## Problem

When running `npm run package:win`, the build fails because electron-builder expects icon files that don't exist:
- `build/icon.ico` (Windows)
- `build/icon.icns` (macOS)
- `build/icons/*.png` (Linux)

## Solution

Run this command to create minimal placeholder icons:

```bash
npm run icons:create
```

Or from the desktop package:

```bash
cd packages/desktop
npm run icons:create
```

This creates basic placeholder icon files that allow the build to complete successfully.

## Now You Can Package

After creating the icons, you can run:

```bash
npm run package:win
```

## For Production

The placeholder icons are minimal and suitable for testing only. For production releases:

1. **Design your icon** (1024x1024 PNG recommended)
2. **Generate proper icons** using tools mentioned in `build/ICONS_README.md`
3. **Replace the placeholder files** in `packages/desktop/build/`

### Quick Icon Generation

**Windows (icon.ico):**
- Use: https://icoconvert.com/
- Upload your PNG
- Download as ICO
- Replace `build/icon.ico`

**macOS (icon.icns):**
- Use: https://cloudconvert.com/png-to-icns
- Upload your PNG
- Download as ICNS
- Replace `build/icon.icns`

**Linux (PNG files):**
- Use image editing software to create multiple sizes
- Save as: 16x16.png, 32x32.png, 48x48.png, 64x64.png, 128x128.png, 256x256.png, 512x512.png
- Place in `build/icons/` directory

## Why This Happened

The build configuration was set up correctly, but the actual icon files weren't created yet. This is intentional - you should create your own branded icons for your application.

The `icons:create` script provides minimal placeholders so you can test the build process before creating final icons.

## Summary

1. ✅ Run `npm run icons:create` to create placeholder icons
2. ✅ Run `npm run package:win` to build the installer
3. ⚠️ Replace with proper icons before production release

## Additional Help

- See `BUILD.md` for comprehensive build documentation
- See `build/ICONS_README.md` for detailed icon creation guide
- See `PACKAGING_QUICK_START.md` for quick reference
