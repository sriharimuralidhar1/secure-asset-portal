#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const readline = require('readline');

console.log('🛡️  Setting up Secure Asset Portal...\n');

// Colors for console output
const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

function generateSecureKey(length = 64) {
    return crypto.randomBytes(length).toString('hex');
}

function runCommand(command, description) {
    try {
        log(`⏳ ${description}...`, 'blue');
        execSync(command, { stdio: 'inherit' });
        log(`✅ ${description} completed`, 'green');
        return true;
    } catch (error) {
        log(`❌ ${description} failed: ${error.message}`, 'red');
        return false;
    }
}

async function configureEmail() {
    log('\n📧 Email Configuration Setup', 'bold');
    log('Configure email settings to enable notifications and user registration emails.', 'blue');
    log('You can skip this and use test emails, or set up Gmail/SMTP.\n');
    
    const setupEmail = await question('Do you want to configure email settings now? (y/n): ');
    
    if (setupEmail.toLowerCase() !== 'y' && setupEmail.toLowerCase() !== 'yes') {
        log('⏭️  Skipping email configuration. Using test emails (Ethereal).', 'yellow');
        return {
            SMTP_HOST: 'smtp.gmail.com',
            SMTP_PORT: '587',
            SMTP_SECURE: 'false',
            SMTP_USER: '',
            SMTP_PASS: '',
            FROM_EMAIL: 'Secure Asset Portal <noreply@example.com>',
            APP_NAME: 'Secure Asset Portal'
        };
    }
    
    log('\n📝 Choose your email provider:', 'blue');
    log('1. Gmail (recommended for development)');
    log('2. Custom SMTP server');
    log('3. Skip (use test emails)');
    
    const provider = await question('\nSelect option (1-3): ');
    
    if (provider === '1') {
        log('\n📧 Gmail Setup:', 'blue');
        log('💡 For Gmail, you\'ll need to:');
        log('   1. Enable 2-Factor Authentication on your Gmail account');
        log('   2. Generate an App Password: https://myaccount.google.com/apppasswords');
        log('   3. When creating the App Password, give it a name (e.g., "My Asset Portal", "Test-portal")');
        log('   4. Use the App Password below (not your regular Gmail password)\n');
        
        const email = await question('Enter your Gmail address: ');
        const appPasswordName = await question('Enter the name you gave to your App Password (e.g., "Test-portal"): ');
        const appPassword = await question('Enter your Gmail App Password: ');
        
        if (email && appPassword && appPasswordName) {
            const finalAppName = appPasswordName.trim() || 'Secure Asset Portal';
            log(`✅ Gmail configuration saved! App name: ${finalAppName}`, 'green');
            return {
                SMTP_HOST: 'smtp.gmail.com',
                SMTP_PORT: '587',
                SMTP_SECURE: 'false',
                SMTP_USER: email,
                SMTP_PASS: appPassword,
                FROM_EMAIL: `${finalAppName} <noreply@${email.split('@')[1]}>`,
                APP_NAME: finalAppName
            };
        }
    } else if (provider === '2') {
        log('\n📧 Custom SMTP Setup:', 'blue');
        
        const appName = await question('Enter your application name (e.g., "My Asset Portal"): ');
        const host = await question('SMTP Host (e.g., smtp.yourdomain.com): ');
        const port = await question('SMTP Port (587 for TLS, 465 for SSL): ');
        const secure = await question('Use SSL? (y/n): ');
        const user = await question('SMTP Username: ');
        const pass = await question('SMTP Password: ');
        
        if (host && port && user && pass) {
            const finalAppName = appName.trim() || 'Secure Asset Portal';
            log(`✅ Custom SMTP configuration saved! App name: ${finalAppName}`, 'green');
            return {
                SMTP_HOST: host,
                SMTP_PORT: port,
                SMTP_SECURE: secure.toLowerCase() === 'y' ? 'true' : 'false',
                SMTP_USER: user,
                SMTP_PASS: pass,
                FROM_EMAIL: `${finalAppName} <noreply@${host.replace('smtp.', '')}>`,
                APP_NAME: finalAppName
            };
        }
    }
    
    log('⏭️  Using test email configuration.', 'yellow');
    return {
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
        SMTP_USER: '',
        SMTP_PASS: '',
        FROM_EMAIL: 'Secure Asset Portal <noreply@example.com>',
        APP_NAME: 'Secure Asset Portal'
    };
}

