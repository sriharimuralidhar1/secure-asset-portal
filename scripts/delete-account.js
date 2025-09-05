#!/usr/bin/env node

/**
 * Delete Account Script
 * 
 * Safely delete user accounts and all associated data
 * Usage: node scripts/delete-account.js [email]
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

async function deleteAccount(email) {
  try {
    console.log(`🔍 Looking up user: ${email}`);
    
    // Find user and get their data
    const userResult = await pool.query(`
      SELECT 
        id, 
        email, 
        first_name, 
        last_name,
        created_at,
        (SELECT COUNT(*) FROM assets WHERE user_id = users.id) as asset_count,
        (SELECT COUNT(*) FROM passkeys WHERE user_id = users.id) as passkey_count
      FROM users 
      WHERE email = $1
    `, [email]);
    
    if (userResult.rows.length === 0) {
      console.log(`❌ User not found: ${email}`);
      return;
    }
    
    const user = userResult.rows[0];
    
    console.log('\n👤 User Information:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
    console.log(`   Assets: ${user.asset_count}`);
    console.log(`   Passkeys: ${user.passkey_count}`);
    
    console.log('\n⚠️  WARNING: This will permanently delete:');
    console.log('   - User account');
    console.log('   - All user assets');
    console.log('   - All user passkeys');
    console.log('   - All audit logs for this user');
    console.log('   - This action cannot be undone!');
    
    const confirm1 = await question(`\nType the user's email to confirm deletion: `);
    
    if (confirm1 !== email) {
      console.log('❌ Email confirmation did not match. Operation cancelled.');
      return;
    }
    
    const confirm2 = await question('Type "DELETE" to confirm: ');
    
    if (confirm2 !== 'DELETE') {
      console.log('❌ Confirmation failed. Operation cancelled.');
      return;
    }
    
    console.log('\n🗑️  Deleting account...');
    
    // Begin transaction
    await pool.query('BEGIN');
    
    try {
      // Delete in order (foreign keys will cascade, but being explicit)
      const auditResult = await pool.query('DELETE FROM audit_logs WHERE user_id = $1', [user.id]);
      console.log(`   📝 Deleted ${auditResult.rowCount} audit log entries`);
      
      const passkeyResult = await pool.query('DELETE FROM passkeys WHERE user_id = $1', [user.id]);
      console.log(`   🔑 Deleted ${passkeyResult.rowCount} passkeys`);
      
      const assetResult = await pool.query('DELETE FROM assets WHERE user_id = $1', [user.id]);
      console.log(`   💰 Deleted ${assetResult.rowCount} assets`);
      
      const userDeleteResult = await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
      console.log(`   👤 Deleted user account`);
      
      // Commit transaction
      await pool.query('COMMIT');
      
      console.log(`\n✅ Account successfully deleted: ${email}`);
      
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error deleting account:', error.message);
    throw error;
  }
}

async function main() {
  try {
    const email = process.argv[2];
    
    if (!email) {
      console.log('🗑️  Delete User Account\n');
      console.log('Usage: node scripts/delete-account.js [email]');
      console.log('Example: node scripts/delete-account.js user@example.com');
      console.log('\nThis script will permanently delete a user account and all associated data.');
      return;
    }
    
    // Basic email validation
    if (!email.includes('@') || !email.includes('.')) {
      console.log('❌ Invalid email format');
      return;
    }
    
    await deleteAccount(email);
    
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

module.exports = { deleteAccount };
