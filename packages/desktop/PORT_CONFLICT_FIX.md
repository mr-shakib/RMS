# Port Conflict Fix

## Issue
Application failed to start due to port conflicts:
- **Port 3000** (Next.js) - `EADDRINUSE` error
- **Port 5000** (API Server) - `EADDRINUSE` error

### Root Cause
Orphaned processes from previous app runs were still holding onto ports 3000 and 5000, preventing new instances from starting.

## Solution Applied

### 1. Added `killProcessOnPort` Method
Both `NextServerLauncher` and `ServerLauncher` now have a method to kill processes on specific ports before starting:

```typescript
private async killProcessOnPort(port: number): Promise<void> {
  // Uses netstat to find processes using the port
  // Uses taskkill /F /PID to forcefully terminate them
}
```

### 2. Pre-Start Cleanup
Both launchers now clean up ports before attempting to start:

```typescript
async start(defaultPort: number): Promise<Config> {
  // Clean up any existing process on the port
  await this.killProcessOnPort(defaultPort);
  
  // Wait for cleanup to complete
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Then start the server
  // ...
}
```

## Files Modified
1. `packages/desktop/electron/nextServer.ts` - Added port cleanup for port 3000
2. `packages/desktop/electron/serverLauncher.ts` - Added port cleanup for port 5000

## How It Works

### On Application Start:
1. Kill any process using port 3000
2. Kill any process using port 5000
3. Wait 500ms for cleanup
4. Start Next.js server on port 3000
5. Start API server on port 5000

### Process Detection (Windows):
```bash
netstat -ano | findstr :3000
# Output: TCP    0.0.0.0:3000    LISTENING    12345
#                                              ^^^^^ PID

taskkill /F /PID 12345
```

## Benefits
- ✅ No more "port already in use" errors
- ✅ Clean restart after crashes
- ✅ No manual process cleanup needed
- ✅ Safer multiple restart attempts

## Testing
After rebuilding Electron:
```powershell
npm run build:electron --workspace=packages/desktop
```

The application should now:
1. Kill any orphaned processes on ports 3000 and 5000
2. Start cleanly without port conflicts
3. Show startup logs confirming killed processes

## Next Steps
Run the full build:
```powershell
.\packages\desktop\build-and-package.ps1
```

The packaged app will now handle port conflicts automatically.
