const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
const { 
  generateRegistrationOptions, 
  verifyRegistrationResponse, 
  generateAuthenticationOptions, 
  verifyAuthenticationResponse 
} = require('@simplewebauthn/server');
const { findUser, addUser, updateUser, addAuditLog, findPasskeys, addPasskey, updatePasskey } = require('../data/mockDatabase');
const emailService = require('../services/emailService');
const router = express.Router();

// WebAuthn configuration
const rpName = 'Secure Asset Portal';
const rpID = process.env.NODE_ENV === 'production' 
  ? process.env.WEBAUTHN_RP_ID || 'secure-asset-portal.com' 
  : 'localhost';
const origin = process.env.NODE_ENV === 'production'
  ? process.env.FRONTEND_URL || 'https://secure-asset-portal.com'
  : 'http://localhost:3001';

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

    // Enhanced email validation
    const emailValidation = await emailService.isValidEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({
        error: 'Invalid email address',
        message: emailValidation.reason
      });
    }

    // Check if user already exists
    const existingUser = findUser({ email });
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
    const user = addUser({
      email,
      firstName,
      lastName,
      password: hashedPassword,
      twoFactorSecret: secret.base32,
      twoFactorEnabled: false,
      lastLogin: null
    });

    // Generate QR code for 2FA setup
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Send welcome email (don't wait for it to complete)
    emailService.sendWelcomeEmail(user, false)
      .then(result => {
        if (result.success) {
          console.log(`📧 Welcome email sent to ${user.email}`);
          if (result.messageId !== 'console-log') {
            console.log(`📧 Preview URL: ${result.previewUrl || 'Check Ethereal Email'}`);
          }
        } else {
          console.warn(`⚠️  Failed to send welcome email to ${user.email}:`, result.error);
        }
      })
      .catch(error => {
        console.error(`❌ Welcome email error for ${user.email}:`, error);
      });

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
      },
      emailSent: true
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
    const user = findUser({ email });
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
    updateUser(user.id, { lastLogin: new Date().toISOString() });
    
    // Log successful login
    addAuditLog({
      userId: user.id,
      action: 'login',
      resourceType: 'user',
      resourceId: user.id
    });

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

    const user = findUser({ email });
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

    updateUser(user.id, { twoFactorEnabled: true });

    // Send dedicated 2FA confirmation email
    const updatedUser = findUser(user.id);
    emailService.send2FAConfirmationEmail(updatedUser)
      .then(result => {
        if (result.success) {
          console.log(`📧 2FA confirmation email sent to ${user.email}`);
        }
      })
      .catch(error => {
        console.error(`❌ 2FA confirmation email error:`, error);
      });

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

// Passkey Registration - Begin
router.post('/passkey/register/begin', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('🔍 Passkey registration begin for email:', email);

    if (!email) {
      return res.status(400).json({
        error: 'Email required',
        message: 'Email address is required for passkey registration'
      });
    }

    const user = findUser({ email });
    console.log('👤 User found:', user ? `Yes (ID: ${user.id})` : 'No');
    if (!user) {
      console.error('❌ User not found for email:', email);
      return res.status(404).json({
        error: 'User not found',
        message: 'Please make sure you have registered an account first'
      });
    }

    // Get existing passkeys for this user
    const existingPasskeys = findPasskeys({ userId: user.id });

    console.log('🔧 Generating passkey registration options...');
    console.log('RP Name:', rpName);
    console.log('RP ID:', rpID);
    console.log('User Display Name:', `${user.firstName} ${user.lastName}`);
    
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: user.email,
      userID: new TextEncoder().encode(user.id),
      userDisplayName: `${user.firstName} ${user.lastName}`,
      // Exclude existing passkeys
      excludeCredentials: existingPasskeys.map(passkey => ({
        id: new Uint8Array(Buffer.from(passkey.credentialId, 'base64url')),
        type: 'public-key',
        transports: passkey.transports || ['internal', 'hybrid']
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform' // Prefer platform authenticators (TouchID, FaceID, Windows Hello)
      },
    });
    
    console.log('✅ Registration options generated successfully');
    console.log('Challenge length:', options.challenge.length);

    // Store challenge temporarily (in production, use Redis or similar)
    updateUser(user.id, { currentChallenge: options.challenge });

    res.json(options);
  } catch (error) {
    console.error('Passkey registration begin error:', error);
    res.status(500).json({
      error: 'Failed to begin passkey registration'
    });
  }
});

