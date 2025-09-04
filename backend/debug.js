const { mockDatabase } = require('./data/mockDatabase');

// Debug script to view current users and assets
console.log('=== DEBUG: Current Mock Database State ===\n');

console.log('📧 USERS:');
if (mockDatabase.users.length === 0) {
  console.log('  No users registered yet');
} else {
  mockDatabase.users.forEach((user, index) => {
    console.log(`  ${index + 1}. User ID: ${user.id}`);
    console.log(`     Email: ${user.email}`);
    console.log(`     Name: ${user.firstName} ${user.lastName}`);
    console.log(`     Password Hash: ${user.password.substring(0, 20)}...`);
    console.log(`     2FA Enabled: ${user.twoFactorEnabled}`);
    console.log(`     2FA Secret: ${user.twoFactorSecret ? user.twoFactorSecret.substring(0, 10) + '...' : 'None'}`);
    console.log(`     Created: ${user.createdAt}`);
    console.log(`     Last Login: ${user.lastLogin || 'Never'}`);
    console.log('     ---');
  });
}

console.log('\n💰 ASSETS:');
if (mockDatabase.assets.length === 0) {
  console.log('  No assets created yet');
} else {
  mockDatabase.assets.forEach((asset, index) => {
    console.log(`  ${index + 1}. Asset ID: ${asset.id}`);
    console.log(`     User ID: ${asset.userId}`);
    console.log(`     Name: ${asset.name}`);
    console.log(`     Type: ${asset.type}`);
    console.log(`     Value: $${asset.value}`);
    console.log(`     Created: ${asset.createdAt}`);
    console.log('     ---');
  });
}

console.log('\n📋 AUDIT LOGS:');
if (mockDatabase.auditLogs.length === 0) {
  console.log('  No audit logs yet');
} else {
  mockDatabase.auditLogs.slice(-5).forEach((log, index) => {
    console.log(`  ${index + 1}. ${log.action} by User ${log.userId} at ${log.createdAt}`);
  });
  if (mockDatabase.auditLogs.length > 5) {
    console.log(`  ... and ${mockDatabase.auditLogs.length - 5} more entries`);
  }
}

console.log('\n=== End Debug Info ===');
