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
exports.ServerLauncher = void 0;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class ServerLauncher {
    serverProcess = null;
    config = null;
    isDev;
    constructor(isDev) {
        this.isDev = isDev;
    }
    /**
     * Get the local network IP address
     */
    getLanIpAddress() {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            const iface = interfaces[name];
            if (!iface)
                continue;
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
     * Wait for server to be ready by polling health endpoint
     */
    async waitForServer(url, maxAttempts = 60) {
        const healthUrl = `${url}/api/health`;
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch(healthUrl);
                if (response.ok || response.status === 503) {
                    return;
                }
            }
            catch { }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        throw new Error('Server failed to start within timeout period');
    }
    /**
     * Start the Express server as a child process
     */
    async start(defaultPort = 5000) {
        try {
            // Find available port
            const port = await this.findAvailablePort(defaultPort);
            const lanIp = this.getLanIpAddress();
            const url = `http://localhost:${port}`;
            console.log(`🚀 Starting server on port ${port}...`);
            console.log(`📱 LAN IP: http://${lanIp}:${port}`);
            // Determine server path and command
            let serverCommand;
            let serverArgs;
            let cwd;
            if (this.isDev) {
                // In development, use npm to run the server from the server package
                const isWindows = process.platform === 'win32';
                serverCommand = isWindows ? 'npm.cmd' : 'npm';
                serverArgs = ['run', 'dev'];
                // Set working directory to server package
                cwd = path.join(__dirname, '../../../server');
            }
            else {
                // In production, run the built server directly
                const serverDir = path.join(process.resourcesPath, 'server');
                const serverPath = path.join(serverDir, 'dist', 'server', 'src', 'index.js');
                const fs = require('fs');
                if (!fs.existsSync(serverPath)) {
                    throw new Error(`Server entry not found: ${serverPath}`);
                }
                // Set up production database path in user data directory
                const { app } = require('electron');
                const userDataPath = app.getPath('userData');
                const dbDir = path.join(userDataPath, 'database');
                const dbPath = path.join(dbDir, 'restaurant.db');
                // Create database directory if it doesn't exist
                if (!fs.existsSync(dbDir)) {
                    fs.mkdirSync(dbDir, { recursive: true });
                    console.log(`📁 Created database directory: ${dbDir}`);
                }
                // Find the node executable that came with Electron
                // CRITICAL: Do NOT use process.execPath in packaged apps - it points to the .exe file!
                // Instead, use the node executable from Electron's resources
                const electronPath = process.execPath;
                const isWindows = process.platform === 'win32';
                // Determine Node.js path based on platform and Electron structure
                let nodePath;
                if (isWindows) {
                    // On Windows, Electron bundles node.exe in the same directory as the .exe
                    const appDir = path.dirname(electronPath);
                    nodePath = path.join(appDir, 'node.exe');
                    // If node.exe doesn't exist, fall back to system node
                    if (!fs.existsSync(nodePath)) {
                        console.warn(`⚠️ Bundled node.exe not found at ${nodePath}, using system node`);
                        nodePath = 'node';
                    }
                }
                else if (process.platform === 'darwin') {
                    // On macOS, node is in the Electron.app bundle
                    nodePath = path.join(process.resourcesPath, 'node');
                    if (!fs.existsSync(nodePath)) {
                        console.warn(`⚠️ Bundled node not found at ${nodePath}, using system node`);
                        nodePath = 'node';
                    }
                }
                else {
                    // On Linux, use system node
                    nodePath = 'node';
                }
                console.log(`📟 Using Node.js: ${nodePath}`);
                serverCommand = nodePath;
                serverArgs = [serverPath];
                cwd = serverDir; // Set working directory to server folder
                // Set DATABASE_URL environment variable to user data path
                process.env.DATABASE_URL = `file:${dbPath}`;
                console.log(`📊 Database path: ${dbPath}`);
            }
            console.log(`Running: ${serverCommand} ${serverArgs.join(' ')}`);
            if (cwd)
                console.log(`Working directory: ${cwd}`);
            this.serverProcess = (0, child_process_1.spawn)(serverCommand, serverArgs, {
                env: {
                    ...process.env,
                    SERVER_PORT: port.toString(),
                    LAN_IP: lanIp,
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
        }
        catch (error) {
            console.error('Error starting server:', error);
            throw error;
        }
    }
    /**
     * Stop the Express server gracefully
     */
    async stop() {
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
    async restart() {
        const currentPort = this.config?.port || 5000;
        await this.stop();
        return this.start(currentPort);
    }
    /**
     * Get current server configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Check if server is running
     */
    isRunning() {
        return this.serverProcess !== null && !this.serverProcess.killed;
    }
}
exports.ServerLauncher = ServerLauncher;
