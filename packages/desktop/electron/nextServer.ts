import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';

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
   * Kill process on a specific port (Windows)
   */
  private async killProcessOnPort(port: number): Promise<void> {
    try {
      const { execSync } = require('child_process');
      
      if (process.platform === 'win32') {
        // Find process using the port
        try {
          const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
          const lines = output.trim().split('\n');
          
          const pids = new Set<string>();
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0' && !isNaN(Number(pid))) {
              pids.add(pid);
            }
          }
          
          // Kill each PID
          for (const pid of pids) {
            try {
              execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf8' });
              console.log(`✓ Killed process ${pid} using port ${port}`);
            } catch (killError) {
              console.log(`⚠️  Could not kill process ${pid}`);
            }
          }
        } catch (findError) {
          // No process found on port
        }
      }
    } catch (error) {
      console.log(`⚠️  Error cleaning up port ${port}:`, error);
    }
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
    
    console.log('🔍 Waiting for Next.js server to be ready...');
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const req = http.request(
            {
              hostname: urlObj.hostname,
              port: urlObj.port,
              path: '/',
              method: 'GET',
              timeout: 1000, // Reduced timeout
            },
            (res: any) => {
              if (res.statusCode === 200 || res.statusCode === 404 || res.statusCode === 500) {
                resolve();
              } else {
                reject(new Error(`Unexpected status: ${res.statusCode}`));
              }
            }
          );
          
          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
          });
          
          req.end();
        });
        
        console.log(`✅ Next.js ready after ${i + 1} attempts (${i + 1}s)`);
        return;
      } catch (error) {
        if (i < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    throw new Error('Next.js server failed to start within timeout period');
  }

  /**
   * Get the Next.js server command and arguments
   */
  private getServerCommand(): { command: string; args: string[] } {
    if (this.isDev) {
      return {
        command: 'npm',
        args: ['run', 'dev'],
      };
    }

    const fs = require('fs');
    const path = require('path');
    
    // Get the directory where the .exe is located
    const appDir = path.dirname(process.execPath);
    
    // Look for node.exe in the app directory
    const nodePath = path.join(appDir, 'node.exe');
    
    let nodeExecutable: string;
    
    if (fs.existsSync(nodePath)) {
      nodeExecutable = nodePath;
      console.log('✓ Using Node.js from:', nodeExecutable);
    } else {
      // Fallback: use Electron as Node with ELECTRON_RUN_AS_NODE
      nodeExecutable = process.execPath;
      console.log('✓ Using Electron\'s Node.js:', nodeExecutable);
    }

    const serverPath = this.getServerPath();
    
    console.log('Running:', nodeExecutable, serverPath);
    console.log('Working directory:', path.dirname(serverPath));

    return {
      command: nodeExecutable,
      args: [serverPath],
    };
  }

  /**
   * Start the Next.js server
   */
  async start(defaultPort: number = 3001): Promise<NextServerConfig> {
    try {
      // Try to clean up any existing process on the default port
      await this.killProcessOnPort(defaultPort);
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const port = await this.findAvailablePort(defaultPort);
      const url = `http://localhost:${port}`;

      console.log(`🚀 Starting Next.js server on port ${port}...`);

      const { command, args } = this.getServerCommand();
      const serverPath = this.getServerPath();

      // Set working directory to the directory containing server.js
      const cwd = this.isDev
        ? process.cwd()
        : path.dirname(serverPath);

      const env: NodeJS.ProcessEnv = {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: this.isDev ? 'development' : 'production',
        HOSTNAME: '0.0.0.0',
      };

      // Only set ELECTRON_RUN_AS_NODE if using Electron as Node
      if (command === process.execPath) {
        env.ELECTRON_RUN_AS_NODE = '1';
        console.log('🔧 Running with ELECTRON_RUN_AS_NODE=1');
      } else {
        console.log('🔧 Running with standalone node.exe');
      }

      console.log('▶️  Command:', command);
      console.log('📋 Args:', args.join(' '));
      console.log('📁 CWD:', cwd);

      this.nextProcess = spawn(command, args, {
        cwd,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        windowsHide: true,
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
      
      this.config = { port, url };
      
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

  // Update the getServerPath method to check both locations
  private getServerPath(): string {
    if (this.isDev) {
      // In development, use the existing logic
      return path.join(__dirname, '../../.next/standalone/server.js');
    }

    // In production, check for nested monorepo structure first
    const nestedServerPath = path.join(
      process.resourcesPath,
      'nextjs',
      'standalone',
      'packages',
      'desktop',
      'server.js'
    );

    // Then check for flat structure
    const flatServerPath = path.join(
      process.resourcesPath,
      'nextjs',
      'standalone',
      'server.js'
    );

    const fs = require('fs');
    
    // Check nested path first (monorepo structure)
    if (fs.existsSync(nestedServerPath)) {
      console.log('[NextServer] Found Next.js server at (nested):', nestedServerPath);
      return nestedServerPath;
    }
    
    // Check flat path as fallback
    if (fs.existsSync(flatServerPath)) {
      console.log('[NextServer] Found Next.js server at (flat):', flatServerPath);
      return flatServerPath;
    }

    // If neither exists, throw error with helpful information
    console.error('[NextServer] Next.js standalone server not found at:');
    console.error('  - Nested:', nestedServerPath);
    console.error('  - Flat:', flatServerPath);
    
    // List what's actually there
    try {
      const standaloneDir = path.join(process.resourcesPath, 'nextjs', 'standalone');
      if (fs.existsSync(standaloneDir)) {
        console.error('[NextServer] Contents of standalone directory:', fs.readdirSync(standaloneDir));
      } else {
        console.error('[NextServer] Standalone directory does not exist:', standaloneDir);
      }
    } catch (error) {
      console.error('[NextServer] Error checking directory:', error);
    }

    throw new Error(`Next.js standalone server not found at: ${nestedServerPath} or ${flatServerPath}`);
  }
}
