import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';

export interface NextServerConfig {
  port: number;
  url: string;
}

export class NextServerLauncher {
  private nextProcess: ChildProcess | null = null;
  private config: NextServerConfig | null = null;
  private isDev: boolean;

  constructor(isDev: boolean) {
    this.isDev = isDev;
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
   * Wait for Next.js server to be ready
   */
  private async waitForServer(url: string, maxAttempts = 60): Promise<void> {
    const http = require('http');
    const urlObj = new URL(url);
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const req = http.request(
            {
              hostname: urlObj.hostname,
              port: urlObj.port,
              path: '/',
              method: 'GET',
              timeout: 2000,
            },
            (res: any) => {
              // Any response means server is ready
              if (res.statusCode === 200 || res.statusCode === 404 || res.statusCode === 500) {
                resolve();
              } else {
                reject(new Error(`Unexpected status: ${res.statusCode}`));
              }
            }
          );
          
          req.on('error', (error: Error) => {
            reject(error);
          });
          
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
          });
          
          req.end();
        });
        
        // Server is ready!
        return;
      } catch (error) {
        // Server not ready yet, continue waiting
        if (i < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    throw new Error('Next.js server failed to start within timeout period');
  }

  /**
   * Start the Next.js server as a child process
   */
  async start(port: number = 3000): Promise<NextServerConfig> {
    if (this.nextProcess) {
      throw new Error('Next.js server is already running');
    }

    try {
      // Find available port
      const availablePort = await this.findAvailablePort(port);
      const url = `http://localhost:${availablePort}`;
      
      console.log(`🚀 Starting Next.js server on port ${availablePort}...`);
      
      // Determine Next.js command
      let nextCommand: string;
      let nextArgs: string[];
      let cwd: string;
      let useShell = false; // Track if we need shell mode
      
      if (this.isDev) {
        // In development, use npm to run Next.js dev server
        const isWindows = process.platform === 'win32';
        nextCommand = isWindows ? 'npm.cmd' : 'npm';
        nextArgs = ['run', 'dev:next'];
        cwd = path.join(__dirname, '../../');
        useShell = true;
      } else {
        // In production, look in resources/nextjs/standalone
        // In dev, look in .next/standalone relative to this file
        const serverPath = this.isDev
          ? path.join(__dirname, '../../.next/standalone/server.js')
          : path.join(process.resourcesPath, 'nextjs', 'standalone', 'server.js');

        console.log('[NextServer] Looking for server at:', serverPath);

        // Check if server file exists
        if (!fs.existsSync(serverPath)) {
          const errorMsg = `Next.js standalone server not found at: ${serverPath}`;
          console.error('[NextServer]', errorMsg);
          
          // List what actually exists in the directory
          const parentDir = path.dirname(serverPath);
          if (fs.existsSync(parentDir)) {
            console.error('[NextServer] Contents of parent directory:', fs.readdirSync(parentDir));
          } else {
            console.error('[NextServer] Parent directory does not exist:', parentDir);
          }
          
          throw new Error(errorMsg);
        }
        
        // Use process.execPath which points to the Electron executable
        // Electron has Node.js built-in, so we can use it directly
        nextCommand = process.execPath;
        nextArgs = [serverPath];
        cwd = path.join(__dirname, '../../.next/standalone');
        
        console.log(`✓ Using Electron's Node.js: ${nextCommand}`);
      }
      
      console.log(`Running: ${nextCommand} ${nextArgs.join(' ')}`);
      console.log(`Working directory: ${cwd}`);
      
      this.nextProcess = spawn(nextCommand, nextArgs, {
        env: {
          ...process.env,
          PORT: availablePort.toString(),
          NODE_ENV: this.isDev ? 'development' : 'production',
        },
        stdio: 'pipe',
        shell: useShell,
        cwd,
      });
      
      // Handle Next.js output
      this.nextProcess.stdout?.on('data', (data) => {
        const output = data.toString().trim();
        if (output) console.log(`[Next.js] ${output}`);
      });
      
      this.nextProcess.stderr?.on('data', (data) => {
        const output = data.toString().trim();
        if (output && !output.includes('DeprecationWarning')) {
          console.error(`[Next.js Error] ${output}`);
        }
      });
      
      this.nextProcess.on('error', (error) => {
        console.error('Failed to start Next.js server:', error);
        throw error;
      });
      
      this.nextProcess.on('exit', (code) => {
        console.log(`Next.js server process exited with code ${code}`);
      });
      
      // Wait for Next.js to be ready
      await this.waitForServer(url);
      
      this.config = { port: availablePort, url };
      
      console.log('✅ Next.js server is ready!');
      console.log(`🌐 URL: ${url}`);
      
      return this.config;
    } catch (error) {
      console.error('Error starting Next.js server:', error);
      throw error;
    }
  }

  /**
   * Stop the Next.js server gracefully
   */
  async stop(): Promise<void> {
    if (this.nextProcess) {
      console.log('🛑 Stopping Next.js server...');
      
      return new Promise((resolve) => {
        if (!this.nextProcess) {
          resolve();
          return;
        }
        
        this.nextProcess.once('exit', () => {
          console.log('✅ Next.js server stopped');
          this.nextProcess = null;
          this.config = null;
          resolve();
        });
        
        // Send SIGTERM for graceful shutdown
        this.nextProcess.kill('SIGTERM');
        
        // Force kill after 5 seconds if not stopped
        setTimeout(() => {
          if (this.nextProcess) {
            console.log('⚠️ Force killing Next.js server...');
            this.nextProcess.kill('SIGKILL');
            this.nextProcess = null;
            this.config = null;
            resolve();
          }
        }, 5000);
      });
    }
  }

  /**
   * Get current Next.js server configuration
   */
  getConfig(): NextServerConfig | null {
    return this.config;
  }

  /**
   * Check if Next.js server is running
   */
  isRunning(): boolean {
    return this.nextProcess !== null && !this.nextProcess.killed;
  }
}