async function createEnvFile() {
    const envPath = path.join(__dirname, '.env');
    
    if (fs.existsSync(envPath)) {
        log('⚠️  .env file already exists, skipping creation', 'yellow');
        return true;
    }

    const jwtSecret = generateSecureKey(32);
    const sessionSecret = generateSecureKey(32);
    
    // Get email configuration (includes app name)
    const emailConfig = await configureEmail();

    const envContent = `# Auto-generated environment configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Database Configuration (using default PostgreSQL setup)
DATABASE_URL=postgresql://postgres:password@localhost:5432/secure_asset_portal
DB_HOST=localhost
DB_PORT=5432
DB_NAME=secure_asset_portal
DB_USER=postgres
DB_PASSWORD=password
DB_SSL=false

# Security Configuration (auto-generated secure keys)
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12
SESSION_SECRET=${sessionSecret}

# HTTPS Configuration (enabled for production with generated certificates)
ENABLE_HTTPS=true
SSL_KEY_PATH=./certs/key.pem
SSL_CERT_PATH=./certs/cert.pem
HSTS_MAX_AGE=31536000
HSTS_INCLUDE_SUBDOMAINS=false
HSTS_PRELOAD=false

# Application Configuration
APP_NAME=${emailConfig.APP_NAME}
FROM_EMAIL=${emailConfig.FROM_EMAIL}

# Two-Factor Authentication
TWO_FACTOR_SERVICE_NAME=${emailConfig.APP_NAME}
TWO_FACTOR_ISSUER=${emailConfig.APP_NAME}

# Email Configuration
SMTP_HOST=${emailConfig.SMTP_HOST}
SMTP_PORT=${emailConfig.SMTP_PORT}
SMTP_SECURE=${emailConfig.SMTP_SECURE}
SMTP_USER=${emailConfig.SMTP_USER}
SMTP_PASS=${emailConfig.SMTP_PASS}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5

# CORS Configuration
CORS_ORIGIN=http://localhost:3001
CORS_CREDENTIALS=true

# Development Settings
LOG_LEVEL=info
ENABLE_SWAGGER=true
`;

    try {
        fs.writeFileSync(envPath, envContent);
        log('✅ Created .env file with secure defaults', 'green');
        return true;
    } catch (error) {
        log(`❌ Failed to create .env file: ${error.message}`, 'red');
        return false;
    }
}

function checkPostgreSQL() {
    try {
        execSync('pg_isready -h localhost -p 5432', { stdio: 'pipe' });
        return true;
    } catch (error) {
        return false;
    }
}

