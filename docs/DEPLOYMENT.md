# Deployment Guide

Complete guide for deploying the Restaurant Management System to production.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Building for Production](#building-for-production)
4. [Packaging Desktop Application](#packaging-desktop-application)
5. [Server Deployment](#server-deployment)
6. [Database Setup](#database-setup)
7. [Network Configuration](#network-configuration)
8. [Security Hardening](#security-hardening)
9. [Backup Strategy](#backup-strategy)
10. [Monitoring and Maintenance](#monitoring-and-maintenance)
11. [Updating the Application](#updating-the-application)

---

## Pre-Deployment Checklist

Before deploying to production, ensure:

### Development Complete
- [ ] All features tested and working
- [ ] No critical bugs
- [ ] Code reviewed
- [ ] Documentation updated

### Configuration Ready
- [ ] Production environment variables prepared
- [ ] Database schema finalized
- [ ] Business information ready (name, logo, tax rate)
- [ ] Printer details available
- [ ] Network infrastructure planned

### Hardware Ready
- [ ] Server computer meets requirements
- [ ] Receipt printer available and tested
- [ ] iPad/tablets for customer ordering
- [ ] Network equipment (router, switches)
- [ ] Backup storage available

### Data Prepared
- [ ] Menu items and images ready
- [ ] Table layout planned
- [ ] User accounts planned
- [ ] Initial settings documented

---

## Environment Configuration

### Production Environment Variables

Create `.env` file in `packages/server/`:

```bash
# Server Configuration
NODE_ENV=production
SERVER_PORT=5000

# Database
DATABASE_URL="file:./prisma/production.db"
# For PostgreSQL:
# DATABASE_URL="postgresql://user:password@localhost:5432/restaurant_db"

# Authentication
JWT_SECRET="your-secure-random-secret-key-here"
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Business Settings
BUSINESS_NAME="Your Restaurant Name"
TAX_PERCENTAGE=10
CURRENCY="USD"

# Optional: Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### Security Best Practices

1. **Generate Strong JWT Secret**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Never Commit .env Files**
   - Add to `.gitignore`
   - Store securely
   - Use different secrets for dev/staging/production

3. **Restrict File Permissions**
   ```bash
   # Linux/Mac
   chmod 600 .env
   ```

---

## Building for Production

### 1. Clean Previous Builds

```bash
# Clean all packages
npm run clean

# Or manually
rm -rf packages/*/dist
rm -rf packages/*/.next
rm -rf packages/*/out
```

### 2. Install Dependencies

```bash
# Install production dependencies only
npm ci --production=false

# Or with all dependencies
npm install
```

### 3. Build Server

```bash
# Build Express server
npm run build:server

# Verify build
ls packages/server/dist
# Should see: index.js, app.js, etc.
```

### 4. Build PWA

```bash
# Build and copy PWA to server public directory
npm run setup:pwa

# Verify PWA files
ls packages/server/public
# Should see: index.html, menu.html, assets/, etc.
```

### 5. Build Desktop Application

```bash
# Production build
npm run build

# Or for specific environment
npm run build:dev      # Development
npm run build:staging  # Staging
```

### 6. Verify Builds

```bash
# Test server build
cd packages/server
node dist/index.js
# Should start without errors

# Test desktop build
cd packages/desktop
npm start
# Should launch application
```

---

## Packaging Desktop Application

### Windows

#### Prerequisites
- Windows 10 or later
- Node.js 20+
- Visual Studio Build Tools (for native modules)

#### Build Installer

```bash
# Package for Windows
npm run package:win

# Output location
packages/desktop/release/Restaurant Management System Setup [version].exe
```

#### Installer Options

Edit `packages/desktop/electron-builder.json`:

```json
{
  "win": {
    "target": ["nsis"],
    "icon": "build/icon.ico",
    "publisherName": "Your Company Name"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  }
}
```

#### Code Signing (Optional)

For trusted installer:

1. Obtain code signing certificate
2. Configure in `electron-builder.json`:
   ```json
   {
     "win": {
       "certificateFile": "path/to/cert.pfx",
       "certificatePassword": "password"
     }
   }
   ```

### macOS

#### Prerequisites
- macOS 10.15 or later
- Xcode Command Line Tools
- Apple Developer account (for signing)

#### Build DMG

```bash
# Package for macOS
npm run package:mac

# Output location
packages/desktop/release/Restaurant Management System-[version].dmg
```

#### Code Signing

1. **Get Developer ID Certificate**
   - Apple Developer Portal
   - Download and install certificate

2. **Configure Signing**
   ```json
   {
     "mac": {
       "identity": "Developer ID Application: Your Name (TEAM_ID)",
       "hardenedRuntime": true,
       "entitlements": "build/entitlements.mac.plist"
     }
   }
   ```

3. **Notarization** (Required for macOS 10.15+)
   ```json
   {
     "afterSign": "scripts/notarize.js"
   }
   ```

### Linux

```bash
# Package for Linux
npm run package:linux

# Output location
packages/desktop/release/restaurant-management-system-[version].AppImage
```

### Multi-Platform Build

```bash
# Build for all platforms (requires appropriate OS)
npm run package
```

---

## Server Deployment

### Option 1: Standalone Server (Recommended for Local)

The desktop application includes an embedded server, but you can also run a standalone server.

#### Setup

1. **Copy Server Files**
   ```bash
   # Copy built server to deployment location
   cp -r packages/server/dist /opt/rms-server/
   cp -r packages/server/prisma /opt/rms-server/
   cp -r packages/server/public /opt/rms-server/
   cp packages/server/package.json /opt/rms-server/
   ```

2. **Install Production Dependencies**
   ```bash
   cd /opt/rms-server
   npm ci --production
   ```

3. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

4. **Initialize Database**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

#### Running as Service

**Windows (NSSM)**

```powershell
# Install NSSM
choco install nssm

# Create service
nssm install RMSServer "C:\Program Files\nodejs\node.exe"
nssm set RMSServer AppDirectory "C:\opt\rms-server"
nssm set RMSServer AppParameters "dist\index.js"
nssm set RMSServer DisplayName "Restaurant Management Server"
nssm set RMSServer Description "RMS API Server"
nssm set RMSServer Start SERVICE_AUTO_START

# Start service
nssm start RMSServer
```

**Linux (systemd)**

Create `/etc/systemd/system/rms-server.service`:

```ini
[Unit]
Description=Restaurant Management Server
After=network.target

[Service]
Type=simple
User=rms
WorkingDirectory=/opt/rms-server
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable rms-server
sudo systemctl start rms-server
sudo systemctl status rms-server
```

**macOS (launchd)**

Create `~/Library/LaunchAgents/com.rms.server.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.rms.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/opt/rms-server/dist/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/opt/rms-server</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Load service:

```bash
launchctl load ~/Library/LaunchAgents/com.rms.server.plist
```

### Option 2: Cloud Deployment (Optional)

For multi-location or cloud-based deployment.

#### Requirements
- Cloud server (AWS, Azure, DigitalOcean, etc.)
- PostgreSQL database
- Domain name (optional)
- SSL certificate (recommended)

#### Steps

1. **Provision Server**
   - Ubuntu 22.04 LTS recommended
   - Minimum: 2 CPU, 4GB RAM, 20GB storage

2. **Install Dependencies**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install PostgreSQL
   sudo apt install -y postgresql postgresql-contrib
   ```

3. **Setup Database**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE restaurant_db;
   CREATE USER rms_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE restaurant_db TO rms_user;
   \q
   ```

4. **Deploy Application**
   ```bash
   # Upload files
   scp -r packages/server/dist user@server:/opt/rms-server/
   
   # SSH to server
   ssh user@server
   cd /opt/rms-server
   npm ci --production
   ```

5. **Configure Environment**
   ```bash
   DATABASE_URL="postgresql://rms_user:secure_password@localhost:5432/restaurant_db"
   ```

6. **Setup Nginx (Reverse Proxy)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. **Setup SSL (Let's Encrypt)**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

## Database Setup

### SQLite (Local Deployment)

**Advantages:**
- No separate database server needed
- Simple setup
- Good for single-location restaurants

**Setup:**

1. **Location**
   ```
   packages/server/prisma/production.db
   ```

2. **Initialize**
   ```bash
   cd packages/server
   npx prisma migrate deploy
   npx prisma db seed
   ```

3. **Backup Strategy**
   - Use built-in backup feature
   - Or copy database file regularly
   ```bash
   cp prisma/production.db backups/production-$(date +%Y%m%d).db
   ```

### PostgreSQL (Cloud/Multi-Location)

**Advantages:**
- Better performance for high traffic
- Concurrent connections
- Advanced features
- Cloud-ready

**Setup:**

1. **Install PostgreSQL**
   ```bash
   # Ubuntu
   sudo apt install postgresql
   
   # macOS
   brew install postgresql
   
   # Windows
   # Download from postgresql.org
   ```

2. **Create Database**
   ```sql
   CREATE DATABASE restaurant_db;
   CREATE USER rms_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE restaurant_db TO rms_user;
   ```

3. **Configure Connection**
   ```bash
   DATABASE_URL="postgresql://rms_user:secure_password@localhost:5432/restaurant_db"
   ```

4. **Run Migrations**
   ```bash
   npx prisma migrate deploy
   ```

5. **Backup Strategy**
   ```bash
   # Automated backup script
   pg_dump -U rms_user restaurant_db > backup-$(date +%Y%m%d).sql
   ```

---

## Network Configuration

### Local Network Setup

#### 1. Static IP Address

Assign static IP to server computer:

**Windows:**
1. Control Panel → Network and Sharing Center
2. Change adapter settings
3. Right-click adapter → Properties
4. IPv4 → Properties
5. Use the following IP address:
   - IP: 192.168.1.100 (example)
   - Subnet: 255.255.255.0
   - Gateway: 192.168.1.1

**macOS:**
1. System Preferences → Network
2. Select adapter → Advanced
3. TCP/IP tab
4. Configure IPv4: Manually
5. Enter IP address

**Linux:**
```bash
# Edit netplan config
sudo nano /etc/netplan/01-netcfg.yaml

network:
  version: 2
  ethernets:
    eth0:
      addresses: [192.168.1.100/24]
      gateway4: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]

sudo netplan apply
```

#### 2. Firewall Configuration

**Windows:**
```powershell
# Allow port 5000
New-NetFirewallRule -DisplayName "RMS Server" -Direction Inbound -Port 5000 -Protocol TCP -Action Allow
```

**macOS:**
```bash
# Add firewall rule
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
```

**Linux:**
```bash
# UFW
sudo ufw allow 5000/tcp
sudo ufw enable

# iptables
sudo iptables -A INPUT -p tcp --dport 5000 -j ACCEPT
```

#### 3. Router Configuration

- **Port Forwarding**: Not needed for local network
- **DHCP Reservation**: Reserve IP for server MAC address
- **AP Isolation**: Ensure disabled (prevents device communication)

### WiFi Network

#### Requirements
- Strong signal coverage in restaurant
- 5GHz band recommended for iPads
- Separate guest network (optional)

#### Setup
1. Configure WiFi with strong password
2. Ensure all devices (server, iPads) on same network
3. Test connectivity from all table locations
4. Consider WiFi extenders for large spaces

### QR Code URLs

After network setup, generate QR codes with correct IP:

```bash
# Update server URL in settings
# Regenerate QR codes
npm run setup:pwa

# Or in application
# Settings → Server & QR → Generate All QR Codes
```

QR codes will point to:
```
http://192.168.1.100:5000/?table=1
http://192.168.1.100:5000/?table=2
...
```

---

## Security Hardening

### Application Security

1. **Change Default Credentials**
   - Change admin password immediately
   - Use strong passwords (12+ characters)
   - Enable password complexity requirements

2. **JWT Secret**
   - Use cryptographically secure random string
   - Never reuse across environments
   - Rotate periodically

3. **Environment Variables**
   - Never commit to version control
   - Restrict file permissions
   - Use secrets management for cloud

4. **Input Validation**
   - Already implemented in application
   - Verify no custom modifications bypass validation

5. **SQL Injection Protection**
   - Prisma ORM provides protection
   - Never use raw SQL queries

### Network Security

1. **Firewall**
   - Only allow necessary ports
   - Block external access if local-only

2. **WiFi Security**
   - WPA3 or WPA2 encryption
   - Strong password
   - Hide SSID (optional)
   - MAC filtering (optional)

3. **Physical Security**
   - Secure server computer
   - Protect network equipment
   - Secure printer access

### Data Security

1. **Encryption at Rest**
   - Enable disk encryption
   - Windows: BitLocker
   - macOS: FileVault
   - Linux: LUKS

2. **Encryption in Transit**
   - HTTPS for cloud deployments
   - Local network: HTTP acceptable

3. **Backup Encryption**
   - Encrypt backup files
   - Store securely
   - Test restoration regularly

### Access Control

1. **User Roles**
   - Assign minimum necessary permissions
   - Regular audit of user accounts
   - Remove inactive users

2. **Session Management**
   - 24-hour token expiration
   - Automatic logout on inactivity
   - Single session per user (optional)

3. **Audit Logging**
   - Log all critical operations
   - Review logs regularly
   - Retain logs per compliance requirements

---

## Backup Strategy

### Automated Backups

#### Daily Backup Script

**Windows (PowerShell):**

```powershell
# backup-daily.ps1
$date = Get-Date -Format "yyyyMMdd"
$source = "C:\opt\rms-server\prisma\production.db"
$dest = "C:\backups\rms\daily\production-$date.db"

Copy-Item $source $dest

# Keep only last 7 days
Get-ChildItem "C:\backups\rms\daily" | 
    Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} | 
    Remove-Item
```

Schedule with Task Scheduler:
```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\scripts\backup-daily.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "RMS Daily Backup"
```

**Linux (Bash):**

```bash
#!/bin/bash
# backup-daily.sh

DATE=$(date +%Y%m%d)
SOURCE="/opt/rms-server/prisma/production.db"
DEST="/backups/rms/daily/production-$DATE.db"

cp "$SOURCE" "$DEST"

# Keep only last 7 days
find /backups/rms/daily -name "*.db" -mtime +7 -delete
```

Schedule with cron:
```bash
# Edit crontab
crontab -e

# Add line (runs at 2 AM daily)
0 2 * * * /scripts/backup-daily.sh
```

### Backup Locations

**Local Backups:**
- Primary: External hard drive
- Secondary: Network attached storage (NAS)

**Cloud Backups:**
- Google Drive
- Dropbox
- AWS S3
- Azure Blob Storage

### Backup Retention

- **Daily**: Keep 7 days
- **Weekly**: Keep 4 weeks
- **Monthly**: Keep 12 months
- **Yearly**: Keep indefinitely

### Testing Backups

**Monthly Test:**
1. Restore backup to test environment
2. Verify data integrity
3. Test application functionality
4. Document results

---

## Monitoring and Maintenance

### Health Monitoring

#### Application Health

Check health endpoint:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "services": {
    "database": "up",
    "printer": "connected",
    "websocket": "active"
  }
}
```

#### System Monitoring

**Windows:**
- Task Manager → Performance
- Resource Monitor
- Event Viewer

**Linux:**
```bash
# CPU and Memory
htop

# Disk usage
df -h

# Service status
systemctl status rms-server

# Logs
journalctl -u rms-server -f
```

### Log Management

#### Log Locations

- **Server**: `packages/server/logs/`
- **Desktop**: OS-specific (see Troubleshooting Guide)

#### Log Rotation

**Linux (logrotate):**

```
/opt/rms-server/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 rms rms
    sharedscripts
    postrotate
        systemctl reload rms-server
    endscript
}
```

### Performance Monitoring

**Metrics to Track:**
- Response time
- Database query time
- Memory usage
- Disk space
- Network latency

**Tools:**
- Built-in health endpoint
- System monitoring tools
- Custom monitoring scripts

### Maintenance Schedule

**Daily:**
- Check application status
- Verify backups completed
- Review error logs

**Weekly:**
- Check disk space
- Review performance metrics
- Update menu items

**Monthly:**
- Test backup restoration
- Review user accounts
- Check for updates
- Optimize database

**Quarterly:**
- Security audit
- Performance review
- Hardware inspection
- Staff training refresh

---

## Updating the Application

### Update Process

1. **Backup Current Version**
   ```bash
   # Backup database
   # Backup configuration files
   # Document current version
   ```

2. **Download New Version**
   - From release page
   - Or build from source

3. **Test in Staging**
   - Install on test system
   - Verify functionality
   - Test data migration

4. **Schedule Downtime**
   - Choose low-traffic time
   - Notify staff
   - Prepare rollback plan

5. **Perform Update**
   ```bash
   # Stop application
   # Install new version
   # Run database migrations
   # Start application
   # Verify functionality
   ```

6. **Verify Update**
   - Check version number
   - Test critical features
   - Monitor for errors

### Database Migrations

```bash
# Backup database first!

# Run migrations
cd packages/server
npx prisma migrate deploy

# Verify
npx prisma studio
```

### Rollback Plan

If update fails:

1. **Stop Application**
2. **Restore Database Backup**
3. **Reinstall Previous Version**
4. **Restart Application**
5. **Verify Functionality**
6. **Document Issues**

### Auto-Update (Desktop App)

Configure in `electron-builder.json`:

```json
{
  "publish": {
    "provider": "github",
    "owner": "your-org",
    "repo": "restaurant-management-system"
  }
}
```

Application will check for updates on launch.

---

## Production Checklist

Before going live:

### Configuration
- [ ] Environment variables set
- [ ] JWT secret generated
- [ ] Database initialized
- [ ] Business information configured
- [ ] Tax rate set correctly

### Network
- [ ] Static IP assigned
- [ ] Firewall configured
- [ ] WiFi network setup
- [ ] QR codes generated and printed
- [ ] Network tested from all locations

### Hardware
- [ ] Server computer configured
- [ ] Printer connected and tested
- [ ] iPads configured
- [ ] Backup storage ready

### Data
- [ ] Menu items added
- [ ] Tables created
- [ ] User accounts created
- [ ] Default password changed
- [ ] Sample data removed

### Security
- [ ] Strong passwords set
- [ ] Firewall enabled
- [ ] Backups configured
- [ ] Access controls verified

### Testing
- [ ] All features tested
- [ ] Order flow tested end-to-end
- [ ] Payment processing tested
- [ ] Printer tested
- [ ] PWA tested from iPads
- [ ] Real-time updates verified

### Documentation
- [ ] Staff trained
- [ ] User manual provided
- [ ] Troubleshooting guide available
- [ ] Support contact documented

### Backup
- [ ] Backup system tested
- [ ] Backup schedule configured
- [ ] Restoration tested
- [ ] Off-site backup configured

---

## Support and Resources

### Documentation
- [User Manual](./USER_MANUAL.md)
- [API Documentation](./API.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

### Support
- Email: support@rms-system.com
- Documentation: docs folder
- GitHub: Report issues

### Training
- Provide staff training
- Create custom guides
- Schedule refresher sessions

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**For**: Restaurant Management System v1.0
