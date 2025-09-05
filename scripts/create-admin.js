#!/usr/bin/env node

/**
 * Admin Account Creation Script
 * 
 * This script creates admin accounts directly in the database.
 * Only run this script with direct database access - never expose this functionality via API.
 * 
 * Usage:
 *   node scripts/create-admin.js
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');

// Database configuration - adjust as needed
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'secure_asset_portal',
  password: process.env.DB_PASSWORD || 'password123',
  port: process.env.DB_PORT || 5432,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function hiddenQuestion(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let password = '';
    process.stdin.on('data', function(char) {
      char = char + '';
      
      switch(char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f': // backspace
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
}

async function createAdmin() {
  console.log('🔐 Secure Asset Portal - Admin Account Creation\n');
  console.log('⚠️  WARNING: This script creates administrative accounts.');
  console.log('   Only run this on secure systems with direct database access.\n');
  
  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');
    
    const email = await question('Enter admin email address: ');
    
    if (!email || !email.includes('@')) {
      console.log('❌ Invalid email address');
      process.exit(1);
    }
    
    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      if (user.role === 'admin') {
        console.log('⚠️  User already exists and is already an admin');
        const updateChoice = await question('Do you want to reset their password? (y/N): ');
        if (updateChoice.toLowerCase() !== 'y') {
          console.log('Operation cancelled');
          process.exit(0);
        }
      } else {
        console.log('⚠️  User already exists as a regular user');
        const promoteChoice = await question('Do you want to promote them to admin? (y/N): ');
        if (promoteChoice.toLowerCase() === 'y') {
          await pool.query(
            'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
            ['admin', email.toLowerCase()]
          );
          console.log('✅ User promoted to admin successfully');
          process.exit(0);
        } else {
          console.log('Operation cancelled');
          process.exit(0);
        }
      }
    }
    
    const firstName = await question('Enter first name: ');
    const lastName = await question('Enter last name: ');
    const password = await hiddenQuestion('Enter password (min 8 characters): ');
    
    if (!firstName || !lastName) {
      console.log('❌ First name and last name are required');
      process.exit(1);
    }
    
    if (password.length < 8) {
      console.log('❌ Password must be at least 8 characters long');
      process.exit(1);
    }
    
    const confirmPassword = await hiddenQuestion('Confirm password: ');
    
    if (password !== confirmPassword) {
      console.log('❌ Passwords do not match');
      process.exit(1);
    }
    
    console.log('\n📋 Admin Account Details:');
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${firstName} ${lastName}`);
    console.log(`   Role: admin`);
    
    const confirm = await question('\nCreate this admin account? (y/N): ');
    
    if (confirm.toLowerCase() !== 'y') {
      console.log('Operation cancelled');
      process.exit(0);
    }
    
    // Hash password
    console.log('🔒 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create or update user
    if (existingUser.rows.length > 0) {
      // Update existing user
      await pool.query(
        `UPDATE users 
         SET password = $1, role = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE email = $3`,
        [passwordHash, 'admin', email.toLowerCase()]
      );
      console.log('✅ Admin account updated successfully');
    } else {
      // Create new user
      const userId = uuidv4();
      await pool.query(
        `INSERT INTO users (id, email, first_name, last_name, password, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, email.toLowerCase(), firstName, lastName, passwordHash, 'admin']
      );
      console.log('✅ Admin account created successfully');
    }
    
    console.log('\n🎉 Admin setup complete!');
    console.log(`   Admin can now login at: /admin/login`);
    console.log(`   Email: ${email}`);
    
  } catch (error) {
    console.error('❌ Error creating admin account:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await pool.end();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\nOperation cancelled by user');
  rl.close();
  pool.end().then(() => process.exit(0));
});

// Run the script
if (require.main === module) {
  createAdmin().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { createAdmin };