function createFrontendFiles() {
    log('🌐 Setting up frontend files...', 'blue');
    
    const frontendDir = path.join(__dirname, 'frontend');
    const publicDir = path.join(frontendDir, 'public');
    const indexHtmlPath = path.join(publicDir, 'index.html');
    
    // Create public directory if it doesn't exist
    if (!fs.existsSync(publicDir)) {
        try {
            fs.mkdirSync(publicDir, { recursive: true });
            log('✅ Created frontend/public directory', 'green');
        } catch (error) {
            log(`❌ Failed to create public directory: ${error.message}`, 'red');
            return false;
        }
    }
    
    // Create index.html if it doesn't exist
    if (!fs.existsSync(indexHtmlPath)) {
        const indexHtmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#2563eb" />
    <meta
      name="description"
      content="Secure Asset Portal - Manage your financial assets safely and securely"
    />
    <meta name="author" content="Secure Asset Portal Team" />
    
    <!-- Security headers for content security -->
    <meta http-equiv="X-Content-Type-Options" content="nosniff" />
    <meta http-equiv="X-Frame-Options" content="DENY" />
    <meta http-equiv="X-XSS-Protection" content="1; mode=block" />
    <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
    
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    
    <title>Secure Asset Portal</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this application.</noscript>
    <div id="root"></div>
  </body>
</html>
`;
        
        try {
            fs.writeFileSync(indexHtmlPath, indexHtmlContent);
            log('✅ Created frontend/public/index.html', 'green');
        } catch (error) {
            log(`❌ Failed to create index.html: ${error.message}`, 'red');
            return false;
        }
    } else {
        log('✅ Frontend index.html already exists', 'green');
    }
    
    // Create manifest.json if it doesn't exist
    const manifestPath = path.join(publicDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        const manifestContent = `{
  "short_name": "Asset Portal",
  "name": "Secure Asset Portal",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#2563eb",
  "background_color": "#ffffff"
}
`;
        
        try {
            fs.writeFileSync(manifestPath, manifestContent);
            log('✅ Created frontend/public/manifest.json', 'green');
        } catch (error) {
            log('⚠️  Could not create manifest.json (optional)', 'yellow');
        }
    }
    
    // Create frontend .env file if it doesn't exist (CRITICAL for port configuration)
    const frontendEnvPath = path.join(frontendDir, '.env');
    if (!fs.existsSync(frontendEnvPath)) {
        const frontendEnvContent = `# Browser configuration - React will try to open this browser
BROWSER="Brave Browser"

# Alternative: use full path if name doesn't work
# BROWSER="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"

# Disable automatic browser opening if you prefer manual control
# BROWSER=none

# Development server configuration
PORT=3001

# API base URL
REACT_APP_API_URL=http://localhost:3000/api
`;
        
        try {
            fs.writeFileSync(frontendEnvPath, frontendEnvContent);
            log('✅ Created frontend/.env with port 3001 configuration', 'green');
        } catch (error) {
            log(`❌ Failed to create frontend/.env: ${error.message}`, 'red');
            return false;
        }
    } else {
        log('✅ Frontend .env already exists', 'green');
    }
    
    return true;
}

function generateSSLCertificates() {
    log('🔒 Generating SSL certificates...', 'blue');
    
    const certsDir = path.join(__dirname, 'certs');
    
    // Create certs directory if it doesn't exist
    if (!fs.existsSync(certsDir)) {
        try {
            fs.mkdirSync(certsDir, { recursive: true });
            log('✅ Created certs directory', 'green');
        } catch (error) {
            log(`❌ Failed to create certs directory: ${error.message}`, 'red');
            return false;
        }
    }
    
    const keyPath = path.join(certsDir, 'key.pem');
    const certPath = path.join(certsDir, 'cert.pem');
    
    // Check if certificates already exist
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        log('✅ SSL certificates already exist', 'green');
        return true;
    }
    
    try {
        // Generate private key and self-signed certificate
        const certCommand = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=US/ST=CA/L=San Francisco/O=Secure Asset Portal/OU=Development/CN=localhost"`;
        
        log('🔍 Generating SSL certificate for localhost...', 'blue');
        execSync(certCommand, { stdio: 'pipe' });
        
        log('✅ SSL certificates generated successfully', 'green');
        log(`🔑 Private key: ${keyPath}`, 'reset');
        log(`📜 Certificate: ${certPath}`, 'reset');
        
        return true;
    } catch (error) {
        log(`❌ Failed to generate SSL certificates: ${error.message}`, 'red');
        log('⚠️  Make sure OpenSSL is installed:', 'yellow');
        log('   macOS: brew install openssl');
        log('   Ubuntu: sudo apt-get install openssl');
        log('   Windows: Download from https://www.openssl.org/');
        return false;
    }
}

function setupDatabase() {
    log('🗄️  Setting up database...', 'blue');
    
    if (!checkPostgreSQL()) {
        log('⚠️  PostgreSQL not running or not installed', 'yellow');
        log('📝 Please install and start PostgreSQL:', 'yellow');
        log('   macOS: brew install postgresql && brew services start postgresql');
        log('   Ubuntu: sudo apt-get install postgresql postgresql-contrib');
        log('   Windows: Download from https://www.postgresql.org/download/');
        log('');
        log('💡 Or use Docker: docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres', 'blue');
        return false;
    }

    // Clean database setup - ensure fresh start
    log('🧽 Ensuring clean database setup...', 'blue');
    try {
        // Drop database if it exists and recreate (clean slate)
        execSync('dropdb --if-exists secure_asset_portal', { stdio: 'pipe' });
        execSync('createdb secure_asset_portal', { stdio: 'pipe' });
        log('✅ Created fresh database: secure_asset_portal', 'green');
    } catch (error) {
        log(`⚠️  Could not reset database: ${error.message}`, 'yellow');
        log('Attempting to use existing database...', 'yellow');
        
        // Fallback: try to create if it doesn't exist
        try {
            execSync('createdb secure_asset_portal', { stdio: 'pipe' });
            log('✅ Created database: secure_asset_portal', 'green');
        } catch (createError) {
            if (createError.message.includes('already exists')) {
                log('🗑️  Database exists, will apply clean schema', 'yellow');
            } else {
                log('⚠️  Could not create database (might need different credentials)', 'yellow');
            }
        }
    }

    // Run schema
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
        try {
            execSync(`psql -d secure_asset_portal -f "${schemaPath}"`, { stdio: 'pipe' });
            log('✅ Applied database schema', 'green');
            return true;
        } catch (error) {
            log('⚠️  Could not apply schema - you may need to run it manually', 'yellow');
            log(`   Command: psql -d secure_asset_portal -f database/schema.sql`, 'blue');
            return false;
        }
    } else {
        log('⚠️  Schema file not found at database/schema.sql', 'yellow');
        return false;
    }
}

