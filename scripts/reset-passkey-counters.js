#!/usr/bin/env node

/**
 * Reset Passkey Counters Script
 * 
 * Reset all passkey counters to 0 - useful after database resets in development
 * Usage: node scripts/reset-passkey-counters.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'secure_asset_portal',
  password: process.env.DB_PASSWORD || 'password123',
  port: process.env.DB_PORT || 5432,
});

async function resetPasskeyCounters() {
  try {
    console.log('🔑 Resetting Passkey Counters...\n');
    
    // Get current passkey info
    const beforeResult = await pool.query(`
      SELECT 
        p.id,
        p.counter,
        p.name,
        u.email
      FROM passkeys p
      JOIN users u ON p.user_id = u.id
      ORDER BY u.email, p.name
    `);
    
    if (beforeResult.rows.length === 0) {
      console.log('✅ No passkeys found to reset.');
      return;
    }
    
    console.log('📊 Current Passkey State:');
    console.table(beforeResult.rows.map(pk => ({
      User: pk.email,
      'Passkey Name': pk.name,
      'Current Counter': pk.counter
    })));
    
    // Reset all counters to 0
    const updateResult = await pool.query('UPDATE passkeys SET counter = 0');
    
    console.log(`\n✅ Reset ${updateResult.rowCount} passkey counters to 0`);
    
    // Verify the reset
    const afterResult = await pool.query(`
      SELECT 
        p.id,
        p.counter,
        p.name,
        u.email
      FROM passkeys p
      JOIN users u ON p.user_id = u.id
      ORDER BY u.email, p.name
    `);
    
    console.log('\n📊 Updated Passkey State:');
    console.table(afterResult.rows.map(pk => ({
      User: pk.email,
      'Passkey Name': pk.name,
      'New Counter': pk.counter
    })));
    
    console.log('\n🎯 Passkey counters reset successfully!');
    console.log('💡 This resolves "counter rollback detected" errors after database resets.');
    
  } catch (error) {
    console.error('❌ Error resetting passkey counters:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🔑 Secure Asset Portal - Passkey Counter Reset\n');
    
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  WARNING: This script is intended for development use only.');
      console.log('❌ Refusing to run in production environment.');
      console.log('💡 Set NODE_ENV=development if this is not a production system.');
      return;
    }
    
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');
    
    await resetPasskeyCounters();
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { resetPasskeyCounters };
