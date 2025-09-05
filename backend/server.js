require('dotenv').config({ path: '../.env' });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting when behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Relaxed rate limiting for auth endpoints (passkey registration needs multiple requests)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // increased from 5 to 20 for passkey flows
  message: 'Too many authentication attempts, please try again later.',
  skip: (req) => {
    // Skip rate limiting for passkey endpoints during development
    return req.path.includes('/passkey/');
  }
});
app.use('/api/auth/', authLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', require('./api/auth'));
app.use('/api/assets', require('./api/assets'));
app.use('/api/users', require('./api/users'));
app.use('/api/reports', require('./api/reports'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Debug endpoint to view current database state (development only)
app.get('/debug', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const { mockDatabase, getAllUsers } = require('./data/mockDatabase');
  
  const debugData = {
    users: getAllUsers(),
    userCount: mockDatabase.users.length,
    passkeyCount: mockDatabase.passkeys.length,
    assets: mockDatabase.assets.length,
    auditLogs: mockDatabase.auditLogs.slice(-5) // Last 5 entries
  };
  
  res.json(debugData);
});

// Clear database endpoint (development only)
app.post('/debug/clear', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const { clearDatabase } = require('./data/mockDatabase');
  clearDatabase();
  
  res.json({ message: 'Database cleared successfully' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested resource does not exist'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Secure Asset Portal API running on port ${PORT}`);
  console.log(`🛡️  Security middleware enabled`);
  console.log(`🔒 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
});