async function main() {
    log('🚀 Starting automated setup...', 'bold');
    
    // Step 1: Install dependencies
    if (!runCommand('npm install', 'Installing root dependencies')) {
        process.exit(1);
    }
    
    // Install additional packages needed for scripts at root level
    if (!runCommand('npm install uuid bcrypt pg dotenv', 'Installing script dependencies at root level')) {
        process.exit(1);
    }
    
    if (!runCommand('npm install --prefix backend', 'Installing backend dependencies')) {
        process.exit(1);
    }
    
    if (!runCommand('npm install --prefix frontend', 'Installing frontend dependencies')) {
        process.exit(1);
    }

    // Step 2: Create .env file
    if (!(await createEnvFile())) {
        rl.close();
        process.exit(1);
    }

    // Step 3: Create frontend files
    if (!createFrontendFiles()) {
        process.exit(1);
    }

    // Step 4: Generate SSL certificates for production HTTPS
    const sslSuccess = generateSSLCertificates();
    
    // Step 5: Setup database
    const dbSuccess = setupDatabase();

    log('\n🎉 Setup completed!', 'bold');
    log('', 'reset');
    
    if (dbSuccess) {
        log('✅ Everything is ready to go!', 'green');
        log('🎉 Fresh clean database with no test data', 'green');
        
        // Step 5: Build and start the application
        log('\n🚀 Building and starting the application...', 'blue');
        
        if (!runCommand('npm run build', 'Building production version')) {
            log('⚠️  Build failed, starting in development mode instead', 'yellow');
            // Start development mode
            log('\n🎆 Starting in development mode...', 'blue');
            log('🌎 Opening browser at http://localhost:3001', 'green');
            log('\n✨ Your Secure Asset Portal is ready!', 'bold');
            log('', 'reset');
            rl.close();
            
            // Start dev server (this will keep running)
            require('child_process').spawn('npm', ['run', 'dev'], {
                stdio: 'inherit',
                shell: true,
                detached: false
            });
            return;
        }
        
        // Start production server
        log('\n🎆 Starting production server...', 'blue');
        
        const serverUrl = sslSuccess ? 'https://localhost:3000' : 'http://localhost:3000';
        const protocol = sslSuccess ? 'HTTPS' : 'HTTP';
        
        log(`🌎 Opening browser at ${serverUrl}`, 'green');
        log(`🔒 Protocol: ${protocol} ${sslSuccess ? '(SSL certificates generated)' : '(No SSL)'}`, 'blue');
        log('\n✨ Your Secure Asset Portal is ready!', 'bold');
        log('', 'reset');
        rl.close();
        
        // Open browser after a delay
        setTimeout(() => {
            try {
                require('child_process').exec(`open ${serverUrl}`);
            } catch (error) {
                log(`⚠️  Could not auto-open browser. Please visit: ${serverUrl}`, 'yellow');
            }
        }, 3000);
        
        // Start production server (this will keep running)
        process.env.NODE_ENV = 'production';
        require('child_process').spawn('npm', ['run', 'start:backend'], {
            stdio: 'inherit',
            shell: true,
            detached: false
        });
        
    } else {
        log('⚠️  Setup completed with database warnings', 'yellow');
        log('📝 Manual database setup may be needed:', 'yellow');
        log('   1. Install PostgreSQL if not installed', 'reset');
        log('   2. Create database: createdb secure_asset_portal', 'reset');
        log('   3. Run schema: psql -d secure_asset_portal -f database/schema.sql', 'reset');
        log('   4. Then run: npm run dev', 'blue');
        log('', 'reset');
        rl.close();
    }
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
    log(`❌ Setup failed: ${error.message}`, 'red');
    rl.close();
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    log(`❌ Setup failed: ${error.message}`, 'red');
    rl.close();
    process.exit(1);
});

main().catch((error) => {
    log(`❌ Setup failed: ${error.message}`, 'red');
    rl.close();
    process.exit(1);
});
