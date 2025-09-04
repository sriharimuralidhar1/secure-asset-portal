## Project Overview

The Secure Asset Portal is a full-stack financial asset management application built with a Node.js/Express backend, React frontend, and PostgreSQL database. The application emphasizes security features including multi-factor authentication, data encryption, role-based access control, and comprehensive audit logging.

## Architecture

### Multi-Service Architecture
- **Backend**: Node.js/Express API server (`backend/`)
- **Frontend**: React SPA with React Router (`frontend/`)
- **Database**: PostgreSQL with comprehensive schema (`database/schema.sql`)
- **Containerization**: Docker Compose orchestration for all services

### Key Security Components
- **Authentication**: JWT tokens with bcrypt password hashing
- **2FA**: TOTP implementation using Speakeasy library
- **Rate Limiting**: Express middleware with stricter limits on auth endpoints
- **Security Headers**: Helmet.js with CSP policies
- **Session Management**: Redis-backed session storage
- **Audit Logging**: Complete activity tracking for compliance

### Database Architecture
- **Row Level Security (RLS)**: PostgreSQL policies ensure users only access their own data
- **UUID Primary Keys**: Enhanced security over sequential IDs
- **Comprehensive Relationships**: Users, Assets, Categories, Advisors, Audit Logs
- **Value History Tracking**: Time-series data for asset value changes
- **Materialized Views**: Performance-optimized summary queries

### Frontend Architecture
- **React Router v6**: Client-side routing with protected routes
- **Context API**: Authentication state management (`AuthContext`)
- **Styled Components**: Theme-based styling system
- **Form Handling**: React Hook Form with validation
- **Toast Notifications**: React Hot Toast for user feedback

## Common Development Commands

### Environment Setup
```bash
# Install all dependencies (root, backend, frontend)
npm run install:all

# Copy environment configuration
cp .env.example .env
# Edit .env with your database credentials and JWT secret

# Set up database schema
npm run db:setup
# OR using psql directly:
psql -f database/schema.sql
```

### Development
```bash
# Start both frontend and backend in development mode
npm run dev

# Start services individually
npm run dev:backend  # Starts backend on port 3000
npm run dev:frontend # Starts frontend on port 3001

# Backend-only development (uses nodemon)
cd backend && npm run dev

# Frontend-only development
cd frontend && npm start
```

### Testing
```bash
# Run all tests
npm test

# Run tests by service
npm run test:backend   # Jest tests for API
npm run test:frontend  # React Testing Library tests

# Run individual test suites
cd backend && npm test
cd frontend && npm test
```

### Building and Production
```bash
# Build both services
npm run build

# Build individually
npm run build:backend
npm run build:frontend

# Production start (backend only)
npm start
```

### Docker Development
```bash
# Start all services with Docker
npm run docker:up

# Build containers
npm run docker:build

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

### Database Operations
```bash
# Run database migrations (Sequelize)
cd backend && npm run migrate

# Seed database with initial data
cd backend && npm run seed

# Connect to database directly
psql postgresql://postgres:password123@localhost:5432/secure_asset_portal
```

### Code Quality
```bash
# Lint all code
npm run lint

# Format all code with Prettier
npm run format

# Security audit
npm run security:audit
```

## Key Directories and Files

### Backend Structure
- `backend/server.js` - Main Express application with security middleware
- `backend/api/` - REST API endpoints (auth, assets, users, reports)
- `backend/api/auth.js` - Authentication endpoints with 2FA support
- `backend/models/` - Sequelize data models
- `backend/middleware/` - Custom middleware for auth, validation, logging

### Frontend Structure  
- `frontend/src/App.js` - Main React app with routing and theme provider
- `frontend/src/context/AuthContext.js` - Authentication state management
- `frontend/src/pages/` - Main application pages
- `frontend/src/components/` - Reusable UI components

### Database
- `database/schema.sql` - Complete PostgreSQL schema with RLS policies
- Database includes comprehensive audit logging, user sessions, asset tracking

## Security Considerations

### Development Security
- JWT secrets must be properly configured in production
- Database credentials should use environment variables
- 2FA secrets are generated per user and stored securely
- All password operations use bcrypt with 12 salt rounds

### API Security Features
- Rate limiting: 100 requests/15min general, 5 requests/15min for auth
- Helmet.js security headers with strict CSP
- CORS configured for specific frontend origin
- Input validation using Joi and express-validator
- SQL injection protection via parameterized queries

### Database Security
- Row Level Security ensures data isolation
- Audit logs track all user actions
- Password reset tokens have expiration
- Failed login attempt tracking with account lockout

## Environment Configuration

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Minimum 32 character secret for JWT signing
- `FRONTEND_URL` - CORS origin for frontend
- `REDIS_URL` - Redis connection for session storage
- `NODE_ENV` - Environment (development/production)

## Testing Strategy

### Backend Tests
- API endpoint testing with Supertest
- Authentication flow testing
- Input validation testing
- Database integration tests

### Frontend Tests  
- Component unit tests with React Testing Library
- User interaction testing
- Authentication flow testing
- Form validation testing

The application is designed with security-first principles and follows financial industry best practices for handling sensitive asset data.
