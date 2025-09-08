#!/usr/bin/env node

/**
 * Flexible Development Server Starter
 * Automatically detects and uses available ports for backend and frontend
 */

const { spawn } = require('child_process');
const net = require('net');

// Colors for console output
const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check if port is available
function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => {
            server.close(() => resolve(true));
        });
        server.on('error', () => resolve(false));
    });
}

// Find next available port starting from a base port
async function findAvailablePort(basePort, maxTries = 10) {
    for (let i = 0; i < maxTries; i++) {
        const port = basePort + i;
        if (await isPortAvailable(port)) {
            return port;
        }
    }
    throw new Error(`No available ports found starting from ${basePort}`);
}

async function startDevelopmentServers() {
    log('🚀 Starting Secure Asset Portal Development Servers...', 'bold');
    log('🔍 Detecting available ports...', 'blue');

    try {
        // Find available ports
        const backendPort = await findAvailablePort(3000);
        const frontendPort = await findAvailablePort(3001);

        log(`✅ Backend will use port: ${backendPort}`, 'green');
        log(`✅ Frontend will use port: ${frontendPort}`, 'green');

        // Set environment variables for ports
        const backendEnv = {
            ...process.env,
            PORT: backendPort.toString(),
            FRONTEND_URL: `http://localhost:${frontendPort}`,
            CORS_ORIGIN: `http://localhost:${frontendPort}`
        };

        const frontendEnv = {
            ...process.env,
            PORT: frontendPort.toString(),
            REACT_APP_API_URL: `http://localhost:${backendPort}/api`
        };

        log('🌐 Starting backend server...', 'blue');
        const backend = spawn('npm', ['run', 'dev:backend'], {
            env: backendEnv,
            stdio: 'inherit',
            shell: true,
            cwd: process.cwd()
        });

        // Wait a bit for backend to start
        await new Promise(resolve => setTimeout(resolve, 2000));

        log('🎨 Starting frontend server...', 'blue');
        const frontend = spawn('npm', ['run', 'dev:frontend'], {
            env: frontendEnv,
            stdio: 'inherit',
            shell: true,
            cwd: process.cwd()
        });

        log('', 'reset');
        log('🎉 Development servers started successfully!', 'green');
        log(`🔧 Backend API: http://localhost:${backendPort}`, 'blue');
        log(`🌐 Frontend: http://localhost:${frontendPort}`, 'blue');
        log('', 'reset');
        log('Press Ctrl+C to stop both servers', 'yellow');

        // Handle cleanup
        const cleanup = () => {
            log('\\n🛑 Shutting down servers...', 'yellow');
            backend.kill();
            frontend.kill();
            process.exit(0);
        };

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);

        // Keep the script running
        backend.on('close', (code) => {
            if (code !== 0) {
                log(`Backend process exited with code ${code}`, 'red');
            }
        });

        frontend.on('close', (code) => {
            if (code !== 0) {
                log(`Frontend process exited with code ${code}`, 'red');
            }
        });

    } catch (error) {
        log(`❌ Error starting development servers: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    startDevelopmentServers();
}
