# 🗄️ Database Documentation & Commands

This document provides complete database commands and queries for interacting with the Secure Asset Portal PostgreSQL database.

## 📋 Table of Contents
- [Database Connection](#database-connection)
- [User Management](#user-management)
- [Admin Operations](#admin-operations)
- [Asset Management](#asset-management)
- [Passkey Management](#passkey-management)
- [Audit Logs](#audit-logs)
- [Database Maintenance](#database-maintenance)
- [Troubleshooting](#troubleshooting)

## 🔗 Database Connection

### Connection String
```bash
# Default development connection
psql postgresql://postgres:password123@localhost:5432/secure_asset_portal
```

### Environment Variables
```bash
# Set these in your shell for easier access
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="secure_asset_portal"
export DB_USER="postgres"
export DB_PASS="password123"

# Then connect with:
psql postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME
```

### Quick Connection Commands
```bash
# Connect to database
psql -h localhost -p 5432 -U postgres -d secure_asset_portal

# Connect and run single query
psql postgresql://postgres:password123@localhost:5432/secure_asset_portal -c "SELECT COUNT(*) FROM users;"

# Connect with environment variable
PGPASSWORD=password123 psql -h localhost -U postgres -d secure_asset_portal
```

## 👥 User Management

### View All Users
```sql
-- List all users with basic info
SELECT 
    id, 
    email, 
    first_name, 
    last_name, 
    role, 
    two_factor_enabled,
    created_at,
    last_login
FROM users 
ORDER BY created_at DESC;

-- Count users by role
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role;
```

### Find Specific User
```sql
-- Find user by email
SELECT * FROM users WHERE email = 'user@example.com';

-- Find user by ID
SELECT * FROM users WHERE id = 'your-user-id';

-- Find users with 2FA enabled
SELECT email, first_name, last_name, two_factor_enabled 
FROM users 
WHERE two_factor_enabled = true;
```

### User Details with Statistics
```sql
-- User with asset count and total value
SELECT 
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.created_at,
    COUNT(a.id) as asset_count,
    COALESCE(SUM(a.current_value), 0) as total_portfolio_value
FROM users u
LEFT JOIN assets a ON u.id = a.user_id
WHERE u.email = 'user@example.com'
GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.created_at;
```

### Create User (Manual)
```sql
-- Create new user (use the script instead for production)
INSERT INTO users (
    id, 
    email, 
    first_name, 
    last_name, 
    password, 
    role, 
    created_at, 
    updated_at
) VALUES (
    gen_random_uuid()::text,
    'new@example.com',
    'First',
    'Last',
    '$2b$12$hashedpasswordhere',  -- Use bcrypt hash
    'user',
    NOW(),
    NOW()
);
```

### Update User
```sql
-- Update user role
UPDATE users SET role = 'admin', updated_at = NOW() WHERE email = 'user@example.com';

-- Enable 2FA for user
UPDATE users SET two_factor_enabled = true, updated_at = NOW() WHERE email = 'user@example.com';

-- Update last login
UPDATE users SET last_login = NOW() WHERE email = 'user@example.com';
```

### Delete User
```sql
-- ⚠️ DANGER: Delete user and all related data
BEGIN;
DELETE FROM audit_logs WHERE user_id = 'user-id';
DELETE FROM passkeys WHERE user_id = 'user-id';
DELETE FROM assets WHERE user_id = 'user-id';
DELETE FROM users WHERE id = 'user-id';
COMMIT;
```

## 🔐 Admin Operations

### List Admin Users
```sql
-- All admin users
SELECT 
    id,
    email, 
    first_name, 
    last_name, 
    created_at,
    last_login,
    two_factor_enabled
FROM users 
WHERE role = 'admin' 
ORDER BY created_at;
```

### Create Admin User
```bash
# Use the script (recommended)
node scripts/create-test-admin.js

# Or manually (requires bcrypt hash)
psql postgresql://postgres:password123@localhost:5432/secure_asset_portal -c "
INSERT INTO users (id, email, first_name, last_name, password, role, created_at, updated_at) 
VALUES (
    gen_random_uuid()::text,
    'admin@example.com',
    'Admin',
    'User',
    '\$2b\$12\$your.bcrypt.hashed.password.here',
    'admin',
    NOW(),
    NOW()
);"
```

### Promote User to Admin
```sql
-- Promote existing user to admin
UPDATE users 
SET role = 'admin', updated_at = NOW() 
WHERE email = 'user@example.com';
```

### Admin Activity Report
```sql
-- Recent admin actions
SELECT 
    u.email,
    al.action,
    al.resource_type,
    al.details,
    al.timestamp
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE u.role = 'admin'
ORDER BY al.timestamp DESC
LIMIT 50;
```

## 💰 Asset Management

### View All Assets
```sql
-- All assets with user info
SELECT 
    a.id,
    u.email,
    a.name,
    a.asset_type,
    a.current_value,
    a.acquisition_cost,
    a.acquisition_date,
    a.created_at
FROM assets a
JOIN users u ON a.user_id = u.id
ORDER BY a.current_value DESC;
```

### Assets by Category
```sql
-- Assets grouped by type
SELECT 
    asset_type,
    COUNT(*) as count,
    SUM(current_value) as total_value,
    AVG(current_value) as avg_value
FROM assets
GROUP BY asset_type
ORDER BY total_value DESC;
```

### User's Portfolio
```sql
-- Specific user's assets
SELECT 
    name,
    asset_type,
    current_value,
    acquisition_cost,
    acquisition_date,
    (current_value - acquisition_cost) as gain_loss
FROM assets
WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com')
ORDER BY current_value DESC;
```

### Portfolio Summary
```sql
-- Portfolio summary by user
SELECT 
    u.email,
    u.first_name,
    u.last_name,
    COUNT(a.id) as asset_count,
    SUM(a.current_value) as portfolio_value,
    SUM(a.acquisition_cost) as total_invested,
    SUM(a.current_value - a.acquisition_cost) as total_gain_loss
FROM users u
LEFT JOIN assets a ON u.id = a.user_id
GROUP BY u.id, u.email, u.first_name, u.last_name
ORDER BY portfolio_value DESC;
```

## 🔑 Passkey Management

### View All Passkeys
```sql
-- All passkeys with user info
SELECT 
    p.id,
    u.email,
    p.name,
    p.credential_device_type,
    p.credential_backed_up,
    p.created_at,
    p.last_used,
    p.counter
FROM passkeys p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC;
```

### User's Passkeys
```sql
-- Passkeys for specific user
SELECT 
    name,
    credential_device_type,
    credential_backed_up,
    created_at,
    last_used,
    counter
FROM passkeys
WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com')
ORDER BY created_at DESC;
```

### Passkey Statistics
```sql
-- Passkey usage statistics
SELECT 
    COUNT(*) as total_passkeys,
    COUNT(DISTINCT user_id) as users_with_passkeys,
    AVG(counter) as avg_usage_count,
    COUNT(*) FILTER (WHERE last_used > NOW() - INTERVAL '30 days') as used_last_30_days
FROM passkeys;
```

### Remove Old/Unused Passkeys
```sql
-- Find unused passkeys (older than 90 days, never used)
SELECT 
    p.id,
    u.email,
    p.name,
    p.created_at
FROM passkeys p
JOIN users u ON p.user_id = u.id
WHERE p.last_used IS NULL 
AND p.created_at < NOW() - INTERVAL '90 days';

-- Delete specific passkey (be careful!)
DELETE FROM passkeys WHERE id = 'passkey-id';
```

## 📊 Audit Logs

### Recent Activity
```sql
-- Last 50 activities
SELECT 
    u.email,
    al.action,
    al.resource_type,
    al.resource_id,
    al.details,
    al.timestamp
FROM audit_logs al
JOIN users u ON al.user_id = u.id
ORDER BY al.timestamp DESC
LIMIT 50;
```

### Activity by Action Type
```sql
-- Activity counts by action
SELECT 
    action,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as unique_users
FROM audit_logs
GROUP BY action
ORDER BY count DESC;
```

### User Activity Report
```sql
-- Activity for specific user
SELECT 
    action,
    resource_type,
    details,
    timestamp
FROM audit_logs
WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com')
ORDER BY timestamp DESC
LIMIT 100;
```

### Security Events
```sql
-- Login/authentication events
SELECT 
    u.email,
    al.action,
    al.details,
    al.timestamp
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.action IN ('login', 'passkey_login', 'registration', 'failed_login')
ORDER BY al.timestamp DESC
LIMIT 100;
```

## 🔧 Database Maintenance

### Table Sizes
```sql
-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Database Statistics
```sql
-- General database stats
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_users,
    (SELECT COUNT(*) FROM assets) as total_assets,
    (SELECT COUNT(*) FROM passkeys) as total_passkeys,
    (SELECT COUNT(*) FROM audit_logs) as total_audit_logs;
```

### Index Usage
```sql
-- Check index usage
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Clean Old Audit Logs
```sql
-- Remove audit logs older than 1 year (be careful!)
DELETE FROM audit_logs 
WHERE timestamp < NOW() - INTERVAL '1 year';

-- Count logs by age
SELECT 
    DATE_TRUNC('month', timestamp) as month,
    COUNT(*) as log_count
FROM audit_logs
GROUP BY month
ORDER BY month DESC;
```

## 🔍 Troubleshooting

### Check Database Connection
```bash
# Test connection
pg_isready -h localhost -p 5432

# Check PostgreSQL status (macOS)
brew services list | grep postgres

# Start PostgreSQL (macOS)
brew services start postgresql
```

### Schema Verification
```sql
-- Verify all tables exist
\dt

-- Check table structure
\d users
\d assets
\d passkeys
\d audit_logs

-- Check for missing columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

### Data Integrity Checks
```sql
-- Check for orphaned records
SELECT 'Orphaned assets' as check_name, COUNT(*) as count
FROM assets a
LEFT JOIN users u ON a.user_id = u.id
WHERE u.id IS NULL

UNION ALL

SELECT 'Orphaned passkeys' as check_name, COUNT(*) as count
FROM passkeys p
LEFT JOIN users u ON p.user_id = u.id
WHERE u.id IS NULL

UNION ALL

SELECT 'Orphaned audit logs' as check_name, COUNT(*) as count
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE u.id IS NULL;
```

### Performance Monitoring
```sql
-- Long running queries
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Table activity stats
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables
WHERE schemaname = 'public';
```

## 📝 Quick Reference Commands

### One-Liners for Common Tasks

```bash
# Count all users
psql postgresql://postgres:password123@localhost:5432/secure_asset_portal -c "SELECT COUNT(*) FROM users;"

# List admin users
psql postgresql://postgres:password123@localhost:5432/secure_asset_portal -c "SELECT email, first_name, last_name FROM users WHERE role = 'admin';"

# Check user's assets
psql postgresql://postgres:password123@localhost:5432/secure_asset_portal -c "SELECT name, current_value FROM assets WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');"

# Recent audit logs
psql postgresql://postgres:password123@localhost:5432/secure_asset_portal -c "SELECT u.email, al.action, al.timestamp FROM audit_logs al JOIN users u ON al.user_id = u.id ORDER BY al.timestamp DESC LIMIT 10;"

# Database backup
pg_dump postgresql://postgres:password123@localhost:5432/secure_asset_portal > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
psql postgresql://postgres:password123@localhost:5432/secure_asset_portal < backup_file.sql
```

## 🚨 Important Notes

- **Always backup before major changes**: `pg_dump` before deleting data
- **Use transactions**: Wrap multiple operations in `BEGIN; ... COMMIT;`
- **Test queries**: Run SELECT before UPDATE/DELETE
- **Password security**: Never store plain text passwords
- **Admin access**: Admin operations are logged in audit_logs

## 🔐 Security Best Practices

1. **Connection Security**: Use SSL in production
2. **User Passwords**: Always use bcrypt hashed passwords
3. **Role Verification**: Check user roles before admin operations
4. **Audit Everything**: All changes should be logged
5. **Regular Backups**: Automated daily backups recommended
6. **Access Control**: Limit database access to necessary users only

---

**Need help?** Run any of these commands in your terminal to interact with the database directly!
