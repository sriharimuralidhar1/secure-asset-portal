require('dotenv').config({ path: '../.env' });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// Trust proxy for rate limiting when behind reverse proxy
app.set('trust proxy', 1);

// Dynamic security configuration based on environment
// To enable HTTPS in production:
// 1. Set ENABLE_HTTPS=true in .env
// 2. Configure your reverse proxy (nginx, Apache) or load balancer for SSL termination
// 3. Set HSTS_* variables as needed for your domain
// Note: This app doesn't handle SSL certificates directly - use a reverse proxy
const isHttpsEnabled = process.env.ENABLE_HTTPS === 'true';
const hstsConfig = isHttpsEnabled ? {
  maxAge: parseInt(process.env.HSTS_MAX_AGE) || 31536000, // 1 year default
  includeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS === 'true',
  preload: process.env.HSTS_PRELOAD === 'true'
} : false;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      // Allow HTTP in development, HTTPS in production
      upgradeInsecureRequests: isHttpsEnabled ? [] : null
    },
  },
  hsts: hstsConfig,
  // Only force HTTPS if explicitly enabled
  forceHTTPS: isHttpsEnabled
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
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests from localhost, 127.0.0.1, and local network IPs (HTTP and HTTPS)
    if (!origin || 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1') || 
        /^https?:\/\/192\.168\.[0-9]{1,3}\.[0-9]{1,3}(:[0-9]{1,5})?$/.test(origin) ||
        /^https?:\/\/10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(:[0-9]{1,5})?$/.test(origin) ||
        /^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]{1,3}\.[0-9]{1,3}(:[0-9]{1,5})?$/.test(origin) ||
        origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from React build (production)
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '..', 'frontend', 'build');
  app.use(express.static(buildPath));
  console.log('📦 Serving static files from:', buildPath);
}

// API Routes
app.use('/api/auth', require('./api/auth'));
app.use('/api/assets', require('./api/assets'));
app.use('/api/users', require('./api/users'));
app.use('/api/reports', require('./api/reports'));
app.use('/api/', require('./api/network'));

// Initialize database connection
const { testConnection } = require('./data/database');

// Health check endpoint with database connectivity
app.get('/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.status(dbStatus ? 200 : 503).json({
    status: dbStatus ? 'healthy' : 'unhealthy',
    database: dbStatus ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Database status endpoint (development only)
app.get('/debug/db-status', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  try {
    const { query } = require('./data/database');
    
    const userCount = await query('SELECT COUNT(*) FROM users');
    const assetCount = await query('SELECT COUNT(*) FROM assets');
    const passkeyCount = await query('SELECT COUNT(*) FROM passkeys');
    const auditCount = await query('SELECT COUNT(*) FROM audit_logs');
    
    res.json({
      database: 'PostgreSQL',
      counts: {
        users: parseInt(userCount.rows[0].count),
        assets: parseInt(assetCount.rows[0].count),
        passkeys: parseInt(passkeyCount.rows[0].count),
        auditLogs: parseInt(auditCount.rows[0].count)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database query failed',
      message: error.message
    });
  }
});

// Catch-all handler: serve React app for non-API routes (production)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Don't serve React app for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({
        error: 'API endpoint not found',
        message: 'The requested API resource does not exist'
      });
    }
    
    const buildPath = path.join(__dirname, '..', 'frontend', 'build', 'index.html');
    res.sendFile(buildPath);
  });
} else {
  // 404 handler for development (API only mode)
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Endpoint not found',
      message: 'The requested resource does not exist'
    });
  });
}

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

// Initialize database and start server
const startServer = async () => {
  try {
    const { testConnection } = require('./data/database');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Server not started.');
      process.exit(1);
    }
    
    let server;
    const protocol = isHttpsEnabled ? 'https' : 'http';
    const serverUrl = `${protocol}://localhost:${PORT}`;
    
    if (isHttpsEnabled) {
      // Try to load SSL certificates
      try {
        const keyPath = process.env.SSL_KEY_PATH || path.join(__dirname, '..', 'certs', 'key.pem');
        const certPath = process.env.SSL_CERT_PATH || path.join(__dirname, '..', 'certs', 'cert.pem');
        
        if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
          throw new Error('SSL certificates not found. Run setup again to generate certificates.');
        }
        
        const privateKey = fs.readFileSync(keyPath, 'utf8');
        const certificate = fs.readFileSync(certPath, 'utf8');
        
        const credentials = { key: privateKey, cert: certificate };
        server = https.createServer(credentials, app);
        
        console.log('🔒 SSL certificates loaded successfully');
      } catch (sslError) {
        console.error('❌ SSL setup failed:', sslError.message);
        console.log('🔄 Falling back to HTTP mode...');
        server = http.createServer(app);
      }
    } else {
      server = http.createServer(app);
    }
    
    server.listen(PORT, () => {
      console.log(`🚀 Secure Asset Portal running on port ${PORT}`);
      console.log(`🛡️  Security middleware enabled`);
      
      // HTTPS Configuration Status
      if (isHttpsEnabled && server instanceof https.Server) {
        console.log(`🔒 HTTPS: Enabled (HSTS: ${hstsConfig ? 'ON' : 'OFF'})`);
        console.log(`🔐 Access via: https://localhost:${PORT}`);
        console.log(`✨ SSL certificates: Self-signed for development`);
      } else {
        console.log(`🔓 HTTPS: Disabled (Development mode)`);
        console.log(`🔗 Access via: http://localhost:${PORT}`);
      }
      
      if (process.env.NODE_ENV === 'production') {
        console.log(`📱 Frontend + API served together`);
        console.log(`🔒 Production mode: Static files from React build`);
      } else {
        console.log(`🔒 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
        console.log(`🔧 Development mode: API only`);
      }
      
      console.log(`🗄️  PostgreSQL database connected`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
};

startServer();