// Passkey Registration - Finish
router.post('/passkey/register/finish', async (req, res) => {
  try {
    const { email, credential } = req.body;
    console.log('🔍 Passkey registration finish for email:', email);
    console.log('🔑 Credential received:', !!credential);

    const user = findUser({ email });
    console.log('👤 User found:', user ? 'Yes' : 'No');
    console.log('📋 Challenge exists:', !!user?.currentChallenge);
    if (!user || !user.currentChallenge) {
      console.error('❌ Invalid registration state - user or challenge missing');
      return res.status(400).json({
        error: 'Invalid registration state',
        message: 'Registration session expired or invalid. Please try again.'
      });
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified) {
      return res.status(400).json({
        error: 'Passkey registration failed',
        message: 'Could not verify passkey'
      });
    }

    console.log('🔖 Verification info:', {
      credentialID: verification.registrationInfo.credentialID ? 'present' : 'missing',
      credentialPublicKey: verification.registrationInfo.credentialPublicKey ? 'present' : 'missing'
    });
    
    // Store the passkey
    const passkey = addPasskey({
      userId: user.id,
      credentialId: verification.registrationInfo.credentialID 
        ? Buffer.from(verification.registrationInfo.credentialID).toString('base64url')
        : 'fallback-' + Date.now(),
      credentialPublicKey: verification.registrationInfo.credentialPublicKey
        ? Buffer.from(verification.registrationInfo.credentialPublicKey).toString('base64')
        : '',
      counter: verification.registrationInfo.counter || 0,
      credentialDeviceType: verification.registrationInfo.credentialDeviceType || 'singleDevice',
      credentialBackedUp: verification.registrationInfo.credentialBackedUp || false,
      transports: credential.response?.transports || ['internal', 'hybrid'],
      name: `${user.firstName}'s ${verification.registrationInfo.credentialDeviceType === 'multiDevice' ? 'Security Key' : 'Device'}`,
      lastUsed: new Date().toISOString()
    });
    
    console.log('✅ Passkey stored successfully:', passkey.id);

    // Clear challenge
    updateUser(user.id, { currentChallenge: null });

    // Log the registration
    addAuditLog({
      userId: user.id,
      action: 'passkey_registered',
      resourceType: 'user',
      resourceId: user.id,
      details: { passkeyId: passkey.id }
    });

    res.json({
      message: 'Passkey registered successfully',
      passkey: {
        id: passkey.id,
        name: passkey.name,
        createdAt: passkey.createdAt
      }
    });
  } catch (error) {
    console.error('Passkey registration finish error:', error);
    res.status(500).json({
      error: 'Failed to complete passkey registration'
    });
  }
});

// Passkey Authentication - Begin
router.post('/passkey/authenticate/begin', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('🔍 Passkey auth begin for email:', email);

    // If email provided, find user's passkeys
    let allowCredentials = [];
    if (email) {
      const user = findUser({ email });
      console.log('👤 User found:', user ? 'Yes' : 'No');
      if (user) {
        const userPasskeys = findPasskeys({ userId: user.id });
        console.log('🔑 User passkeys count:', userPasskeys.length);
        if (userPasskeys.length === 0) {
          return res.status(400).json({
            error: 'No passkeys registered',
            message: 'You need to register a passkey first before you can authenticate with one'
          });
        }
        allowCredentials = userPasskeys.map(passkey => {
          // Handle both string and buffer credential IDs safely
          let credentialIdBuffer;
          try {
            if (passkey.credentialId.startsWith('fallback-')) {
              // Skip fallback credentials
              return null;
            }
            credentialIdBuffer = Buffer.from(passkey.credentialId, 'base64url');
          } catch (error) {
            console.warn('⚠️  Skipping invalid credential ID:', passkey.credentialId);
            return null;
          }
          
          return {
            id: new Uint8Array(credentialIdBuffer),
            type: 'public-key',
            transports: passkey.transports || ['internal', 'hybrid']
          };
        }).filter(Boolean); // Remove null entries
      } else {
        return res.status(404).json({
          error: 'User not found',
          message: 'No user found with this email address'
        });
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    // Store challenge temporarily - we'll use email as key if provided, otherwise store globally
    const challengeKey = email || 'anonymous';
    // In production, store this in Redis with expiration
    req.app.locals.authChallenges = req.app.locals.authChallenges || {};
    req.app.locals.authChallenges[challengeKey] = options.challenge;

    res.json(options);
  } catch (error) {
    console.error('Passkey authentication begin error:', error);
    res.status(500).json({
      error: 'Failed to begin passkey authentication'
    });
  }
});

