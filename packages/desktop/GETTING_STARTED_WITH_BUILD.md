# Getting Started with Build and Packaging

## 🚀 Your First Build

### Step 1: Verify Setup

```bash
# Check Node.js version (need 20+)
node --version

# Check npm version (need 10+)
npm --version

# Install dependencies (if not already done)
npm install
```

### Step 2: Build the Application

```bash
# Build for production
npm run build
```

This will:
- ✅ Build the Express server
- ✅ Build the Next.js frontend
- ✅ Build the Electron main process
- ✅ Copy environment configuration

**Expected output:**
```
🔨 Building for production environment...

📦 Building server...
✓ Server build complete

📦 Building Next.js frontend...
✓ Next.js build complete

📦 Building Electron main process...
✓ Electron build complete

✅ Build complete!
```

### Step 3: Test the Build

```bash
cd packages/desktop
npm start
```

The application should launch and work exactly like in development mode.

### Step 4: Create Placeholder Icons

Before packaging, you need icon files. Create basic placeholders:

```bash
npm run icons:create
```

This creates minimal icon files that allow the build to work. You can replace these with proper icons later.

### Step 5: Create Your First Package

```bash
# Package for your current platform
npm run package:win    # If on Windows
npm run package:mac    # If on macOS
npm run package:linux  # If on Linux
```

This will:
- ✅ Build the application
- ✅ Bundle all dependencies
- ✅ Create installer packages
- ✅ Output to `packages/desktop/release/`

**Expected output:**
```
📦 Packaging for win (production environment)...

🔨 Running build...
✓ Build complete

📦 Creating installer packages...
  • electron-builder  version=24.9.1
  • loaded configuration  file=electron-builder.json
  • packaging       platform=win32 arch=x64
  • building        target=nsis
  • building        target=portable
✓ Packaging complete

📁 Output directory: packages/desktop/release
```

### Step 6: Find Your Installer

Navigate to `packages/desktop/release/` and you'll find:

**Windows:**
- `Restaurant Management System-1.0.0-x64.exe` - Main installer
- `Restaurant Management System-1.0.0-portable.exe` - Portable version

**macOS:**
- `Restaurant Management System-1.0.0-x64.dmg` - Intel Mac installer
- `Restaurant Management System-1.0.0-arm64.dmg` - Apple Silicon installer

**Linux:**
- `Restaurant Management System-1.0.0-x64.AppImage` - Portable
- `Restaurant Management System-1.0.0-x64.deb` - Debian package

### Step 7: Test the Installer

1. Run the installer
2. Follow the installation wizard
3. Launch the installed application
4. Verify all features work

## 🎨 Before Your First Release

### Add Application Icons

The build currently uses placeholder icons. To add your own:

1. **Design your icon** (1024x1024 PNG recommended)
   - Simple, recognizable design
   - High contrast
   - Looks good at small sizes

2. **Generate platform-specific formats:**

   **For Windows (icon.ico):**
   - Use online tool: https://icoconvert.com/
   - Upload your PNG
   - Download as ICO
   - Place in `packages/desktop/build/icon.ico`

   **For macOS (icon.icns):**
   - Use online tool: https://cloudconvert.com/png-to-icns
   - Upload your PNG
   - Download as ICNS
   - Place in `packages/desktop/build/icon.icns`

   **For Linux (PNG files):**
   - Create `packages/desktop/build/icons/` directory
   - Add PNG files: 16x16.png, 32x32.png, 48x48.png, etc.

3. **Rebuild:**
   ```bash
   npm run build
   npm run package:win
   ```

See `packages/desktop/build/ICONS_README.md` for detailed instructions.

## 📝 Version Management

### Bump Version Before Release

```bash
# For bug fixes (1.0.0 -> 1.0.1)
npm run version:patch

# For new features (1.0.0 -> 1.1.0)
npm run version:minor

# For breaking changes (1.0.0 -> 2.0.0)
npm run version:major
```

This automatically:
- ✅ Updates version in package.json
- ✅ Creates CHANGELOG.md entry
- ✅ Syncs version across packages

### Update Changelog

After bumping version, edit `packages/desktop/CHANGELOG.md`:

```markdown
## [1.0.1] - 2024-01-20

### Added
- New feature X

### Fixed
- Bug Y
```

## 🔐 Code Signing (Optional)

### Why Code Sign?

- ✅ Users trust your application
- ✅ No security warnings
- ✅ Required for auto-update
- ✅ Professional appearance

### Windows Code Signing

1. **Get a certificate** (.pfx file)
   - Purchase from certificate authority
   - Or use self-signed for testing

2. **Set environment variables:**
   ```bash
   set CSC_LINK=C:\path\to\certificate.pfx
   set CSC_KEY_PASSWORD=your_password
   ```

3. **Package:**
   ```bash
   npm run package:win
   ```

### macOS Code Signing

1. **Get Apple Developer account**
   - Join Apple Developer Program ($99/year)
   - Create certificates in Xcode

2. **Set environment variables:**
   ```bash
   export APPLE_ID=your@apple.id
   export APPLE_ID_PASSWORD=app-specific-password
   export APPLE_TEAM_ID=your_team_id
   ```

3. **Package:**
   ```bash
   npm run package:mac
   ```

The app will be automatically notarized.

## 🔄 Auto-Update Setup (Optional)

### Using GitHub Releases

1. **Edit `electron-builder.json`:**
   ```json
   "publish": {
     "provider": "github",
     "owner": "your-username",
     "repo": "restaurant-management-system"
   }
   ```

2. **Create GitHub release:**
   ```bash
   git tag v1.0.0
   git push --tags
   ```

3. **Upload installers to release**

4. **Users get automatic updates!**

## 🧪 Testing Checklist

Before distributing:

- [ ] Build completes without errors
- [ ] Application launches
- [ ] All features work
- [ ] Icons display correctly
- [ ] Installer works on clean system
- [ ] Uninstaller works
- [ ] Auto-update works (if configured)

## 📚 Need More Help?

- **Quick Reference:** `PACKAGING_QUICK_START.md`
- **Comprehensive Guide:** `BUILD.md`
- **Testing Guide:** `BUILD_TESTING.md`
- **Icon Guide:** `build/ICONS_README.md`

## 🎯 Common Commands Reference

```bash
# Development
npm run dev                # Run in dev mode

# Building
npm run build              # Production build
npm run build:staging      # Staging build
npm run build:dev          # Development build

# Packaging
npm run package:win        # Windows package
npm run package:mac        # macOS package
npm run package:linux      # Linux package
npm run package            # All platforms

# Version Management
npm run version:patch      # Patch bump
npm run version:minor      # Minor bump
npm run version:major      # Major bump

# Utilities
npm run icons:placeholder  # Create icon placeholders
npm run clean             # Clean build artifacts
```

## 🐛 Troubleshooting

### Build Fails

```bash
# Clean and rebuild
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Icons Don't Show

1. Check icons exist in `build/` directory
2. Verify file names match configuration
3. Rebuild: `npm run build && npm run package:win`

### Packaging Fails

- Ensure all dependencies are installed
- Check electron-builder logs
- Verify Node.js version is 20+

## 🎉 You're Ready!

You now have everything you need to build and package the Restaurant Management System for distribution. Start with a simple build and test, then work your way up to creating production installers with icons and code signing.

Happy building! 🚀
