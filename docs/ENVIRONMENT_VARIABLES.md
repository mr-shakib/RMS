# Environment Variables

Complete reference for all environment variables used in the Restaurant Management System.

## Overview

The application uses environment variables for configuration. These are stored in `.env` files in each package directory.

## Server Environment Variables

Location: `packages/server/.env`

### Required Variables

#### NODE_ENV
- **Description**: Application environment
- **Type**: String
- **Values**: `development`, `staging`, `production`
- **Default**: `development`
- **Example**: `NODE_ENV=production`

**Usage:**
- Controls logging level
- Enables/disables debug features
- Affects error messages shown to users

---

#### SERVER_PORT
- **Description**: Port number for Express server
- **Type**: Number
- **Range**: 1024-65535
- **Default**: `5000`
- **Example**: `SERVER_PORT=5000`

**Usage:**
- Server listens on this port
- PWA URLs use this port
- Must be open in firewall

**Notes:**
- Ports below 1024 require admin privileges
- Ensure port is not in use by another application
- Update QR codes if port changes

---

#### DATABASE_URL
- **Description**: Database connection string
- **Type**: String (Connection URL)
- **Default**: `file:./prisma/dev.db`
- **Examples**:
  ```bash
  # SQLite (local)
  DATABASE_URL="file:./prisma/production.db"
  
  # PostgreSQL (cloud)
  DATABASE_URL="postgresql://user:password@localhost:5432/restaurant_db"
  
  # PostgreSQL with SSL
  DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"
  ```

**Usage:**
- Prisma ORM connection
- Determines database type and location

**Format:**
- SQLite: `file:./path/to/database.db`
- PostgreSQL: `postgresql://[user]:[password]@[host]:[port]/[database]`

---

#### JWT_SECRET
- **Description**: Secret key for JWT token signing
- **Type**: String (minimum 32 characters)
- **Default**: `your-secret-key-change-in-production` (⚠️ INSECURE)
- **Example**: `JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

**Usage:**
- Signs authentication tokens
- Verifies token authenticity
- Critical for security

**Generation:**
```bash
# Generate secure random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Security:**
- ⚠️ **MUST** change in production
- Never commit to version control
- Use different secrets for dev/staging/production
- Changing this invalidates all existing tokens

---

### Optional Variables

#### BUSINESS_NAME
- **Description**: Restaurant name
- **Type**: String
- **Default**: None (set via UI)
- **Example**: `BUSINESS_NAME="Joe's Restaurant"`

**Usage:**
- Displayed on receipts
- Shown in application header
- Can be set via Settings UI

---

#### TAX_PERCENTAGE
- **Description**: Default tax rate
- **Type**: Number (percentage)
- **Range**: 0-100
- **Default**: `0`
- **Example**: `TAX_PERCENTAGE=10`

**Usage:**
- Applied to all orders
- Can be overridden per order
- Can be set via Settings UI

---

#### CURRENCY
- **Description**: Currency code
- **Type**: String (ISO 4217)
- **Default**: `USD`
- **Example**: `CURRENCY=EUR`

**Common Values:**
- `USD` - US Dollar
- `EUR` - Euro
- `GBP` - British Pound
- `JPY` - Japanese Yen
- `CAD` - Canadian Dollar

---

#### LOG_LEVEL
- **Description**: Logging verbosity
- **Type**: String
- **Values**: `error`, `warn`, `info`, `debug`
- **Default**: `info`
- **Example**: `LOG_LEVEL=debug`

**Levels:**
- `error`: Only errors
- `warn`: Errors and warnings
- `info`: Normal operations (recommended)
- `debug`: Detailed debugging information

---

#### LOG_FILE
- **Description**: Log file path
- **Type**: String (file path)
- **Default**: None (console only)
- **Example**: `LOG_FILE=./logs/app.log`

**Usage:**
- Enables file logging
- Logs written to specified file
- Useful for production debugging

---

#### CORS_ORIGINS
- **Description**: Allowed CORS origins
- **Type**: String (comma-separated URLs)
- **Default**: `http://localhost:3000,http://localhost:5000`
- **Example**: `CORS_ORIGINS=http://localhost:3000,http://192.168.1.100:5000`

**Usage:**
- Controls which origins can access API
- Automatically includes localhost and LAN IPs in development

---

#### PRINTER_TYPE
- **Description**: Default printer type
- **Type**: String
- **Values**: `network`, `usb`, `serial`
- **Default**: None (set via UI)
- **Example**: `PRINTER_TYPE=network`

**Usage:**
- Pre-configures printer type
- Can be overridden via Settings UI

---

#### PRINTER_ADDRESS
- **Description**: Printer connection address
- **Type**: String
- **Format**: Depends on printer type
- **Examples**:
  ```bash
  # Network printer
  PRINTER_ADDRESS=192.168.1.50:9100
  
  # USB printer (vendor:product ID)
  PRINTER_ADDRESS=0x04b8:0x0e15
  
  # Serial printer
  PRINTER_ADDRESS=COM3
  ```

---

## Desktop Environment Variables

Location: `packages/desktop/.env.local` (optional)

### NEXT_PUBLIC_API_URL
- **Description**: API server URL
- **Type**: String (URL)
- **Default**: `http://localhost:5000`
- **Example**: `NEXT_PUBLIC_API_URL=http://192.168.1.100:5000`

**Usage:**
- Next.js frontend API calls
- Must be accessible from desktop app

**Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to browser.

---

### NEXT_PUBLIC_WS_URL
- **Description**: WebSocket server URL
- **Type**: String (URL)
- **Default**: `ws://localhost:5000`
- **Example**: `NEXT_PUBLIC_WS_URL=ws://192.168.1.100:5000`