// Passkey Authentication - Finish
router.post('/passkey/authenticate/finish', async (req, res) => {
  try {
    const { email, credential } = req.body;
    console.log('🔍 Passkey auth finish for email:', email);
    console.log('🔑 Credential ID length:', credential?.rawId?.length);

    // Get challenge
    const challengeKey = email || 'anonymous';
    const expectedChallenge = req.app.locals.authChallenges?.[challengeKey];
    console.log('📋 Challenge found:', !!expectedChallenge);
    
    if (!expectedChallenge) {
      console.error('❌ No challenge found for key:', challengeKey);
      return res.status(400).json({
        error: 'Invalid authentication state',
        message: 'No challenge found. Please try the authentication process again.'
      });
    }

    // Find the passkey
    const credentialId = Buffer.from(credential.rawId, 'base64url').toString('base64url');
    console.log('🔍 Looking for credential ID:', credentialId.substring(0, 10) + '...');
    const passkeys = findPasskeys({ credentialId });
    console.log('🔑 Passkeys found:', passkeys.length);
    const passkey = passkeys[0];

    if (!passkey) {
      console.error('❌ Passkey not found for credential ID:', credentialId.substring(0, 10) + '...');
      return res.status(400).json({
        error: 'Passkey not found',
        message: 'This passkey is not registered with any account'
      });
    }

    const user = findUser(passkey.userId);
    if (!user) {
      return res.status(400).json({
        error: 'User not found'
      });
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: new Uint8Array(Buffer.from(passkey.credentialId, 'base64url')),
        credentialPublicKey: new Uint8Array(Buffer.from(passkey.credentialPublicKey, 'base64')),
        counter: passkey.counter,
        transports: passkey.transports
      },
    });

    if (!verification.verified) {
      return res.status(401).json({
        error: 'Passkey authentication failed'
      });
    }

    // Update passkey counter and last used
    updatePasskey(passkey.id, {
      counter: verification.authenticationInfo.newCounter,
      lastUsed: new Date().toISOString()
    });

    // Update user last login
    updateUser(user.id, { lastLogin: new Date().toISOString() });

    // Clear challenge
    delete req.app.locals.authChallenges[challengeKey];

    // Log successful login
    addAuditLog({
      userId: user.id,
      action: 'passkey_login',
      resourceType: 'user',
      resourceId: user.id,
      details: { passkeyId: passkey.id }
    });

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: 'user',
        authMethod: 'passkey'
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Passkey authentication successful',
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
    console.error('Passkey authentication finish error:', error);
    res.status(500).json({
      error: 'Failed to complete passkey authentication'
    });
  }
});

// Get user's passkeys by email param
router.get('/passkeys/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`📋 Checking passkeys for email: ${email}`);
    
    const user = findUser({ email });
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        userExists: false,
        passkeys: [] 
      });
    }
    
    const passkeys = findPasskeys({ userId: user.id });
    console.log(`📋 Found ${passkeys.length} passkey(s) for user ${user.email}`);
    
    const safePasskeys = passkeys.map(passkey => ({
      id: passkey.id,
      name: passkey.name,
      credentialDeviceType: passkey.credentialDeviceType,
      credentialBackedUp: passkey.credentialBackedUp,
      lastUsed: passkey.lastUsed,
      createdAt: passkey.createdAt
    }));
    
    res.json({
      userExists: true,
      passkeys: safePasskeys
    });
  } catch (error) {
    console.error('❌ Error checking user passkeys:', error);
    res.status(500).json({ 
      error: 'Failed to check passkeys',
      userExists: false,
      passkeys: [] 
    });
  }
});

// Get user's passkeys (legacy endpoint with query param)
router.get('/passkeys', async (req, res) => {
  try {
    // In a real app, this would require authentication middleware
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        error: 'Email required'
      });
    }

    const user = findUser({ email });
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const passkeys = findPasskeys({ userId: user.id });
    const safePasskeys = passkeys.map(passkey => ({
      id: passkey.id,
      name: passkey.name,
      credentialDeviceType: passkey.credentialDeviceType,
      credentialBackedUp: passkey.credentialBackedUp,
      lastUsed: passkey.lastUsed,
      createdAt: passkey.createdAt
    }));

    res.json({
      passkeys: safePasskeys
    });
  } catch (error) {
    console.error('Get passkeys error:', error);
    res.status(500).json({
      error: 'Failed to get passkeys'
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
