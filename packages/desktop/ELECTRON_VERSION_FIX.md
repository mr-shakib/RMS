# Electron Version Detection Fix

## The Error

```
Cannot compute electron version from installed node modules - none of the possible electron modules are installed and version ("^28.1.0") is not fixed in project.
```

## Solution Applied

I've added `"electronVersion": "28.1.0"` to `electron-builder.json`. This tells electron-builder exactly which version to use.

## Try Again

```bash
npm run package:win
```

## If Still Failing

If the error persists, try these solutions:

### Solution 1: Reinstall Dependencies

```bash
# From project root
npm install

# Or from desktop package
cd packages/desktop
npm install
```

### Solution 2: Move Electron to Dependencies

If electron-builder still can't find electron, we can move it from devDependencies to dependencies.

Edit `packages/desktop/package.json`:

```json
"dependencies": {
  "@heroicons/react": "^2.2.0",
  "@rms/shared": "*",
  "@tanstack/react-query": "^5.17.9",
  "electron": "^28.1.0",  // <-- Move here
  "lucide-react": "^0.553.0",
  "next": "^14.0.4",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "socket.io-client": "^4.6.0",
  "zustand": "^4.4.7"
},
"devDependencies": {
  "@electron/notarize": "^2.2.1",
  "@types/node": "^20.10.6",
  "@types/react": "^18.2.46",
  "@types/react-dom": "^18.2.18",
  "autoprefixer": "^10.4.16",
  "concurrently": "^8.2.2",
  // "electron": "^28.1.0",  // <-- Remove from here
  "electron-builder": "^24.9.1",
  ...
}
```

Then reinstall:
```bash
npm install
```

### Solution 3: Use Direct electron-builder Command

Instead of using the script, try running electron-builder directly:

```bash
cd packages/desktop
npx electron-builder --win --config electron-builder.json
```

### Solution 4: Check Node Modules

Verify electron is actually installed:

```bash
cd packages/desktop
ls node_modules/electron
```

If it's not there:
```bash
npm install electron@28.1.0 --save-dev
```

## Why This Happens

Electron-builder needs to know which version of Electron to package with your app. It tries to detect this by:
1. Looking in node_modules for electron
2. Reading the version from package.json

In workspace setups (monorepos), sometimes the module resolution doesn't work as expected. Setting `electronVersion` explicitly solves this.

## Verification

After the fix, you should see:

```
• electron-builder  version=24.13.3
• loaded configuration  file=electron-builder.json
• packaging       platform=win32 arch=x64
• building        target=nsis
✓ Packaging complete
```

## Related Files

- `electron-builder.json` - Updated with electronVersion
- `package.json` - Contains electron in devDependencies
