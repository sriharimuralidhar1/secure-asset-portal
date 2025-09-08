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

// Check and prompt for email configuration if needed
async function checkAndConfigureEmail() {
    log('\n📧 Checking email configuration...', 'blue');
    
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        log('⚠️  .env file not found, will be created with email setup', 'yellow');
        return await configureEmail();
    }
    
    try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const smtpUser = envContent.match(/SMTP_USER=(.*)$/m)?.[1]?.trim();
        const smtpPass = envContent.match(/SMTP_PASS=(.*)$/m)?.[1]?.trim();
        
        // Check if email is configured (has both user and password)
        if (!smtpUser || !smtpPass || smtpUser === '' || smtpPass === '') {
            log('📧 Email is not configured or incomplete', 'yellow');
            log('💡 Let\'s set up email for notifications and registration emails', 'blue');
            
            const setupNow = await question('\nWould you like to configure email now? (y/n): ');
            
            if (setupNow.toLowerCase() === 'y' || setupNow.toLowerCase() === 'yes') {
                const emailConfig = await configureEmail();
                
                // Update the existing .env file with email configuration
                await updateEmailInEnv(emailConfig);
                
                return emailConfig;
            } else {
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
        } else {
            log('✅ Email is already configured', 'green');
            const appName = envContent.match(/FROM_EMAIL=([^<]*)/)?.[1]?.trim() || 'Secure Asset Portal';
            return {
                SMTP_HOST: envContent.match(/SMTP_HOST=(.*)$/m)?.[1]?.trim() || 'smtp.gmail.com',
                SMTP_PORT: envContent.match(/SMTP_PORT=(.*)$/m)?.[1]?.trim() || '587',
                SMTP_SECURE: envContent.match(/SMTP_SECURE=(.*)$/m)?.[1]?.trim() || 'false',
                SMTP_USER: smtpUser,
                SMTP_PASS: smtpPass,
                FROM_EMAIL: envContent.match(/FROM_EMAIL=(.*)$/m)?.[1]?.trim() || `${appName} <noreply@example.com>`,
                APP_NAME: appName
            };
        }
    } catch (error) {
        log(`⚠️  Could not read .env file: ${error.message}`, 'yellow');
        return await configureEmail();
    }
}

async function updateEmailInEnv(emailConfig) {
    const envPath = path.join(__dirname, '.env');
    
    try {
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Update or add email configuration
        const updates = [
            ['SMTP_HOST', emailConfig.SMTP_HOST],
            ['SMTP_PORT', emailConfig.SMTP_PORT],
            ['SMTP_SECURE', emailConfig.SMTP_SECURE],
            ['SMTP_USER', emailConfig.SMTP_USER],
            ['SMTP_PASS', emailConfig.SMTP_PASS],
            ['FROM_EMAIL', emailConfig.FROM_EMAIL],
            ['TWO_FACTOR_SERVICE_NAME', emailConfig.APP_NAME],
            ['TWO_FACTOR_ISSUER', emailConfig.APP_NAME]
        ];
        
        updates.forEach(([key, value]) => {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${key}=${value}`);
            } else {
                envContent += `\n${key}=${value}`;
            }
        });
        
        fs.writeFileSync(envPath, envContent);
        log('✅ Updated .env file with email configuration', 'green');
    } catch (error) {
        log(`❌ Failed to update .env file: ${error.message}`, 'red');
    }
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

# WebAuthn Configuration (development)
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=Secure Asset Portal

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

// Create .env file with the provided email configuration
async function createEnvFileWithConfig(emailConfig) {
    const envPath = path.join(__dirname, '.env');
    
    if (fs.existsSync(envPath)) {
        log('✅ .env file already exists', 'green');
        return true;
    }

    const jwtSecret = generateSecureKey(32);
    const sessionSecret = generateSecureKey(32);

    const envContent = `# Auto-generated environment configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Database Configuration (using default PostgreSQL setup)
DATABASE_URL=postgresql://postgres:password123@localhost:5432/secure_asset_portal
DB_HOST=localhost
DB_PORT=5432
DB_NAME=secure_asset_portal
DB_USER=postgres
DB_PASSWORD=password123
DB_SSL=false

# Security Configuration (auto-generated secure keys)
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12
SESSION_SECRET=${sessionSecret}

# WebAuthn Configuration (development)
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=Secure Asset Portal

# Two-Factor Authentication
TWO_FACTOR_SERVICE_NAME=${emailConfig.APP_NAME}
TWO_FACTOR_ISSUER=${emailConfig.APP_NAME}

# Email Configuration
SMTP_HOST=${emailConfig.SMTP_HOST}
SMTP_PORT=${emailConfig.SMTP_PORT}
SMTP_SECURE=${emailConfig.SMTP_SECURE}
SMTP_USER=${emailConfig.SMTP_USER}
SMTP_PASS=${emailConfig.SMTP_PASS}
FROM_EMAIL=${emailConfig.FROM_EMAIL}

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
SWAGGER_PATH=/api-docs
`;

    try {
        fs.writeFileSync(envPath, envContent);
        log('✅ Created .env file with email configuration', 'green');
        return true;
    } catch (error) {
        log(`❌ Failed to create .env file: ${error.message}`, 'red');
        return false;
    }
}

// SSL certificates removed - using simple HTTP development setup

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

    // Step 2: Check and configure email if needed
    const emailConfig = await checkAndConfigureEmail();

    // Step 2.1: Create .env file with email configuration
    if (!(await createEnvFileWithConfig(emailConfig))) {
        rl.close();
        process.exit(1);
    }

    // Step 3: Create frontend files
    if (!createFrontendFiles()) {
        process.exit(1);
    }

    // HTTPS setup removed - using simple development mode
    
    // Step 5: Setup database
    const dbSuccess = setupDatabase();

    log('\n🎉 Setup completed!', 'bold');
    log('', 'reset');
    
    if (dbSuccess) {
        log('✅ Everything is ready to go!', 'green');
        log('🎉 Fresh clean database with no test data', 'green');
        
        // Step 5: Build and start the application
        log('\n🚀 Building and starting the application...', 'blue');
        
        // Skip production build - use development mode
        log('\n🎆 Starting in development mode...', 'blue');
        log('🌎 Frontend will open at http://localhost:3001', 'green');
        log('🔧 Backend API running at http://localhost:3000', 'green');
        log('\n✨ Your Secure Asset Portal is ready!', 'bold');
        log('', 'reset');
        rl.close();
        
        // Start dev server (this will keep running)
        require('child_process').spawn('npm', ['run', 'dev'], {
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
