#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

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

function createEnvFile() {
    const envPath = path.join(__dirname, '.env');
    
    if (fs.existsSync(envPath)) {
        log('⚠️  .env file already exists, skipping creation', 'yellow');
        return true;
    }

    const jwtSecret = generateSecureKey(32);
    const sessionSecret = generateSecureKey(32);

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

# Two-Factor Authentication
TWO_FACTOR_SERVICE_NAME=Secure Asset Portal
TWO_FACTOR_ISSUER=Secure Asset Portal

# Email Configuration (optional - leave empty to disable emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

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

    // Try to create database
    try {
        execSync('createdb secure_asset_portal', { stdio: 'pipe' });
        log('✅ Created database: secure_asset_portal', 'green');
    } catch (error) {
        if (error.message.includes('already exists')) {
            log('✅ Database already exists: secure_asset_portal', 'green');
        } else {
            log('⚠️  Could not create database (might need different credentials)', 'yellow');
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
    
    if (!runCommand('npm install --prefix backend', 'Installing backend dependencies')) {
        process.exit(1);
    }
    
    if (!runCommand('npm install --prefix frontend', 'Installing frontend dependencies')) {
        process.exit(1);
    }

    // Step 2: Create .env file
    if (!createEnvFile()) {
        process.exit(1);
    }

    // Step 3: Create frontend files
    if (!createFrontendFiles()) {
        process.exit(1);
    }

    // Step 4: Setup database
    const dbSuccess = setupDatabase();

    log('\n🎉 Setup completed!', 'bold');
    log('', 'reset');
    
    if (dbSuccess) {
        log('✅ Everything is ready to go!', 'green');
        log('🚀 Run: npm run dev', 'blue');
    } else {
        log('⚠️  Setup completed with database warnings', 'yellow');
        log('📝 Manual database setup may be needed:', 'yellow');
        log('   1. Install PostgreSQL if not installed', 'reset');
        log('   2. Create database: createdb secure_asset_portal', 'reset');
        log('   3. Run schema: psql -d secure_asset_portal -f database/schema.sql', 'reset');
        log('   4. Then run: npm run dev', 'blue');
    }
    
    log('', 'reset');
    log('📖 View at: http://localhost:3001', 'blue');
    log('🔌 API at: http://localhost:3000', 'blue');
    log('', 'reset');
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
    log(`❌ Setup failed: ${error.message}`, 'red');
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    log(`❌ Setup failed: ${error.message}`, 'red');
    process.exit(1);
});

main().catch((error) => {
    log(`❌ Setup failed: ${error.message}`, 'red');
    process.exit(1);
});
