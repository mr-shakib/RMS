# Troubleshooting Guide

Common issues and solutions for the Restaurant Management System.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Server Issues](#server-issues)
3. [Database Issues](#database-issues)
4. [Printer Connection Issues](#printer-connection-issues)
5. [Network and Connectivity Issues](#network-and-connectivity-issues)
6. [PWA Issues](#pwa-issues)
7. [Desktop Application Issues](#desktop-application-issues)
8. [Performance Issues](#performance-issues)
9. [Data Issues](#data-issues)
10. [Error Messages](#error-messages)

---

## Installation Issues

### Issue: npm install fails

**Symptoms:**
- Error messages during `npm install`
- Missing dependencies
- Build failures

**Solutions:**

1. **Check Node.js version**
   ```bash
   node --version  # Should be >= 20.0.0
   npm --version   # Should be >= 10.0.0
   ```

2. **Clear npm cache**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Use correct npm registry**
   ```bash
   npm config set registry https://registry.npmjs.org/
   ```

4. **Check for permission issues**
   - Windows: Run terminal as Administrator
   - Mac/Linux: Use `sudo` if needed (not recommended)
   - Better: Fix npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally

---

### Issue: Prisma generate fails

**Symptoms:**
- Error: "Prisma Client could not be generated"
- Database connection errors

**Solutions:**

1. **Generate Prisma client manually**
   ```bash
   npm run prisma:generate --workspace=packages/server
   ```

2. **Check Prisma schema**
   - Verify `packages/server/prisma/schema.prisma` exists
   - Check for syntax errors in schema

3. **Delete and regenerate**
   ```bash
   rm -rf packages/server/node_modules/.prisma
   npm run prisma:generate --workspace=packages/server
   ```

---

## Server Issues

### Issue: Server won't start

**Symptoms:**
- Error: "Port already in use"
- Server crashes on startup
- "Cannot find module" errors

**Solutions:**

1. **Port already in use**
   ```bash
   # Windows
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   
   # Mac/Linux
   lsof -i :5000
   kill -9 <PID>
   ```

2. **Change server port**
   - Create `.env` file in `packages/server/`
   ```bash
   SERVER_PORT=5001
   ```

3. **Check for missing dependencies**
   ```bash
   cd packages/server
   npm install
   ```

4. **Rebuild server**
   ```bash
   npm run build:server
   ```

---

### Issue: Server starts but crashes immediately

**Symptoms:**
- Server starts then exits
- Database connection errors
- "ECONNREFUSED" errors

**Solutions:**

1. **Check database file**
   - Verify `packages/server/prisma/dev.db` exists
   - If missing, run migrations:
   ```bash
   npm run prisma:migrate --workspace=packages/server
   ```

2. **Check environment variables**
   - Verify `.env` file in `packages/server/`
   - Ensure `DATABASE_URL` is correct

3. **Check logs**
   ```bash
   npm run dev:server
   # Read error messages carefully
   ```

4. **Reset database** (WARNING: Deletes all data)
   ```bash
   cd packages/server
   npx prisma migrate reset
   npm run prisma:seed
   ```

---

### Issue: API endpoints return 500 errors

**Symptoms:**
- All API calls fail
- "Internal Server Error" messages
- Server logs show errors

**Solutions:**

1. **Check server logs**
   - Look for specific error messages
   - Check database connection

2. **Verify Prisma client**
   ```bash
   npm run prisma:generate --workspace=packages/server
   ```

3. **Check database integrity**
   ```bash
   npm run prisma:studio --workspace=packages/server
   # Verify data looks correct
   ```

4. **Restart server**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev:server
   ```

---

## Database Issues

### Issue: Database locked error

**Symptoms:**
- Error: "database is locked"
- Operations timeout
- SQLite errors

**Solutions:**

1. **Close other connections**
   - Close Prisma Studio if open
   - Stop any other processes accessing database

2. **Restart application**
   - Close desktop app
   - Stop server
   - Restart both

3. **Check file permissions**
   - Ensure database file is writable
   - Windows: Check file properties
   - Mac/Linux: `chmod 644 packages/server/prisma/dev.db`

---

### Issue: Migration fails

**Symptoms:**
- Error during `prisma migrate`
- Schema changes not applied
- Database out of sync

**Solutions:**

1. **Check migration status**
   ```bash
   cd packages/server
   npx prisma migrate status
   ```

2. **Resolve migration conflicts**
   ```bash
   npx prisma migrate resolve --applied <migration_name>
   ```

3. **Reset and re-migrate** (WARNING: Deletes data)
   ```bash
   npx prisma migrate reset
   npx prisma migrate dev
   ```

4. **Manual migration**
   - Backup database first
   - Apply schema changes manually
   - Mark migration as applied

---

### Issue: Data corruption

**Symptoms:**
- Missing data
- Incorrect relationships
- Foreign key errors

**Solutions:**

1. **Restore from backup**
   - Go to Settings → Backup
   - Click "Restore Backup"
   - Select recent backup file

2. **Check data integrity**
   ```bash
   npm run prisma:studio --workspace=packages/server
   # Manually inspect data
   ```

3. **Re-seed database** (if using sample data)
   ```bash
   npm run prisma:seed --workspace=packages/server
   ```

---

## Printer Connection Issues

### Issue: Printer not detected

**Symptoms:**
- "Printer not found" error
- Test print fails
- No printers in dropdown

**Solutions:**

1. **Check printer power and connection**
   - Ensure printer is powered on
   - Check USB cable connection
   - Verify network cable (for network printers)

2. **Network printer troubleshooting**
   - Ping printer IP address:
   ```bash
   ping 192.168.1.50
   ```
   - Verify printer is on same network
   - Check printer IP hasn't changed

3. **USB printer troubleshooting**
   - Try different USB port
   - Check USB cable
   - Verify printer drivers installed
   - Windows: Check Device Manager
   - Mac: Check System Preferences → Printers

4. **Restart printer**
   - Power off printer
   - Wait 30 seconds
   - Power on printer
   - Try test print again

---

### Issue: Print jobs fail

**Symptoms:**
- Receipts don't print
- Partial prints
- Garbled output

**Solutions:**

1. **Check printer settings**
   - Go to Settings → Printer
   - Verify printer type (Network/USB/Serial)
   - Verify connection details
   - Run test print

2. **Check ESC/POS compatibility**
   - Ensure printer supports ESC/POS protocol
   - Check printer manual
   - Try different printer model setting

3. **Check paper**
   - Ensure paper is loaded correctly
   - Check paper isn't jammed
   - Verify paper roll isn't empty

4. **Restart printer service**
   - Restart application
   - Printer connection reestablished

5. **Update printer firmware**
   - Check manufacturer website
   - Download latest firmware
   - Follow update instructions

---

### Issue: Receipts print but look wrong

**Symptoms:**
- Formatting issues
- Missing information
- Wrong font size

**Solutions:**

1. **Check receipt template**
   - Verify business logo uploaded
   - Check business information in Settings

2. **Adjust printer settings**
   - Some printers have different character widths
   - May need to adjust template

3. **Check paper width**
   - Standard: 80mm
   - Some printers use 58mm
   - Adjust template accordingly

---

## Network and Connectivity Issues

### Issue: Can't access PWA from iPad

**Symptoms:**
- "Can't connect to server" error
- Page won't load
- Timeout errors

**Solutions:**

1. **Verify devices on same network**
   - Check iPad WiFi settings
   - Ensure connected to same network as server
   - Check network name matches

2. **Check server IP address**
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```
   - Find IPv4 address (e.g., 192.168.1.100)
   - Use this IP in PWA URL

3. **Check firewall**
   - Windows: Allow Node.js through firewall
   - Mac: System Preferences → Security → Firewall
   - Allow incoming connections on port 5000

4. **Test connection**
   - From iPad, open Safari
   - Navigate to: `http://[SERVER_IP]:5000`
   - Should see PWA menu

5. **Regenerate QR codes**
   - If IP address changed
   - Go to Settings → Server & QR
   - Click "Generate All QR Codes"
   - Download and print new codes

---

### Issue: Firewall blocking connections

**Symptoms:**
- Works on server computer
- Doesn't work from other devices
- Connection refused errors

**Solutions:**

1. **Windows Firewall**
   ```powershell
   # Run as Administrator
   New-NetFirewallRule -DisplayName "RMS Server" -Direction Inbound -Port 5000 -Protocol TCP -Action Allow
   ```

2. **Mac Firewall**
   - System Preferences → Security & Privacy → Firewall
   - Click "Firewall Options"
   - Add Node.js to allowed apps

3. **Third-party firewall**
   - Check antivirus software
   - Add exception for port 5000
   - Allow Node.js application

4. **Router settings**
   - Check router firewall
   - Ensure local network traffic allowed
   - Check AP isolation settings

---

### Issue: WebSocket connection fails

**Symptoms:**
- Real-time updates don't work
- Orders don't appear automatically
- "Connection lost" messages

**Solutions:**

1. **Check server status**
   - Ensure server is running
   - Check server logs for errors

2. **Check browser console**
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Look for WebSocket errors

3. **Verify WebSocket support**
   - Ensure browser supports WebSockets
   - Update browser if needed

4. **Check proxy/firewall**
   - Some proxies block WebSockets
   - Try direct connection
   - Configure proxy to allow WebSockets

5. **Restart application**
   - Close desktop app
   - Stop server
   - Restart both

---

## PWA Issues

### Issue: PWA won't load

**Symptoms:**
- Blank screen
- "Cannot GET /" error
- 404 errors

**Solutions:**

1. **Rebuild PWA**
   ```bash
   npm run setup:pwa
   ```

2. **Check PWA files**
   - Verify `packages/server/public/` contains PWA files
   - Should have: index.html, menu.html, etc.

3. **Clear browser cache**
   - iPad Safari: Settings → Safari → Clear History and Website Data
   - Try accessing PWA again

4. **Check server logs**
   - Look for file serving errors
   - Verify static file middleware working

---

### Issue: Menu items don't load

**Symptoms:**
- Empty menu
- Loading spinner forever
- API errors

**Solutions:**

1. **Check API endpoint**
   - Open browser DevTools
   - Check Network tab
   - Look for `/menu` request
   - Check response

2. **Verify menu items exist**
   - Login to desktop app
   - Go to Menu Management
   - Ensure items exist and are available

3. **Check CORS settings**
   - Server logs may show CORS errors
   - Verify CORS configured correctly

4. **Test API directly**
   ```bash
   curl http://localhost:5000/menu
   # Should return JSON with menu items
   ```

---

### Issue: Orders not submitting

**Symptoms:**
- "Order failed" message
- Orders stuck in cart
- Network errors

**Solutions:**

1. **Check network connection**
   - Verify iPad has internet/network access
   - Try loading other websites

2. **Check server status**
   - Ensure server is running
   - Check server logs

3. **Check offline queue**
   - Orders may be queued if offline
   - Will submit when connection restored

4. **Clear PWA cache**
   - Safari: Settings → Safari → Advanced → Website Data
   - Remove RMS website data
   - Reload PWA

---

### Issue: Service worker errors

**Symptoms:**
- "Service worker registration failed"
- Offline mode not working
- Cache errors

**Solutions:**

1. **Check HTTPS requirement**
   - Service workers require HTTPS (except localhost)
   - For local network, this is expected
   - Offline features may be limited

2. **Unregister service worker**
   - Browser DevTools → Application → Service Workers
   - Click "Unregister"
   - Reload page

3. **Rebuild PWA**
   ```bash
   npm run setup:pwa
   ```

---

## Desktop Application Issues

### Issue: Desktop app won't start

**Symptoms:**
- Application crashes on launch
- White screen
- Error dialog

**Solutions:**

1. **Check server status**
   - Desktop app requires server
   - Start server first:
   ```bash
   npm run dev:server
   ```

2. **Clear application cache**
   - Windows: `%APPDATA%/restaurant-management-system`
   - Mac: `~/Library/Application Support/restaurant-management-system`
   - Delete cache folder
   - Restart app

3. **Check logs**
   - Windows: `%APPDATA%/restaurant-management-system/logs`
   - Mac: `~/Library/Logs/restaurant-management-system`
   - Review error messages

4. **Reinstall application**
   - Uninstall current version
   - Download latest installer
   - Install fresh copy

---

### Issue: Login fails

**Symptoms:**
- "Invalid credentials" error
- Can't login with correct password
- Authentication errors

**Solutions:**

1. **Verify credentials**
   - Default: admin / admin123
   - Check for typos
   - Check Caps Lock

2. **Reset admin password**
   ```bash
   cd packages/server
   npx prisma studio
   # Manually update user password hash
   ```

3. **Check database**
   - Ensure users table has data
   - Run seed if needed:
   ```bash
   npm run prisma:seed --workspace=packages/server
   ```

4. **Check JWT secret**
   - Verify `JWT_SECRET` in `.env`
   - Restart server after changes

---

### Issue: Pages not loading

**Symptoms:**
- Blank pages
- Loading spinner forever
- Navigation doesn't work

**Solutions:**

1. **Check API connection**
   - Verify server is running
   - Check browser console for errors

2. **Clear React Query cache**
   - Logout and login again
   - Cache will be cleared

3. **Check authentication**
   - Token may have expired
   - Logout and login again

4. **Restart application**
   - Close desktop app
   - Restart

---

## Performance Issues

### Issue: Application is slow

**Symptoms:**
- Slow page loads
- Laggy interface
- Delayed updates

**Solutions:**

1. **Check database size**
   - Large databases can slow queries
   - Archive old orders
   - Optimize database:
   ```bash
   cd packages/server
   sqlite3 prisma/dev.db "VACUUM;"
   ```

2. **Check system resources**
   - Task Manager (Windows) / Activity Monitor (Mac)
   - Ensure sufficient RAM available
   - Close unnecessary applications

3. **Optimize images**
   - Large menu images slow loading
   - Compress images before upload
   - Recommended: < 500KB per image

4. **Clear cache**
   - Desktop app cache
   - Browser cache (for PWA)

---

### Issue: Real-time updates delayed

**Symptoms:**
- Orders appear late
- Status updates slow
- WebSocket lag

**Solutions:**

1. **Check network latency**
   - Ping server from client device
   - High latency causes delays

2. **Check server load**
   - Too many concurrent connections
   - Consider upgrading hardware

3. **Restart WebSocket server**
   - Restart server application
   - Reconnect clients

---

## Data Issues

### Issue: Orders missing

**Symptoms:**
- Orders disappeared
- Can't find specific order
- Order history incomplete

**Solutions:**

1. **Check filters**
   - Ensure "All" status selected
   - Clear search box
   - Check date range

2. **Check database**
   ```bash
   npm run prisma:studio --workspace=packages/server
   # Manually search orders table
   ```

3. **Restore from backup**
   - If data truly lost
   - Settings → Backup → Restore

---

### Issue: Incorrect calculations

**Symptoms:**
- Wrong totals
- Tax calculated incorrectly
- Discount not applied

**Solutions:**

1. **Check tax percentage**
   - Settings → Business
   - Verify tax percentage correct

2. **Check order details**
   - View order in Prisma Studio
   - Verify subtotal, tax, discount fields

3. **Recalculate order**
   - Edit order
   - Update any item
   - Save (triggers recalculation)

---

## Error Messages

### "EADDRINUSE: address already in use"

**Cause:** Port 5000 is already in use by another application.

**Solution:**
1. Kill process using port 5000 (see Server Issues)
2. Or change port in `.env` file

---

### "Cannot find module '@prisma/client'"

**Cause:** Prisma client not generated.

**Solution:**
```bash
npm run prisma:generate --workspace=packages/server
```

---

### "JWT malformed" or "Invalid token"

**Cause:** Authentication token invalid or expired.

**Solution:**
1. Logout and login again
2. Clear browser cookies
3. Check JWT_SECRET in `.env`

---

### "Foreign key constraint failed"

**Cause:** Trying to delete record that's referenced by other records.

**Solution:**
1. Delete dependent records first
2. Or use cascade delete (check schema)

---

### "SQLITE_BUSY: database is locked"

**Cause:** Multiple processes accessing database simultaneously.

**Solution:**
1. Close Prisma Studio
2. Restart application
3. Ensure only one server instance running

---

### "Network request failed"

**Cause:** Can't connect to server.

**Solution:**
1. Check server is running
2. Verify network connection
3. Check firewall settings
4. Verify correct IP address/URL

---

## Getting Additional Help

### Collecting Debug Information

When reporting issues, include:

1. **System Information**
   - Operating System and version
   - Node.js version (`node --version`)
   - npm version (`npm --version`)

2. **Error Messages**
   - Full error text
   - Stack traces
   - Console logs

3. **Steps to Reproduce**
   - What you were doing
   - What you expected
   - What actually happened

4. **Logs**
   - Server logs
   - Desktop app logs
   - Browser console logs

### Log Locations

**Server Logs:**
- Console output when running `npm run dev:server`

**Desktop App Logs:**
- Windows: `%APPDATA%/restaurant-management-system/logs`
- Mac: `~/Library/Logs/restaurant-management-system`
- Linux: `~/.config/restaurant-management-system/logs`

**Browser Logs:**
- Open DevTools (F12)
- Console tab
- Copy all messages

### Support Channels

- **Email**: support@rms-system.com
- **Documentation**: Check docs folder
- **GitHub Issues**: Report bugs and request features

---

## Preventive Maintenance

### Regular Tasks

**Daily:**
- Create database backup
- Check printer paper
- Verify all devices connected

**Weekly:**
- Review error logs
- Check disk space
- Update menu items as needed

**Monthly:**
- Archive old orders
- Review and optimize database
- Check for application updates
- Test backup restoration

### Best Practices

1. **Always backup before major changes**
2. **Test in development before production**
3. **Keep system updated**
4. **Monitor disk space**
5. **Train staff on proper usage**
6. **Document custom configurations**
7. **Keep network equipment maintained**

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**For**: Restaurant Management System v1.0
