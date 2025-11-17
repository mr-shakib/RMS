"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NextServerLauncher = void 0;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
class NextServerLauncher {
    nextProcess = null;
    config = null;
    isDev;
    constructor(isDev) {
        this.isDev = isDev;
    }
    /**
     * Check if a port is available
     */
    async isPortAvailable(port) {
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
    async findAvailablePort(startPort) {
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
    async waitForServer(url, maxAttempts = 60) {
        const http = require('http');
        const urlObj = new URL(url);
        for (let i = 0; i < maxAttempts; i++) {
            try {
                await new Promise((resolve, reject) => {
                    const req = http.request({
                        hostname: urlObj.hostname,
                        port: urlObj.port,
                        path: '/',
                        method: 'GET',
                        timeout: 2000,
                    }, (res) => {
                        // Any response means server is ready
                        if (res.statusCode === 200 || res.statusCode === 404 || res.statusCode === 500) {
                            resolve();
                        }
                        else {
                            reject(new Error(`Unexpected status: ${res.statusCode}`));
                        }
                    });
                    req.on('error', (error) => {
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
            }
            catch (error) {
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
    async start(defaultPort = 3000) {
        try {
            // Find available port
            const port = await this.findAvailablePort(defaultPort);
            const url = `http://localhost:${port}`;
            console.log(`🚀 Starting Next.js server on port ${port}...`);
            // Determine Next.js command
            let nextCommand;
            let nextArgs;
            let cwd;
            let useShell = false; // Track if we need shell mode
            if (this.isDev) {
                // In development, use npm to run Next.js dev server
                const isWindows = process.platform === 'win32';
                nextCommand = isWindows ? 'npm.cmd' : 'npm';
                nextArgs = ['run', 'dev:next'];
                cwd = path.join(__dirname, '../../');
                useShell = true;
            }
            else {
                // In production, run Next.js server directly with Node.js
                const { app } = require('electron');
                const fs = require('fs');
                // Get app path (no asar, all files are unpacked)
                const nextDir = path.join(__dirname, '../../');
                const nextBuildPath = path.join(nextDir, '.next');
                if (!fs.existsSync(nextBuildPath)) {
                    throw new Error(`Next.js build not found at: ${nextBuildPath}`);
                }
                const nextServerPath = path.join(nextDir, 'node_modules/next/dist/bin/next');
                if (!fs.existsSync(nextServerPath)) {
                    throw new Error(`Next binary not found: ${nextServerPath}`);
                }
                // Get Node.js executable - NOT process.execPath which points to .exe in packaged apps
                const isPackaged = app.isPackaged;
                let nodeCommand = '';
                if (isPackaged) {
                    // In packaged app, look for node.exe in multiple locations
                    const appDir = path.dirname(app.getPath('exe'));
                    const bundledNode = path.join(appDir, 'node.exe');
                    if (fs.existsSync(bundledNode)) {
                        nodeCommand = bundledNode;
                        console.log(`✓ Using bundled node: ${nodeCommand}`);
                    }
                    else {
                        // Check common node installation locations
                        const possiblePaths = [
                            'C:\\Program Files\\nodejs\\node.exe',
                            'C:\\Program Files (x86)\\nodejs\\node.exe',
                            path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'nodejs', 'node.exe'),
                            path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'nodejs', 'node.exe'),
                        ];
                        for (const nodePath of possiblePaths) {
                            if (fs.existsSync(nodePath)) {
                                nodeCommand = nodePath;
                                console.log(`✓ Found system node at: ${nodeCommand}`);
                                break;
                            }
                        }
                        if (!nodeCommand) {
                            throw new Error('Node.js not found. Please install Node.js or bundle node.exe with the app.');
                        }
                    }
                }
                else {
                    // In development, use system node
                    nodeCommand = 'node';
                }
                nextCommand = nodeCommand;
                nextArgs = [nextServerPath, 'start', '-p', port.toString()];
                cwd = nextDir;
            }
            console.log(`Running: ${nextCommand} ${nextArgs.join(' ')}`);
            console.log(`Working directory: ${cwd}`);
            this.nextProcess = (0, child_process_1.spawn)(nextCommand, nextArgs, {
                env: {
                    ...process.env,
                    PORT: port.toString(),
                    NODE_ENV: this.isDev ? 'development' : 'production',
                },
                stdio: 'pipe',
                shell: useShell,
                cwd,
            });
            // Handle Next.js output
            this.nextProcess.stdout?.on('data', (data) => {
                const output = data.toString().trim();
                if (output)
                    console.log(`[Next.js] ${output}`);
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
        }
        catch (error) {
            console.error('Error starting Next.js server:', error);
            throw error;
        }
    }
    /**
     * Stop the Next.js server gracefully
     */
    async stop() {
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
    getConfig() {
        return this.config;
    }
    /**
     * Check if Next.js server is running
     */
    isRunning() {
        return this.nextProcess !== null && !this.nextProcess.killed;
    }
}
exports.NextServerLauncher = NextServerLauncher;
