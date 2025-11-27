import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';

export interface ServerConfig {
  port: number;
  url: string;
  lanIp: string;
}

export class ServerLauncher {
  private serverProcess: ChildProcess | null = null;
  private config: ServerConfig | null = null;
  private isDev: boolean;

  constructor(isDev: boolean) {
    this.isDev = isDev;
  }

  /**
   * Get the local network IP address
   */
  private getLanIpAddress(): string {
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      if (!iface) continue;

      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          return alias.address;
        }
      }
    }

    return 'localhost';
  }

  /**
   * Check if a port is available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const server = net.createServer();
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          try {
            server.close();
          } catch (e) {
            // Ignore close errors
          }
        }
      };

      // Timeout after 2 seconds
      const timeout = setTimeout(() => {
        cleanup();
        console.log(`⚠️ Port check timed out for ${port}`);
        resolve(false);
      }, 2000);

      server.once('error', (err: any) => {
        clearTimeout(timeout);
        cleanup();
        if (err.code !== 'EADDRINUSE') {
          console.log(`⚠️ Port check error for ${port}:`, err.message);
        }
        resolve(false);
      });

      server.once('listening', () => {
        clearTimeout(timeout);
        cleanup();
        resolve(true);
      });

      // Listen specifically on IPv4 localhost to avoid IPv6 issues
      server.listen(port, '127.0.0.1');
    });
  }

  /**
   * Find an available port starting from the default
   */
  private async findAvailablePort(startPort: number): Promise<number> {
    let port = startPort;
    const maxAttempts = 50;
    let attempts = 0;

    while (attempts < maxAttempts) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
      port++;
      attempts++;
    }

    throw new Error(`No available ports found between ${startPort} and ${startPort + maxAttempts}`);
  }

  /**
   * Wait for server to be ready by polling health endpoint
   */
  private async waitForServer(url: string, maxAttempts = 60): Promise<void> {
    const healthUrl = `${url}/api/health`;

    console.log(`🔍 Checking if API server is ready at ${healthUrl}...`);
    console.log(`⏱️  Will wait up to ${maxAttempts} seconds for API server to start`);

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(healthUrl);
        if (response.ok) {
          console.log(`✓ Server health check passed after ${i + 1} attempt(s) (${i + 1}s)`);
          return;
        } else {
          console.log(`⚠️  Health check returned status ${response.status}`);
        }
      } catch (error) {
        // Server not ready yet, continue waiting
        if (i < 5 || i % 10 === 0) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.log(`⏳ Waiting for API server... (attempt ${i + 1}/${maxAttempts}, ${i + 1}s elapsed) [${errorMsg}]`);
        }
      }

      // Wait 1 second before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.error(`❌ API server failed to respond to health checks`);
    console.error('Check the server process output above for errors');
    throw new Error(`Server failed to start within ${maxAttempts} seconds. Check logs for details.`);
  }

  /**
   * Start the Express server as a child process
   */
  async start(defaultPort: number = 5000): Promise<ServerConfig> {
    try {
      // Find available port
      const port = await this.findAvailablePort(defaultPort);
      const lanIp = this.getLanIpAddress();
      const url = `http://localhost:${port}`;

      console.log(`🚀 Starting server on port ${port}...`);
      console.log(`📱 LAN IP: http://${lanIp}:${port}`);

      // Determine server path and command
      let serverCommand: string;
      let serverArgs: string[];
      let cwd: string | undefined;

      if (this.isDev) {
        // In development, use npm to run the server from the server package
        const isWindows = process.platform === 'win32';
        serverCommand = isWindows ? 'npm.cmd' : 'npm';
        serverArgs = ['run', 'dev'];
        // Set working directory to server package
        cwd = path.join(__dirname, '../../../server');
      } else {
        // In production, run the built server directly
        const serverDir = path.join(process.resourcesPath, 'server');
        const serverPath = path.join(serverDir, 'dist', 'server', 'src', 'index.js');

        // Set up production database path in user data directory
        const { app } = require('electron');
        const userDataPath = app.getPath('userData');
        const dbDir = path.join(userDataPath, 'database');
        const dbPath = path.join(dbDir, 'restaurant.db');

        // Create database directory if it doesn't exist
        const fs = require('fs');
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
          console.log(`📁 Created database directory: ${dbDir}`);
        }

        serverCommand = process.execPath;
        serverArgs = [serverPath];
        cwd = serverDir;

        // Set DATABASE_URL environment variable to user data path
        process.env.DATABASE_URL = `file:${dbPath}`;
        console.log(`📊 Database path: ${dbPath}`);
      }

      console.log(`Running: ${serverCommand} ${serverArgs.join(' ')}`);
      if (cwd) console.log(`Working directory: ${cwd}`);

      this.serverProcess = spawn(serverCommand, serverArgs, {
        env: {
          ...process.env,
          SERVER_PORT: port.toString(),
          NODE_ENV: this.isDev ? 'development' : 'production',
          ELECTRON_RUN_AS_NODE: '1'
        },
        stdio: 'pipe',
        shell: this.isDev, // Use shell in dev mode for npm command
        cwd, // Set working directory
      });

      // Handle server output
      this.serverProcess.stdout?.on('data', (data) => {
        console.log(`[Server] ${data.toString().trim()}`);
      });

      this.serverProcess.stderr?.on('data', (data) => {
        console.error(`[Server Error] ${data.toString().trim()}`);
      });

      this.serverProcess.on('error', (error) => {
        console.error('Failed to start server:', error);
        throw error;
      });

      this.serverProcess.on('exit', (code, signal) => {
        console.log(`Server process exited with code ${code}, signal ${signal}`);
        this.serverProcess = null;
        this.config = null;
      });

      // Wait for server to be ready
      await this.waitForServer(url);

      this.config = { port, url, lanIp };

      console.log('✅ Server is ready!');
      console.log(`🌐 Local: ${url}`);
      console.log(`🌐 Network: http://${lanIp}:${port}`);

      return this.config;
    } catch (error) {
      console.error('❌ Error starting API server:', error);
      console.error('\n📋 Troubleshooting:');
      console.error('1. Check if server files exist in resources/server directory');
      console.error('2. Verify port 5000 is available');
      console.error('3. Check database initialization (should be in user data directory)');
      console.error('4. Check server process output above for specific errors');
      console.error('5. Try restarting the application');
      throw error;
    }
  }

  /**
   * Stop the Express server gracefully
   */
  async stop(): Promise<void> {
    if (!this.serverProcess || this.serverProcess.killed) {
      console.log('Server already stopped');
      this.serverProcess = null;
      this.config = null;
      return;
    }

    console.log('🛑 Stopping server...');

    return new Promise((resolve) => {
      const process = this.serverProcess;
      if (!process) {
        resolve();
        return;
      }

      let exitHandled = false;
      const handleExit = () => {
        if (!exitHandled) {
          exitHandled = true;
          console.log('✅ Server stopped');
          this.serverProcess = null;
          this.config = null;
          resolve();
        }
      };

      process.once('exit', handleExit);

      // Send SIGTERM for graceful shutdown
      try {
        process.kill('SIGTERM');
      } catch (error) {
        console.error('Error sending SIGTERM:', error);
        handleExit();
        return;
      }

      // Force kill after 5 seconds if not stopped
      setTimeout(() => {
        if (!exitHandled && process && !process.killed) {
          console.log('⚠️ Force killing server...');
          try {
            process.kill('SIGKILL');
          } catch (error) {
            console.error('Error force killing:', error);
          }
          handleExit();
        }
      }, 5000);
    });
  }

  /**
   * Restart the server
   */
  async restart(): Promise<ServerConfig> {
    const currentPort = this.config?.port || 5000;
    await this.stop();
    return this.start(currentPort);
  }

  /**
   * Get current server configuration
   */
  getConfig(): ServerConfig | null {
    return this.config;
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.serverProcess !== null && !this.serverProcess.killed;
  }
}
