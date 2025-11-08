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
      
      server.once('error', () => {
        resolve(false);
      });
      
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      
      server.listen(port);
    });
  }

  /**
   * Find an available port starting from the default
   */
  private async findAvailablePort(startPort: number): Promise<number> {
    let port = startPort;
    
    while (port < startPort + 10) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
      port++;
    }
    
    throw new Error(`No available ports found between ${startPort} and ${port}`);
  }

  /**
   * Wait for server to be ready by polling health endpoint
   */
  private async waitForServer(url: string, maxAttempts = 30): Promise<void> {
    const healthUrl = `${url}/api/health`;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(healthUrl);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Server not ready yet, continue waiting
      }
      
      // Wait 1 second before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Server failed to start within timeout period');
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
        const serverPath = path.join(serverDir, 'dist', 'index.js');
        serverCommand = 'node';
        serverArgs = [serverPath];
        cwd = serverDir; // Set working directory to server folder
      }
      
      console.log(`Running: ${serverCommand} ${serverArgs.join(' ')}`);
      if (cwd) console.log(`Working directory: ${cwd}`);
      
      this.serverProcess = spawn(serverCommand, serverArgs, {
        env: {
          ...process.env,
          SERVER_PORT: port.toString(),
          NODE_ENV: this.isDev ? 'development' : 'production',
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
      
      this.serverProcess.on('exit', (code) => {
        console.log(`Server process exited with code ${code}`);
      });
      
      // Wait for server to be ready
      await this.waitForServer(url);
      
      this.config = { port, url, lanIp };
      
      console.log('✅ Server is ready!');
      console.log(`🌐 Local: ${url}`);
      console.log(`🌐 Network: http://${lanIp}:${port}`);
      
      return this.config;
    } catch (error) {
      console.error('Error starting server:', error);
      throw error;
    }
  }

  /**
   * Stop the Express server gracefully
   */
  async stop(): Promise<void> {
    if (this.serverProcess) {
      console.log('🛑 Stopping server...');
      
      return new Promise((resolve) => {
        if (!this.serverProcess) {
          resolve();
          return;
        }
        
        this.serverProcess.once('exit', () => {
          console.log('✅ Server stopped');
          this.serverProcess = null;
          this.config = null;
          resolve();
        });
        
        // Send SIGTERM for graceful shutdown
        this.serverProcess.kill('SIGTERM');
        
        // Force kill after 5 seconds if not stopped
        setTimeout(() => {
          if (this.serverProcess) {
            console.log('⚠️ Force killing server...');
            this.serverProcess.kill('SIGKILL');
            this.serverProcess = null;
            this.config = null;
            resolve();
          }
        }, 5000);
      });
    }
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
