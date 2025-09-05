#!/usr/bin/env node

/**
 * Clear Database Script
 * 
 * Completely clear all data from the database (keep schema)
 * Usage: node scripts/clear-database.js
 */

const { Pool } = require('pg');
const readline = require('readline');

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

async function getDatabaseStats() {
  const stats = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM assets) as total_assets,
      (SELECT COUNT(*) FROM passkeys) as total_passkeys,
      (SELECT COUNT(*) FROM audit_logs) as total_audit_logs
  `);
  
  return stats.rows[0];
}

async function clearDatabase() {
  try {
    console.log('📊 Current Database State:');
    const beforeStats = await getDatabaseStats();
    
    console.log(`   👥 Users: ${beforeStats.total_users}`);
    console.log(`   💰 Assets: ${beforeStats.total_assets}`);
    console.log(`   🔑 Passkeys: ${beforeStats.total_passkeys}`);
    console.log(`   📝 Audit Logs: ${beforeStats.total_audit_logs}`);
    
    const totalRecords = parseInt(beforeStats.total_users) + 
                        parseInt(beforeStats.total_assets) + 
                        parseInt(beforeStats.total_passkeys) + 
                        parseInt(beforeStats.total_audit_logs);
    
    if (totalRecords === 0) {
      console.log('\n✅ Database is already empty!');
      return;
    }
    
    console.log(`\n⚠️  WARNING: This will permanently delete ALL DATA:`);
    console.log('   - All user accounts');
    console.log('   - All assets and portfolios');
    console.log('   - All passkeys and authentication data');
    console.log('   - All audit logs and history');
    console.log('   - This action cannot be undone!');
    console.log('\n🔒 Database structure (tables/indexes) will be preserved.');
    
    const confirm1 = await question('\nType "CLEAR DATABASE" to confirm: ');
    
    if (confirm1 !== 'CLEAR DATABASE') {
      console.log('❌ Confirmation failed. Operation cancelled.');
      return;
    }
    
    const confirm2 = await question('Are you absolutely sure? Type "YES" to proceed: ');
    
    if (confirm2 !== 'YES') {
      console.log('❌ Final confirmation failed. Operation cancelled.');
      return;
    }
    
    console.log('\n🗑️  Clearing database...');
    
    // Begin transaction
    await pool.query('BEGIN');
    
    try {
      // Clear all data (order matters due to foreign keys)
      console.log('   📝 Clearing audit logs...');
      const auditResult = await pool.query('TRUNCATE audit_logs RESTART IDENTITY CASCADE');
      
      console.log('   🔑 Clearing passkeys...');
      const passkeyResult = await pool.query('TRUNCATE passkeys CASCADE');
      
      console.log('   💰 Clearing assets...');
      const assetResult = await pool.query('TRUNCATE assets CASCADE');
      
      console.log('   👥 Clearing users...');
      const userResult = await pool.query('TRUNCATE users CASCADE');
      
      // Commit transaction
      await pool.query('COMMIT');
      
      console.log('\n✅ Database cleared successfully!');
      
      // Show final stats
      const afterStats = await getDatabaseStats();
      console.log('\n📊 Database State After Clearing:');
      console.log(`   👥 Users: ${afterStats.total_users}`);
      console.log(`   💰 Assets: ${afterStats.total_assets}`);
      console.log(`   🔑 Passkeys: ${afterStats.total_passkeys}`);
      console.log(`   📝 Audit Logs: ${afterStats.total_audit_logs}`);
      
      console.log('\n✅ Database cleared successfully!');
      console.log('🎯 Database is now ready for fresh data!');
      
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    throw error;
  }
}

async function resetSequences() {
  try {
    console.log('🔄 Resetting auto-increment sequences...');
    
    // Reset audit_logs sequence (only table with SERIAL primary key)
    await pool.query("SELECT setval('audit_logs_id_seq', 1, false)");
    
    console.log('✅ Sequences reset to start from 1');
    
  } catch (error) {
    console.warn('⚠️  Could not reset sequences:', error.message);
  }
}

async function main() {
  try {
    console.log('🧹 Secure Asset Portal - Database Cleaner\n');
    
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');
    
    await clearDatabase();
    await resetSequences();
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await pool.end();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Operation cancelled by user');
  rl.close();
  await pool.end();
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { clearDatabase };
