# 🛡️ Secure Asset Portal

> A modern, security-focused financial asset management application with **passkey biometric authentication**

> ⚡ **New**: Super simple setup! Just run `npm run setup && npm run dev` → [Quick Start](#quick-start)

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![fido2-lib](https://img.shields.io/badge/fido2--lib-Passkeys-purple.svg)](https://github.com/webauthn-open-source/fido2-lib)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ Features

🔐 **Advanced Authentication**
- **Passkey Biometric Login** - TouchID, FaceID, Windows Hello support via **fido2-lib**
- **Two-Factor Authentication** - TOTP with QR codes using Speakeasy
- **Traditional Password Login** - Secure bcrypt hashing
- **Multiple Device Support** - Add passkeys to all your devices

💰 **Asset Management**
- Track diverse financial assets (stocks, crypto, real estate, etc.)
- Portfolio analytics and reporting
- Category-based organization
- Value history tracking

🛡️ **Enterprise Security**
- Row-level security (RLS) in PostgreSQL
- Comprehensive audit logging
- Rate limiting and DDoS protection
- Security headers (CSP, HSTS, etc.)
- Input validation and sanitization

📧 **Smart Notifications**
- Welcome emails with 2FA setup
- Passkey confirmation emails
- Security alerts and notifications

## 📊 Asset Categories

- **Real Estate**: Properties, land, commercial real estate
- **Investment Accounts**: 401k, IRA, brokerage accounts
- **Bank Accounts**: Checking, savings, CDs, money market
- **Cryptocurrencies**: Digital assets and wallets
- **Physical Assets**: Precious metals, collectibles, vehicles
- **Business Interests**: Partnerships, private equity, business ownership
- **Insurance**: Life insurance policies with cash value

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

### 🚀 Super Simple Setup

1. **Clone and setup:**
   ```bash
   git clone https://github.com/yourusername/secure-asset-portal.git
   cd secure-asset-portal
   npm run setup
   ```
   
2. **Start the app:**
   ```bash
   npm run dev
   ```
   
3. **Open in browser:**
   - 🌐 Frontend: http://localhost:3001
   - 🔌 Backend API: http://localhost:3000

### ✨ What the setup script does:

✅ Installs all dependencies (backend + frontend)  
✅ Creates `.env` with secure auto-generated keys  
✅ Sets up PostgreSQL database automatically  
✅ Applies database schema  
✅ Ready to run in 30 seconds!  

### 🧪 Test Biometric Login

1. **Register** at http://localhost:3001/register
2. **Setup 2FA** with the QR code
3. **Add passkey** (TouchID/FaceID/Windows Hello)
4. **Login** with biometrics!

> 📝 **Passkey Support**: TouchID, FaceID, Windows Hello, fingerprint, security keys

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

```bash
# Run all tests
npm test

# Run tests by service
npm run test:backend   # Jest tests for API
npm run test:frontend  # React Testing Library tests

# Run individual test suites
cd backend && npm test
cd frontend && npm test

# Run tests with coverage
npm run test:coverage
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

```bash
# Build and start all services
npm run docker:up

# Build containers
npm run docker:build

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

### Manual Production Build

```bash
# Build both services
npm run build

# Start production server
npm start
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
```bash
# Lint all code
npm run lint

# Format all code with Prettier
npm run format

# Security audit
npm run security:audit
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
   npm run install:all
   cp .env.example .env
   # Configure your .env file
   npm run db:setup
   ```

4. **Make Changes**
   - Write code following existing patterns
   - Add tests for new functionality
   - Update documentation as needed
   - Follow security best practices

5. **Test Changes**
   ```bash
   npm run lint
   npm run format  
   npm test
   npm run security:audit
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

### Account Monitoring Commands

```bash
# View all user accounts
node scripts/view-accounts.js list

# Show database statistics
node scripts/view-accounts.js stats

# View asset overview by user
node scripts/view-accounts.js assets

# View passkey overview by user
node scripts/view-accounts.js passkeys

# Show recent user activity
node scripts/view-accounts.js recent
```

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
