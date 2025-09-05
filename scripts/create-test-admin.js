#!/usr/bin/env node

/**
 * Simple Admin Creation for Testing
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'secure_asset_portal',
  password: process.env.DB_PASSWORD || 'password123',
  port: process.env.DB_PORT || 5432,
});

async function createTestAdmin() {
  try {
    console.log('🔐 Creating test admin account...');
    
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    const email = 'admin@secureportal.com';
    const firstName = 'Admin';
    const lastName = 'User';
    const password = 'Admin1234!';
    
    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      console.log('⚠️  Admin user already exists, updating password...');
      const passwordHash = await bcrypt.hash(password, 12);
      await pool.query(
        'UPDATE users SET password = $1, role = $2, updated_at = CURRENT_TIMESTAMP WHERE email = $3',
        [passwordHash, 'admin', email]
      );
      console.log('✅ Admin password updated');
    } else {
      console.log('👤 Creating new admin user...');
      const passwordHash = await bcrypt.hash(password, 12);
      const userId = uuidv4();
      
      await pool.query(
        `INSERT INTO users (id, email, first_name, last_name, password, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, email, firstName, lastName, passwordHash, 'admin']
      );
      console.log('✅ Admin account created');
    }
    
    console.log('\n🎉 Test admin ready!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Login at: http://localhost:3001/admin/login`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  createTestAdmin().catch(console.error);
}
