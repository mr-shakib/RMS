# Quick Production Build & Test

## Quick Build for Windows

```bash
# From project root
npm run package:win
```

Wait for the build to complete (~5-10 minutes depending on your system).

## Output Location

Find the installer in:
```
packages/desktop/release/Restaurant Management System-1.0.0-x64.exe
```

## Testing the Build

### 1. Install the Application

1. Navigate to `packages/desktop/release/`
2. Double-click `Restaurant Management System-1.0.0-x64.exe`
3. Follow the installation wizard
4. Choose installation directory (default: `C:\Program Files\Restaurant Management System`)
5. Complete installation

### 2. First Launch

The application will:
1. Start automatically after installation (if you checked "Run after finish")
2. Launch both the API server and Next.js server (may take 10-20 seconds on first run)
3. Create a database in: `C:\Users\[YourUsername]\AppData\Roaming\Restaurant Management System\database\`
4. Open the login window

### 3. Login

Use default credentials:
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Important**: Change this password after first login via Settings!

### 4. Test Core Features

#### a. Dashboard
- Should display revenue, orders, and analytics
- Real-time updates should work

#### b. Create an Order
1. Go to **Orders** → **New Order**
2. Select a table
3. Add menu items
4. Verify total calculation
5. Place the order

#### c. Kitchen Display
1. Go to **Kitchen Display (KDS)**
2. Verify the order appears
3. Mark order as "Preparing" or "Ready"
4. Check real-time updates

#### d. Complete Order & Payment
1. Go back to **Orders**
2. Find your test order
3. Click **Complete Order**
4. Process payment
5. Verify order status changes to "COMPLETED"

#### e. Menu Management
1. Go to **Menu**
2. Add a new menu item
3. Edit an existing item
4. Toggle availability
5. Verify changes persist after app restart

#### f. Table Management
1. Go to **Tables**
2. View QR codes
3. Create a new table
4. Update table status

#### g. Reports
1. Go to **Reports**
2. Generate sales report
3. View top-selling items
4. Export data (if implemented)

### 5. Test Data Persistence

1. Create some test data (orders, menu items, etc.)
2. Close the application completely
3. Reopen the application
4. Verify all data is still there

### 6. Test System Tray

1. Minimize the application
2. Check if it appears in the system tray (bottom-right of taskbar)
3. Right-click tray icon
4. Test "Show" and "Quit" options

### 7. Test Multiple Starts

1. Try to open the app twice
2. Verify only one instance runs (port conflict prevention)
3. Or verify the app handles multiple instances correctly

## Common Issues & Solutions

### Issue: "Port already in use"
**Solution**: Close any existing instances of the app or other apps using ports 3000-5010.

### Issue: App won't start
**Solution**: 
1. Check Windows Event Viewer for errors
2. Look for logs in: `%APPDATA%\Restaurant Management System\logs\`
3. Try running as Administrator

### Issue: Database error
**Solution**:
1. Close the app
2. Delete: `%APPDATA%\Restaurant Management System\database\restaurant.db`
3. Restart the app (database will be recreated with default data)

### Issue: Login doesn't work
**Solution**:
- Verify you're using: `admin` / `admin123`
- Check if database was initialized correctly
- Try resetting database (see above)

## Performance Checklist

- [ ] App starts within 20 seconds
- [ ] Login is instant
- [ ] Page navigation is smooth
- [ ] Orders update in real-time
- [ ] No console errors (check with F12 Developer Tools)
- [ ] Memory usage stays reasonable (<500MB)
- [ ] Database queries are fast (<100ms for most operations)

## Security Checklist

- [ ] Default password works initially
- [ ] Password can be changed successfully
- [ ] Changed password persists after restart
- [ ] JWT tokens are secure
- [ ] No sensitive data in logs
- [ ] Database file has appropriate permissions

## Uninstall Test

1. Go to Windows Settings → Apps
2. Find "Restaurant Management System"
3. Click Uninstall
4. Verify app is removed
5. Check if user data remains (it should, for data safety)
6. Manually delete `%APPDATA%\Restaurant Management System\` if you want clean removal

## Build Different Versions

### Portable Version
```bash
# Creates a standalone .exe that doesn't require installation
npm run package:win
# Look for: Restaurant Management System-1.0.0-portable.exe
```

### Staging Build (for testing)
```bash
npm run package:win:staging
```

## Next Steps

After successful testing:
1. Update version number (`npm run version:patch`)
2. Build final production version
3. (Optional) Code sign the executable
4. Distribute to users
5. Prepare user documentation

## Distribution Checklist

Before sending to users:
- [ ] All tests passed
- [ ] Version number is correct
- [ ] Icons are customized (not placeholders)
- [ ] License file is included
- [ ] Default credentials are documented
- [ ] User manual is prepared
- [ ] Known issues are documented
- [ ] Support contact information is included

## File Sizes (Approximate)

- **Installer**: ~150-200 MB
- **Installed Size**: ~300-400 MB
- **Database** (empty): ~100 KB
- **Database** (with data): ~1-10 MB (depending on usage)

## System Requirements

- **OS**: Windows 10 or later (64-bit)
- **RAM**: 4 GB minimum, 8 GB recommended
- **Disk Space**: 500 MB free space
- **Network**: Not required (app works offline)

---

**Quick Reference**:
- Installer: `packages/desktop/release/Restaurant Management System-1.0.0-x64.exe`
- User Data: `%APPDATA%\Restaurant Management System\`
- Database: `%APPDATA%\Restaurant Management System\database\restaurant.db`
- Default Login: `admin` / `admin123`
