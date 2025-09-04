const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Mock user storage (replace with database in production)
let users = [];

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  body('firstName').isLength({ min: 2 }).trim().escape(),
  body('lastName').isLength({ min: 2 }).trim().escape(),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
];

// Register endpoint
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate 2FA secret
    const secret = speakeasy.generateSecret({
      name: `Secure Asset Portal (${email})`,
      issuer: 'Secure Asset Portal'
    });

    // Create user
    const user = {
      id: Date.now().toString(),
      email,
      firstName,
      lastName,
      password: hashedPassword,
      twoFactorSecret: secret.base32,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    users.push(user);

    // Generate QR code for 2FA setup
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      twoFactor: {
        secret: secret.base32,
        qrCode: qrCodeUrl
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'Unable to create account'
    });
  }
});

// Login endpoint
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, twoFactorToken } = req.body;

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password incorrect'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password incorrect'
      });
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorToken) {
        return res.status(200).json({
          requiresTwoFactor: true,
          message: 'Two-factor authentication required'
        });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorToken,
        window: 1
      });

      if (!verified) {
        return res.status(401).json({
          error: 'Invalid two-factor token',
          message: 'The provided two-factor authentication token is invalid'
        });
      }
    }

    // Update last login
    user.lastLogin = new Date().toISOString();

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: 'user'
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Unable to authenticate'
    });
  }
});

// Enable 2FA endpoint
router.post('/enable-2fa', async (req, res) => {
  try {
    const { email, token } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (!verified) {
      return res.status(400).json({
        error: 'Invalid token',
        message: 'The provided token is invalid'
      });
    }

    user.twoFactorEnabled = true;

    res.json({
      message: 'Two-factor authentication enabled successfully'
    });

  } catch (error) {
    console.error('2FA enable error:', error);
    res.status(500).json({
      error: 'Failed to enable 2FA'
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  // In a real application, you might want to blacklist the token
  res.json({
    message: 'Logged out successfully'
  });
});

module.exports = router;
