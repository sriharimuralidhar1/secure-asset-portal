# 🛡️ Secure Asset Portal

> A straightforward financial asset tracker with biometric login - because remembering passwords is annoying.

> ⚡ **Quick start**: Just run `npm run setup && npm run dev` and you're good to go!
> 📋 **All commands**: See [Available npm Scripts](#available-npm-scripts) for the complete list
> 🛠️ **Admin tools**: See [Utility Scripts](#utility-scripts) for database management

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![fido2-lib](https://img.shields.io/badge/fido2--lib-Passkeys-purple.svg)](https://github.com/webauthn-open-source/fido2-lib)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ Features

🔐 **Easy Login Options**
- **Biometric Login** - Use your fingerprint, face, or Windows Hello instead of passwords
- **Two-Factor Authentication** - Extra security with authenticator apps
- **Regular Password** - Good old username/password if you prefer
- **Multiple Devices** - Set up biometric login on your laptop, phone, whatever

💰 **Track Your Stuff**
- Keep tabs on your investments, crypto, real estate, whatever you own
- See how your portfolio is doing with charts and reports
- Organize everything by categories that make sense to you
- Watch how your assets change value over time

🛡️ **Security That Actually Works**
- Your data stays private (users can only see their own stuff)
- Everything gets logged so you know what happened when
- Protection against spam and attacks
- All the boring security headers that keep hackers out
- Input checking so nobody can mess with the database

📧 **Helpful Emails**
- Welcome message when you sign up (with 2FA setup instructions)
- Confirmation when you add biometric login
- Heads up if something security-related happens

## 📊 What You Can Track

- **Real Estate**: Your house, rental properties, that plot of land you bought
- **Investment Accounts**: 401k, IRA, trading accounts, all that good stuff
- **Bank Accounts**: Checking, savings, CDs - basically where your money lives
- **Crypto**: Bitcoin, Ethereum, whatever coins you're holding
- **Physical Stuff**: Gold, collectibles, cars, anything worth money
- **Business**: If you own part of a company or side business
- **Insurance**: Life insurance that builds cash value

## 🏗️ Project Structure

```
secure-asset-portal/
├── backend/           # API server and business logic
│   ├── api/          # REST API endpoints
│   ├── auth/         # Authentication and authorization
│   ├── models/       # Data models and schemas
│   ├── middleware/   # Security and validation middleware
│   └── utils/        # Utility functions
├── frontend/         # User interface
│   ├── src/         # React/Vue application source
│   ├── public/      # Static assets
│   └── components/  # Reusable UI components
├── database/        # Database files and migrations
│   ├── migrations/  # Database schema changes
│   └── seeds/       # Initial data setup
├── docs/           # Documentation
│   ├── api/        # API documentation
│   └── user-guide/ # User documentation
└── tests/          # Test suites
```

## ⚡ Quick Start

### Prerequisites

- **Node.js v18+** - [Download here](https://nodejs.org/)
- **PostgreSQL** - [Download here](https://www.postgresql.org/) or use Docker
- **Modern browser** with WebAuthn support

### 🚀 Getting Started

1. **Download and setup:**
   ```bash
   git clone https://github.com/yourusername/secure-asset-portal.git
   cd secure-asset-portal
   npm run setup
   ```
   
2. **Start it up:**
   ```bash
   npm run dev
   ```
   
3. **Check it out:**
   - App: http://localhost:3001
   - API: http://localhost:3000 (if you're curious)

### ✨ The setup script handles the boring stuff:

✅ Downloads everything you need  
✅ Creates config files with random secure keys  
✅ Sets up the database  
✅ Gets everything talking to each other  
✅ Should be ready in about 30 seconds!

> See [**📋 Available npm Scripts**](#available-npm-scripts) for a complete guide to all commands

### 🧪 Try the Biometric Login

1. **Sign up** at http://localhost:3001/register
2. **Set up 2FA** (scan the QR code with your phone's authenticator app)
3. **Add biometric login** (it'll ask for TouchID/FaceID/fingerprint)
4. **Log in with your finger/face** next time!

> Works with TouchID, FaceID, Windows Hello, fingerprint readers, and security keys

### 🔧 Troubleshooting

**No PostgreSQL?**
```bash
# macOS
brew install postgresql && brew services start postgresql

# Docker
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres

# Then run setup again
npm run setup
```

**Port conflicts?** Set `PORT=4000` in your `.env`

**Need detailed docs?** See [QUICKSTART.md](QUICKSTART.md)

## 🧪 Testing

### Running Tests

For all testing commands, see the [Available npm Scripts](#available-npm-scripts) section. Basic testing:

```bash
npm test                # Run all tests (backend + frontend)
npm run test:backend    # Jest tests for API only
npm run test:frontend   # React Testing Library tests only
```

### Individual Test Suites
```bash
# Run backend tests directly
cd backend && npm test

# Run frontend tests directly
cd frontend && npm test
```

### Test Coverage
- **Backend**: API endpoints, authentication flows, input validation
- **Frontend**: Component rendering, user interactions, authentication state
- **Integration**: End-to-end passkey authentication flows

## 🚀 Production Deployment

### Environment Variables (Production)

```env
# Production Database
DATABASE_URL="postgresql://user:pass@prod-db:5432/secure_asset_portal"

# Strong JWT Secret (32+ characters)
JWT_SECRET="your-production-jwt-secret-very-long-and-secure"

# Production URLs
FRONTEND_URL="https://yourdomain.com"
BACKEND_URL="https://api.yourdomain.com"

# Email Service (production credentials)
EMAIL_USER="noreply@yourdomain.com"
EMAIL_PASSWORD="your-production-email-password"

# Redis (production)
REDIS_URL="redis://prod-redis:6379"

# Environment
NODE_ENV="production"
```

### Docker Deployment

For all Docker commands, see the [Available npm Scripts](#available-npm-scripts) section.

```bash
npm run docker:up      # Build and start all services
npm run docker:build   # Build containers
npm run docker:logs    # View logs
npm run docker:down    # Stop services
```

### Manual Production Build

```bash
npm run build   # Build both services for production
npm start       # Start production server
```

## 🛡️ Security Features

### Authentication Security
- **Passkey Authentication**: FIDO2/WebAuthn biometric login via **fido2-lib**
- **Multi-Factor Authentication**: TOTP with QR codes using **Speakeasy**
- **Password Security**: bcrypt hashing with 12 salt rounds
- **JWT Tokens**: Secure token-based API authentication
- **Session Management**: Redis-backed secure sessions

### Application Security
- **Row Level Security**: PostgreSQL RLS policies
- **Rate Limiting**: 100 req/15min general, 5 req/15min auth endpoints
- **Security Headers**: Helmet.js with CSP, HSTS, etc.
- **Input Validation**: Joi and express-validator
- **Audit Logging**: Complete activity tracking
- **CORS Protection**: Configured for specific origins

### Data Protection
- **Encryption**: All sensitive data encrypted at rest and in transit
- **UUID Primary Keys**: Enhanced security over sequential IDs
- **SQL Injection Protection**: Parameterized queries only
- **XSS Prevention**: Content Security Policy headers
- **HTTPS Enforcement**: Required in production

## 📝 Development Guidelines

### Code Quality
For all available development commands, see the [Available npm Scripts](#available-npm-scripts) section. Key quality tools:

```bash
npm run lint         # Lint all code
npm run format       # Format with Prettier
npm run security:audit   # Security dependency audit
```

### Best Practices
- Follow secure coding practices
- Write comprehensive tests for all features
- Document all API endpoints
- Use environment variables for sensitive configuration
- Regular dependency updates and security scans
- Adhere to existing code patterns and conventions

## 🔧 Troubleshooting

### Common Issues

**Database Connection Issues:**
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Create database if it doesn't exist
createdb secure_asset_portal
```

**Passkey Registration Fails:**
- Ensure you're using HTTPS in production (required for WebAuthn)
- Check browser compatibility (Chrome 67+, Firefox 60+, Safari 14+)
- Verify `FRONTEND_URL` matches the actual domain

**Email Notifications Not Working:**
- Double-check email credentials in `.env`
- For Gmail, use App Passwords instead of regular password
- Ensure less secure app access is enabled (if using basic auth)

**JWT Token Issues:**
- Ensure `JWT_SECRET` is at least 32 characters
- Check token expiration settings
- Verify CORS configuration matches frontend URL

### Debug Mode
```bash
# Enable debug logging
DEBUG=app:* npm run dev

# Check API health
curl http://localhost:3000/api/health
```

## 📋 Available npm Scripts

The project includes a comprehensive set of npm scripts to help with development, testing, building, and maintenance tasks.

### Setup and Installation

```bash
# Run the complete setup process (install dependencies, setup database, etc.)
npm run setup

# Install dependencies for all packages (root, backend, frontend)
npm run install:all

# Setup the database schema
npm run db:setup

# Reset the database (drop, create, and setup schema)
npm run db:reset

# Create an admin user
npm run admin:create
```

### Development

```bash
# Start both frontend and backend in development mode
npm run dev

# Start development with Brave browser automatically
npm run dev:brave

# Start backend only in development mode
npm run dev:backend

# Start frontend only in development mode
npm run dev:frontend

# Start frontend with Brave browser
npm run dev:frontend:brave

# Open the application in Brave browser
npm run open:brave
```

### Building and Production

```bash
# Build both frontend and backend for production
npm run build

# Build only the backend
npm run build:backend

# Build only the frontend
npm run build:frontend

# Start production server (backend only)
npm start

# Start production backend server explicitly
npm run start:backend
```

### Testing

```bash
# Run all tests (backend and frontend)
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend
```

### Docker Operations

```bash
# Start all services with Docker
npm run docker:up

# Build Docker containers
npm run docker:build

# View Docker logs
npm run docker:logs

# Stop Docker services
npm run docker:down
```

### Code Quality

```bash
# Lint code (backend and frontend)
npm run lint

# Format code with Prettier
npm run format

# Run security audit on dependencies
npm run security:audit
```

## 🛠️ Utility Scripts

The project includes several Node.js utility scripts in the `/scripts` directory for database management and user administration:

### Account Management

```bash
# View all user accounts with details
node scripts/view-accounts.js list

# Show database statistics (users, assets, passkeys, etc.)
node scripts/view-accounts.js stats

# View asset overview by user
node scripts/view-accounts.js assets

# View passkey overview by user  
node scripts/view-accounts.js passkeys

# Show recent activity (last 20 actions)
node scripts/view-accounts.js recent

# Show help for all view-accounts commands
node scripts/view-accounts.js help
```

### Database Management

```bash
# Delete a specific user account and all their data
node scripts/delete-account.js user@example.com

# Clear entire database (keeps schema, removes all data)
node scripts/clear-database.js

# Reset passkey counters (useful after dev database resets)
node scripts/reset-passkey-counters.js
```

### Examples

```bash
# Quick database overview
node scripts/view-accounts.js stats

# See who has assets
node scripts/view-accounts.js assets

# Check recent user activity
node scripts/view-accounts.js recent

# Clean slate for testing
node scripts/clear-database.js
```

> **⚠️ Warning**: The `clear-database.js` and `delete-account.js` scripts permanently delete data. Use with caution!
>
> **💡 Tip**: These scripts are perfect for development, testing, and database maintenance tasks.

## 🏢 Architecture

### Technology Stack
- **Backend**: Node.js, Express.js, **fido2-lib** (FIDO2/WebAuthn implementation)
- **Frontend**: React 18, React Router v6, Styled Components
- **Database**: PostgreSQL 14+ with Row Level Security
- **Authentication**: JWT, **fido2-lib** for passkeys, Speakeasy for TOTP (2FA)
- **Session Storage**: Redis (production) / Memory (development)
- **Email**: Nodemailer with Gmail/SMTP support

### Key Components
```
backend/
├── server.js           # Express app setup with security middleware
├── api/
│   ├── auth.js        # Authentication routes (register, login, 2FA, passkeys)
│   ├── assets.js      # Asset management endpoints
│   └── users.js       # User profile management
├── middleware/        # Security, validation, and logging middleware
└── utils/            # Database helpers, email service, crypto utilities

frontend/src/
├── App.js            # Main app with routing and theme provider
├── context/
│   └── AuthContext.js # Authentication state management
├── pages/            # Main application pages
│   ├── Register.js   # User registration with email verification
│   ├── Login.js      # Traditional login
│   ├── PasskeyLogin.js # Biometric authentication
│   └── Dashboard.js  # Main user dashboard
└── components/       # Reusable UI components
```

## 🤝 Contributing

### Development Workflow

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/secure-asset-portal.git
   cd secure-asset-portal
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Setup Development Environment**
   ```bash
   npm run install:all   # Install all dependencies
   cp .env.example .env  # Create environment file
   # Configure your .env file with your local settings
   npm run db:setup      # Setup database schema
   ```
   
   See the [Available npm Scripts](#available-npm-scripts) section for more commands.

4. **Make Changes**
   - Write code following existing patterns
   - Add tests for new functionality
   - Update documentation as needed
   - Follow security best practices

5. **Test Changes**
   ```bash
   npm run lint           # Check code style
   npm run format         # Format code
   npm test               # Run all tests
   npm run security:audit # Check for vulnerabilities
   ```

6. **Submit Pull Request**
   - Ensure all tests pass
   - Include clear description of changes
   - Reference any related issues

### Code Standards
- **JavaScript**: ES6+, async/await preferred
- **React**: Functional components with hooks
- **Styling**: Styled Components with theme consistency
- **Security**: Always validate inputs, use parameterized queries
- **Testing**: Write tests for new features and bug fixes

## 📜 API Reference

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Password login
- `POST /api/auth/passkey-register` - Register new passkey
- `POST /api/auth/passkey-login` - Authenticate with passkey
- `POST /api/auth/enable-2fa` - Enable two-factor auth
- `POST /api/auth/verify-2fa` - Verify TOTP code

### Asset Management
- `GET /api/assets` - List user assets
- `POST /api/assets` - Create new asset
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset
- `GET /api/assets/categories` - List asset categories

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/audit-log` - View activity history

### Admin Management
- `GET /api/admin/users` - List all users (admin only)
- `DELETE /api/admin/users/:id` - Delete user account (admin only)

## 📊 Account Monitoring (Backend)

**Simple Design**: Pure user portal with backend monitoring scripts for observability.

For all account monitoring commands, see the [🛠️ Utility Scripts](#utility-scripts) section above.

### Database Access

For direct database management, see [DATABASE_README.md](DATABASE_README.md) for comprehensive commands and queries.

```bash
# Quick database connection
psql postgresql://postgres:password123@localhost:5432/secure_asset_portal
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/secure-asset-portal/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/secure-asset-portal/discussions)  
- **Security Issues**: Please report privately via email

## 🚀 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced portfolio analytics
- [ ] Real-time asset price integration
- [ ] Multi-language support
- [ ] Advanced reporting and exports
- [ ] Third-party advisor integrations
- [ ] Enhanced audit and compliance features

---

**Built with ❤️ for secure financial asset management**
