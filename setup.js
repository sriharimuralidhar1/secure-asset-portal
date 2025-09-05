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

    // Step 3: Setup database
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
