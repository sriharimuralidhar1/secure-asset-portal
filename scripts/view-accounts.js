#!/usr/bin/env node

/**
 * Account Management Script
 * 
 * View and manage user accounts from the backend
 * Usage: node scripts/view-accounts.js [command]
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'secure_asset_portal',
  password: process.env.DB_PASSWORD || 'password123',
  port: process.env.DB_PORT || 5432,
});

const commands = {
  async list() {
    console.log('👥 User Accounts:\n');
    
    const result = await pool.query(`
      SELECT 
        id,
        email, 
        first_name, 
        last_name, 
        two_factor_enabled,
        created_at,
        last_login,
        (SELECT COUNT(*) FROM assets WHERE user_id = users.id) as asset_count,
        (SELECT COUNT(*) FROM passkeys WHERE user_id = users.id) as passkey_count
      FROM users 
      ORDER BY created_at DESC
    `);
    
    if (result.rows.length === 0) {
      console.log('No users found.');
      return;
    }
    
    console.table(result.rows.map(user => ({
      Email: user.email,
      Name: `${user.first_name} ${user.last_name}`,
      '2FA': user.two_factor_enabled ? '✅' : '❌',
      Assets: user.asset_count,
      Passkeys: user.passkey_count,
      Created: new Date(user.created_at).toLocaleDateString(),
      'Last Login': user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'
    })));
    
    console.log(`\n📊 Total Users: ${result.rows.length}`);
  },
  
  async stats() {
    console.log('📊 Database Statistics:\n');
    
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE two_factor_enabled = true) as users_with_2fa,
        (SELECT COUNT(*) FROM assets) as total_assets,
        (SELECT COUNT(*) FROM passkeys) as total_passkeys,
        (SELECT COUNT(*) FROM audit_logs) as total_audit_logs,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days') as users_this_week,
        (SELECT COUNT(*) FROM users WHERE last_login > NOW() - INTERVAL '30 days') as active_users_30d
    `);
    
    const s = stats.rows[0];
    console.log(`👥 Total Users: ${s.total_users}`);
    console.log(`🔒 Users with 2FA: ${s.users_with_2fa}`);
    console.log(`💰 Total Assets: ${s.total_assets}`);
    console.log(`🔑 Total Passkeys: ${s.total_passkeys}`);
    console.log(`📝 Audit Log Entries: ${s.total_audit_logs}`);
    console.log(`📈 New Users (7 days): ${s.users_this_week}`);
    console.log(`🟢 Active Users (30 days): ${s.active_users_30d}`);
  },
  
  async assets() {
    console.log('💰 Asset Overview:\n');
    
    const assets = await pool.query(`
      SELECT 
        u.email,
        u.first_name,
        u.last_name,
        COUNT(a.id) as asset_count,
        COALESCE(SUM(a.current_value), 0) as total_value
      FROM users u
      LEFT JOIN assets a ON u.id = a.user_id
      GROUP BY u.id, u.email, u.first_name, u.last_name
      HAVING COUNT(a.id) > 0
      ORDER BY total_value DESC
    `);
    
    if (assets.rows.length === 0) {
      console.log('No assets found.');
      return;
    }
    
    console.table(assets.rows.map(user => ({
      Email: user.email,
      Name: `${user.first_name} ${user.last_name}`,
      'Asset Count': user.asset_count,
      'Total Value': `$${parseFloat(user.total_value).toLocaleString()}`
    })));
  },
  
  async recent() {
    console.log('🕐 Recent Activity:\n');
    
    const activity = await pool.query(`
      SELECT 
        u.email,
        al.action,
        al.resource_type,
        al.timestamp
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      ORDER BY al.timestamp DESC
      LIMIT 20
    `);
    
    if (activity.rows.length === 0) {
      console.log('No recent activity found.');
      return;
    }
    
    console.table(activity.rows.map(log => ({
      Email: log.email,
      Action: log.action,
      Resource: log.resource_type,
      Time: new Date(log.timestamp).toLocaleString()
    })));
  },
  
  async passkeys() {
    console.log('🔑 Passkey Overview:\n');
    
    const passkeys = await pool.query(`
      SELECT 
        u.email,
        u.first_name,
        u.last_name,
        p.name as passkey_name,
        p.credential_device_type,
        p.created_at,
        p.last_used
      FROM passkeys p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);
    
    if (passkeys.rows.length === 0) {
      console.log('No passkeys found.');
      return;
    }
    
    console.table(passkeys.rows.map(pk => ({
      User: pk.email,
      Name: `${pk.first_name} ${pk.last_name}`,
      'Passkey Name': pk.passkey_name,
      'Device Type': pk.credential_device_type,
      Created: new Date(pk.created_at).toLocaleDateString(),
      'Last Used': pk.last_used ? new Date(pk.last_used).toLocaleDateString() : 'Never'
    })));
  },
  
  async help() {
    console.log(`
🛡️ Secure Asset Portal - Account Management

COMMANDS:
  list          List all user accounts with details
  stats         Show database statistics
  assets        Show asset overview by user
  passkeys      Show passkey overview by user
  recent        Show recent activity (last 20 actions)
  help          Show this help message

EXAMPLES:
  node scripts/view-accounts.js list
  node scripts/view-accounts.js stats
  node scripts/view-accounts.js assets
  node scripts/view-accounts.js passkeys

DATABASE COMMANDS:
  For direct database access, see DATABASE_README.md
  Quick connection: psql postgresql://postgres:password123@localhost:5432/secure_asset_portal
    `);
  }
};

async function main() {
  try {
    const command = process.argv[2] || 'list';
    const arg = process.argv[3];
    
    if (commands[command]) {
      await commands[command](arg);
    } else {
      console.log(`❌ Unknown command: ${command}`);
      await commands.help();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { commands };