**Usage:**
- WebSocket connection for real-time updates

---

## PWA Environment Variables

Location: `packages/pwa/.env` (generated by setup script)

### VITE_API_URL
- **Description**: API server URL for PWA
- **Type**: String (URL)
- **Default**: Auto-detected by setup script
- **Example**: `VITE_API_URL=http://192.168.1.100:5000`

**Usage:**
- PWA API calls
- Set automatically by `npm run setup:pwa`

**Note:** Variables prefixed with `VITE_` are exposed to browser.

---

## Environment Files

### File Locations

```
restaurant-management-system/
├── packages/
│   ├── server/
│   │   ├── .env                 # Server configuration
│   │   └── .env.example         # Template (if exists)
│   ├── desktop/
│   │   └── .env.local           # Desktop configuration (optional)
│   └── pwa/
│       └── .env                 # PWA configuration (auto-generated)
```

### File Priority

1. `.env.local` - Local overrides (not committed)
2. `.env.[environment]` - Environment-specific (e.g., `.env.production`)
3. `.env` - Default configuration

### Security Best Practices

1. **Never Commit Secrets**
   ```bash
   # Add to .gitignore
   .env
   .env.local
   .env.*.local
   ```

2. **Use .env.example**
   ```bash
   # Create template without secrets
   cp .env .env.example
   # Remove sensitive values from .env.example
   # Commit .env.example to repository
   ```

3. **Restrict Permissions**
   ```bash
   # Linux/Mac
   chmod 600 .env
   
   # Windows
   # Right-click → Properties → Security
   # Remove all users except owner
   ```

4. **Different Secrets Per Environment**
   - Development: Can use simple secrets
   - Staging: Use production-like secrets
   - Production: Use strong, unique secrets

---

## Configuration Examples

### Development Environment

`packages/server/.env`:
```bash
NODE_ENV=development
SERVER_PORT=5000
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="dev-secret-key-not-for-production"
LOG_LEVEL=debug
```

### Staging Environment

`packages/server/.env`:
```bash
NODE_ENV=staging
SERVER_PORT=5000
DATABASE_URL="file:./prisma/staging.db"
JWT_SECRET="staging-secret-key-different-from-prod"
LOG_LEVEL=info
LOG_FILE=./logs/staging.log
```

### Production Environment (Local)

`packages/server/.env`:
```bash
NODE_ENV=production
SERVER_PORT=5000
DATABASE_URL="file:./prisma/production.db"
JWT_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
LOG_LEVEL=info
LOG_FILE=./logs/production.log
BUSINESS_NAME="My Restaurant"
TAX_PERCENTAGE=10
CURRENCY=USD
```

### Production Environment (Cloud)

`packages/server/.env`:
```bash
NODE_ENV=production
SERVER_PORT=5000
DATABASE_URL="postgresql://rms_user:secure_password@localhost:5432/restaurant_db"
JWT_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
LOG_LEVEL=warn
LOG_FILE=./logs/production.log
CORS_ORIGINS=https://restaurant.example.com
```

---

## Loading Environment Variables

### Server (Node.js)

The server uses `dotenv` package to load variables:

```typescript
// Automatically loaded in packages/server/src/index.ts
import dotenv from 'dotenv';
dotenv.config();

// Access variables
const port = process.env.SERVER_PORT || 5000;
const jwtSecret = process.env.JWT_SECRET;
```

### Desktop (Next.js)

Next.js automatically loads environment variables:

```typescript
// Access in components
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

### PWA (Vite)

Vite loads variables prefixed with `VITE_`:

```typescript
// Access in code
const apiUrl = import.meta.env.VITE_API_URL;
```

---

## Troubleshooting

### Variables Not Loading

**Problem:** Environment variables not being read

**Solutions:**

1. **Check file location**
   - Must be in package root directory
   - Correct filename (`.env`, not `env.txt`)

2. **Check file format**
   ```bash
   # Correct
   KEY=value
   
   # Incorrect
   KEY = value  # No spaces around =
   KEY="value"  # Quotes optional, but okay
   export KEY=value  # No export keyword
   ```

3. **Restart application**
   - Environment variables loaded on startup
   - Must restart after changes

4. **Check for typos**
   - Variable names are case-sensitive
   - `SERVER_PORT` ≠ `server_port`

---

### Variables Not Updating

**Problem:** Changed variables but no effect

**Solutions:**

1. **Restart application**
   - Stop server/desktop app
   - Start again

2. **Clear build cache**
   ```bash
   npm run clean
   npm run build
   ```

3. **Check correct environment**
   - Verify loading correct `.env` file
   - Check `NODE_ENV` value

---

### Security Warnings

**Problem:** Using default/weak secrets

**Solutions:**

1. **Generate strong secrets**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Change default values**
   - Never use `your-secret-key-change-in-production`
   - Never use `admin123` password

3. **Use environment-specific secrets**
   - Different secrets for dev/staging/production

---

## Environment Variable Checklist

Before deployment:

- [ ] `NODE_ENV` set to `production`
- [ ] `SERVER_PORT` configured correctly
- [ ] `DATABASE_URL` points to production database
- [ ] `JWT_SECRET` is strong and unique
- [ ] Default passwords changed
- [ ] `.env` file not committed to repository
- [ ] `.env` file permissions restricted
- [ ] All required variables set
- [ ] Variables tested in staging environment

---

## Additional Resources

- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Prisma Connection URLs](https://www.prisma.io/docs/reference/database-reference/connection-urls)

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**For**: Restaurant Management System v1.0
