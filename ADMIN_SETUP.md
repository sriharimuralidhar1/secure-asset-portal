# Admin Account Setup

This document explains how to create and manage administrative accounts for the Secure Asset Portal.

## 🚨 Security Notice

**IMPORTANT**: Admin accounts should only be created by system administrators with direct database access. The admin creation functionality is intentionally **NOT** exposed through the web interface to prevent unauthorized admin account creation.

## Creating Admin Accounts

### Option 1: Using the Admin Creation Script (Recommended)

The easiest way to create admin accounts is using the provided script:

```bash
# Run the interactive admin creation script
npm run admin:create

# Or run directly
node scripts/create-admin.js
```

The script will:
- ✅ Test database connectivity
- ✅ Prompt for admin details (email, name, password)
- ✅ Hash passwords securely using bcrypt
- ✅ Check for existing users and offer to promote them
- ✅ Validate input and confirm before creating
- ✅ Handle password input securely (hidden typing)

### Option 2: Manual Database Command

You can also create admin accounts directly via SQL:

```sql
-- Replace values with actual admin details
INSERT INTO users (
    id, 
    email, 
    first_name, 
    last_name, 
    password_hash, 
    role, 
    email_verified,
    created_at, 
    updated_at
) VALUES (
    gen_random_uuid(),
    'admin@example.com',
    'Admin',
    'User',
    '$2b$12$YOUR_BCRYPT_HASHED_PASSWORD_HERE',
    'admin',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
```

To hash a password for manual insertion:
```bash
node -e "console.log(require('bcrypt').hashSync('your_password_here', 12))"
```

### Option 3: Promote Existing User

To promote an existing regular user to admin:

```sql
UPDATE users 
SET role = 'admin', updated_at = CURRENT_TIMESTAMP 
WHERE email = 'user@example.com';
```

## Admin Login Process

1. **Access Admin Login**: Navigate to `/admin/login` or click "🔐 Admin Login" from the regular login page

2. **Enter Credentials**: Use the admin email and password

3. **Two-Factor Authentication**: If enabled for the admin account, enter the 6-digit code

4. **Admin Console**: Successfully authenticated admins are redirected to `/admin`

## Admin Capabilities

Admins have access to:
- 📊 View all user accounts
- 🗑️ Delete user accounts (with confirmation)
- 📋 All actions are logged in the audit trail
- 🔒 Same security features as regular users (2FA, session management)

## Security Best Practices

### For System Administrators:
- 🔐 Only create admin accounts from secure, trusted systems
- 🔄 Use strong, unique passwords for admin accounts
- 🛡️ Enable 2FA for all admin accounts
- 📝 Keep a secure record of admin account details
- 🚫 Never expose admin creation functionality via web interface
- 🔍 Regularly audit admin account usage

### For Admin Users:
- 🔐 Use strong, unique passwords
- 📱 Enable two-factor authentication
- 🚪 Log out after each admin session
- 📊 Only perform necessary administrative actions
- 🚫 Don't share admin credentials

## Environment Variables

Ensure these environment variables are properly configured:

```bash
# Database connection
DB_USER=postgres
DB_HOST=localhost
DB_NAME=secure_asset_portal
DB_PASSWORD=your_db_password
DB_PORT=5432

# JWT configuration
JWT_SECRET=your_jwt_secret_here
```

## Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   - Verify PostgreSQL is running
   - Check database credentials in environment variables
   - Ensure database exists and schema is applied

2. **Admin Script Fails**
   - Check Node.js dependencies are installed: `npm install`
   - Verify database permissions
   - Check for typos in environment variables

3. **Can't Access Admin Console**
   - Verify user role is set to 'admin' in database
   - Check JWT_SECRET is configured
   - Clear browser cache and cookies

4. **Password Requirements**
   - Minimum 8 characters
   - Use strong passwords with mix of characters
   - bcrypt hashing with 12 salt rounds

## Removing Admin Access

To remove admin privileges from a user:

```sql
UPDATE users 
SET role = 'user', updated_at = CURRENT_TIMESTAMP 
WHERE email = 'former_admin@example.com';
```

Or delete the admin account entirely using the admin console interface.

---

## Emergency Access

If you lose admin access:
1. Use the admin creation script to create a new admin account
2. Or manually promote a user via direct database access
3. Contact system administrator with database access

**Remember**: Admin account creation is intentionally secure and requires system-level access to prevent unauthorized privilege escalation.
