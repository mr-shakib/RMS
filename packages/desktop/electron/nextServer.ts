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
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(url);
        if (response.ok || response.status === 404) {
          // Next.js is ready (404 is fine, means server is responding)
          return;
        }
      } catch (error) {
        // Server not ready yet, continue waiting
      }
      
      // Wait 1 second before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Next.js server failed to start within timeout period');
  }

  /**
   * Start the Next.js server as a child process
   */
  async start(defaultPort: number = 3000): Promise<NextServerConfig> {
    try {
      // Find available port
      const port = await this.findAvailablePort(defaultPort);
      const url = `http://localhost:${port}`;
      
      console.log(`🚀 Starting Next.js server on port ${port}...`);
      
      // Determine Next.js command
      let nextCommand: string;
      let nextArgs: string[];
      let cwd: string;
      
      if (this.isDev) {
        // In development, use npm to run Next.js dev server
        const isWindows = process.platform === 'win32';
        nextCommand = isWindows ? 'npm.cmd' : 'npm';
        nextArgs = ['run', 'dev:next'];
        cwd = path.join(__dirname, '../../');
      } else {
        // In production, run Next.js server directly with Node.js
        const nextDir = path.join(__dirname, '../../');
        const nextServerPath = path.join(nextDir, 'node_modules/next/dist/bin/next');
        
        // Use node to run the Next.js server
        nextCommand = 'node';
        nextArgs = [nextServerPath, 'start', '-p', port.toString()];
        cwd = nextDir;
      }
      
      console.log(`Running: ${nextCommand} ${nextArgs.join(' ')}`);
      console.log(`Working directory: ${cwd}`);
      
      this.nextProcess = spawn(nextCommand, nextArgs, {
        env: {
          ...process.env,
          PORT: port.toString(),
          NODE_ENV: this.isDev ? 'development' : 'production',
        },
        stdio: 'pipe',
        shell: this.isDev, // Only use shell in dev mode for npm command
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
}
