const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
const { Fido2Lib } = require('fido2-lib');

// Initialize Fido2Lib
const fido2 = new Fido2Lib({
  timeout: 60000,
  rpId: process.env.NODE_ENV === 'production' 
    ? process.env.WEBAUTHN_RP_ID || 'secure-asset-portal.com' 
    : 'localhost',
  rpName: 'Secure Asset Portal',
  rpIcon: 'https://example.com/logo.png',
  challengeSize: 128,
  attestation: "none",
  cryptoParams: [-7, -35, -36, -257, -258, -259, -37, -38, -39, -8],
  authenticatorAttachment: "platform",
  authenticatorRequireResidentKey: true,
  authenticatorUserVerification: "required"
});
const { findUser, addUser, updateUser, findPasskeys, addPasskey, updatePasskey, addAuditLog } = require('../data/dataAccess');
const emailService = require('../services/emailService');
const { sessionHelpers } = require('../config/redis');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// WebAuthn configuration
const rpName = 'Secure Asset Portal';

// Dynamic RP ID and origin handling for cross-device authentication
const getRpId = (req) => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.WEBAUTHN_RP_ID || 'secure-asset-portal.com';
  }
  
  // For development, use the hostname from the request
  const host = req.get('host') || 'localhost:3001';
  const hostname = host.split(':')[0];
  
  // If it's a local network IP, use 'localhost' as RP ID for compatibility
  if (hostname === 'localhost' || hostname === '127.0.0.1' || 
      /^192\.168\.[0-9]{1,3}\.[0-9]{1,3}$/.test(hostname) ||
      /^10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]{1,3}\.[0-9]{1,3}$/.test(hostname)) {
    return 'localhost';
  }
  
  return hostname;
};

const getOrigin = (req) => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.FRONTEND_URL || 'https://secure-asset-portal.com';
  }
  
  // Use the origin from the request for development
  return req.get('origin') || 'http://localhost:3001';
};

// Default values for backward compatibility
const rpID = 'localhost';
const origin = 'http://localhost:3001';

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
    const existingUser = await findUser({ email });
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
    const user = await addUser({
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
    const user = await findUser({ email });
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
    await updateUser(user.id, { lastLogin: new Date().toISOString() });
    
    // Log successful login
    await addAuditLog({
      userId: user.id,
      action: 'login',
      resourceType: 'user',
      resourceId: user.id
    });

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET not configured');
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Authentication service not properly configured'
      });
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        iat: Math.floor(Date.now() / 1000)
      },
      jwtSecret,
      { 
        expiresIn: '24h',
        issuer: 'secure-asset-portal',
        audience: 'secure-asset-portal-client'
      }
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

    const user = await findUser({ email });
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

    await updateUser(user.id, { twoFactorEnabled: true });

    // Send dedicated 2FA confirmation email
    const updatedUser = await findUser(user.id);
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

    const user = await findUser({ email });
    console.log('👤 User found:', user ? `Yes (ID: ${user.id})` : 'No');
    if (!user) {
      console.error('❌ User not found for email:', email);
      return res.status(404).json({
        error: 'User not found',
        message: 'Please make sure you have registered an account first'
      });
    }

    // Get existing passkeys for this user
    const existingPasskeys = await findPasskeys({ userId: user.id });
    console.log('🔑 Existing passkeys count:', existingPasskeys.length);

    const excludeCredentials = existingPasskeys.map(passkey => ({
      id: passkey.credentialId,
      type: 'public-key',
      transports: passkey.transports || ['internal']
    }));

    console.log('🔧 Generating passkey registration options with fido2-lib...');
    
    const registrationOptions = await fido2.attestationOptions();
    console.log('🔍 Raw fido2-lib options:', JSON.stringify(registrationOptions, null, 2));
    console.log('🔍 Challenge type:', typeof registrationOptions.challenge);
    console.log('🔍 Challenge value:', registrationOptions.challenge);
    
    // Convert challenge to base64url (handle ArrayBuffer and Buffer)
    let challenge;
    if (registrationOptions.challenge instanceof ArrayBuffer) {
      challenge = Buffer.from(registrationOptions.challenge).toString('base64url');
    } else if (Buffer.isBuffer(registrationOptions.challenge)) {
      challenge = registrationOptions.challenge.toString('base64url');
    } else {
      challenge = registrationOptions.challenge;
    }
    
    console.log('🔍 Converted challenge:', challenge);
    
    // Customize the options for our use case
    const customOptions = {
      challenge: challenge,
      rp: {
        name: 'Secure Asset Portal',
        id: process.env.NODE_ENV === 'production' 
          ? process.env.WEBAUTHN_RP_ID || 'secure-asset-portal.com' 
          : 'localhost'
      },
      user: {
        id: Buffer.from(user.id).toString('base64url'),
        name: user.email,
        displayName: `${user.firstName} ${user.lastName}`
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        requireResidentKey: true,
        userVerification: 'required'
      },
      timeout: 60000,
      attestation: 'none',
      excludeCredentials,
      extensions: {
        credProps: true
      }
    };
    
    console.log('✅ Registration options generated successfully');
    console.log('Challenge length:', customOptions.challenge.length);
    console.log('🔧 Full options object:', JSON.stringify(customOptions, null, 2));

    // Store challenge temporarily (in production, use Redis or similar)
    await updateUser(user.id, { currentChallenge: customOptions.challenge });

    res.json(customOptions);
  } catch (error) {
    console.error('Passkey registration begin error:', error);
    res.status(500).json({
      error: 'Failed to begin passkey registration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Passkey Registration - Finish
router.post('/passkey/register/finish', async (req, res) => {
  try {
    const { email, credential } = req.body;
    console.log('🔍 Passkey registration finish for email:', email);
    console.log('🔑 Credential received:', !!credential);

    const user = await findUser({ email });
    console.log('👤 User found:', user ? 'Yes' : 'No');
    console.log('📋 Challenge exists:', !!user?.current_challenge);
    if (!user || !user.current_challenge) {
      console.error('❌ Invalid registration state - user or challenge missing');
      return res.status(400).json({
        error: 'Invalid registration state',
        message: 'Registration session expired or invalid. Please try again.'
      });
    }

    const clientDataJSON = JSON.parse(Buffer.from(credential.response.clientDataJSON, 'base64').toString());
    const attestationObject = credential.response.attestationObject;
    
    console.log('🔍 Client data JSON:', clientDataJSON);
    console.log('🔍 Expected challenge:', user.current_challenge);
    console.log('🔍 Received challenge:', clientDataJSON.challenge);
    
    // Convert credential data to expected format for fido2-lib (needs ArrayBuffer)
    const rawIdBuffer = Buffer.from(credential.rawId, 'base64url');
    const idBuffer = Buffer.from(credential.id, 'base64url');
    const clientDataJSONBuffer = Buffer.from(credential.response.clientDataJSON, 'base64');
    const attestationObjectBuffer = Buffer.from(credential.response.attestationObject, 'base64');
    
    const processedCredential = {
      ...credential,
      rawId: new Uint8Array(rawIdBuffer).buffer,
      id: new Uint8Array(idBuffer).buffer,
      response: {
        ...credential.response,
        clientDataJSON: new Uint8Array(clientDataJSONBuffer).buffer,
        attestationObject: new Uint8Array(attestationObjectBuffer).buffer
      }
    };
    
    console.log('🔧 Processed credential for fido2-lib:', {
      rawIdType: typeof processedCredential.rawId,
      rawIdIsArrayBuffer: processedCredential.rawId instanceof ArrayBuffer,
      idType: typeof processedCredential.id,
      idIsArrayBuffer: processedCredential.id instanceof ArrayBuffer,
      clientDataJSONType: typeof processedCredential.response.clientDataJSON,
      clientDataJSONIsArrayBuffer: processedCredential.response.clientDataJSON instanceof ArrayBuffer,
      attestationObjectType: typeof processedCredential.response.attestationObject,
      attestationObjectIsArrayBuffer: processedCredential.response.attestationObject instanceof ArrayBuffer
    });
    
    const attestationExpectations = {
      challenge: user.current_challenge,
      origin: origin,
      factor: "either"
    };

    console.log('🔧 Verifying attestation with fido2-lib...');
    const regResult = await fido2.attestationResult(processedCredential, attestationExpectations);
    
    console.log('🔖 Attestation result:', {
      verified: !!regResult.authnrData,
      counter: regResult.authnrData?.get('counter'),
      credentialId: regResult.authnrData?.get('credId')?.toString('base64url')
    });

    if (!regResult.authnrData) {
      return res.status(400).json({
        error: 'Passkey registration failed',
        message: 'Could not verify passkey'
      });
    }
    
    // Extract credential data from fido2-lib result
    const credIdBuffer = regResult.authnrData.get('credId');
    const credentialId = Buffer.from(credIdBuffer).toString('base64url');
    const credentialPublicKey = regResult.authnrData.get('credentialPublicKeyPem');
    const counter = regResult.authnrData.get('counter');
    
    console.log('🔑 Credential ID:', credentialId.substring(0, 10) + '...');
    console.log('🔑 Public Key present:', !!credentialPublicKey);
    console.log('🔑 Counter:', counter);
    
    const passkey = await addPasskey({
      userId: user.id,
      credentialId: credentialId,
      credentialPublicKey: credentialPublicKey || '',
      counter: counter || 0,
      credentialDeviceType: 'singleDevice',
      credentialBackedUp: false,
      transports: credential.response?.transports || ['internal'],
      name: `${user.firstName}'s Device - ${new Date().toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`,
      lastUsed: new Date().toISOString()
    });
    
    console.log('✅ Passkey stored successfully:', passkey.id);

    // Clear challenge
    await updateUser(user.id, { currentChallenge: null });

    // Log the registration
    await addAuditLog({
      userId: user.id,
      action: 'passkey_registered',
      resourceType: 'user',
      resourceId: user.id,
      details: { passkeyId: passkey.id }
    });

    // Send passkey confirmation email
    emailService.sendPasskeyConfirmationEmail(user, passkey.name)
      .then(result => {
        if (result.success) {
          console.log(`📧 Passkey confirmation email sent to ${user.email}`);
        }
      })
      .catch(error => {
        console.error(`❌ Passkey confirmation email error:`, error);
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
    console.error('❌ Passkey registration finish error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({
      error: 'Failed to complete passkey registration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Passkey Authentication - Begin
router.post('/passkey/authenticate/begin', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('🔍 Passkey auth begin for email:', email);
    console.log('🔍 Current passkeys in database: (checking per user)');

    // If email provided, find user's passkeys
    let allowCredentials = [];
    if (email) {
      const user = await findUser({ email });
      console.log('👤 User found:', user ? 'Yes' : 'No');
      if (user) {
        const userPasskeys = await findPasskeys({ userId: user.id });
        console.log('🔑 User passkeys count:', userPasskeys.length);
        if (userPasskeys.length === 0) {
          return res.status(400).json({
            error: 'No passkeys registered',
            message: 'You need to register a passkey first before you can authenticate with one'
          });
        }
        allowCredentials = userPasskeys.map(passkey => ({
          id: passkey.credentialId,
          type: 'public-key',
          transports: passkey.transports || ['internal']
        }));
        
        console.log('📋 Allow credentials count:', allowCredentials.length);
      } else {
        return res.status(404).json({
          error: 'User not found',
          message: 'No user found with this email address'
        });
      }
    }

    console.log('🔧 Generating authentication options with fido2-lib...');
    const assertionOptions = await fido2.assertionOptions();
    
    // Convert challenge to base64url (handle ArrayBuffer and Buffer)
    let challenge;
    if (assertionOptions.challenge instanceof ArrayBuffer) {
      challenge = Buffer.from(assertionOptions.challenge).toString('base64url');
    } else if (Buffer.isBuffer(assertionOptions.challenge)) {
      challenge = assertionOptions.challenge.toString('base64url');
    } else {
      challenge = assertionOptions.challenge;
    }
    
    // Customize the options for our use case
    const customOptions = {
      challenge: challenge,
      timeout: 60000,
      rpId: process.env.NODE_ENV === 'production' 
        ? process.env.WEBAUTHN_RP_ID || 'secure-asset-portal.com' 
        : 'localhost',
      userVerification: 'preferred',
      // Don't include allowCredentials for discoverable authentication
      // but store them for potential fallback
      ...(allowCredentials.length > 0 && { _fallbackCredentials: allowCredentials })
    };
    
    console.log('📄 Generated auth options:');
    console.log('  - Challenge length:', customOptions.challenge.length);
    console.log('  - User verification:', customOptions.userVerification);
    console.log('  - Timeout:', customOptions.timeout);
    console.log('🔍 Full options object sent to frontend:', JSON.stringify(customOptions, null, 2));

    // Store challenge temporarily - we'll use email as key if provided, otherwise store globally
    const challengeKey = email || 'anonymous';
    // In production, store this in Redis with expiration
    req.app.locals.authChallenges = req.app.locals.authChallenges || {};
    req.app.locals.authChallenges[challengeKey] = customOptions.challenge;

    res.json(customOptions);
  } catch (error) {
    console.error('Passkey authentication begin error:', error);
    res.status(500).json({
      error: 'Failed to begin passkey authentication',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Passkey Authentication - Finish
router.post('/passkey/authenticate/finish', async (req, res) => {
  try {
    const { email, credential } = req.body;
    console.log('🔍 Passkey auth finish for email:', email);
    console.log('🔑 Credential received:', !!credential);
    console.log('🔑 Full credential structure:');
    console.log(JSON.stringify(credential, null, 2));

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

    // Find the passkey by credential ID
    // The browser sends credential.id as a base64url string, which should match our stored credentialId
    const browserCredentialId = credential.id; // Use credential.id instead of rawId for string matching
    console.log('🔍 Browser credential ID:', browserCredentialId.substring(0, 10) + '...');
    
    let passkey = null;
    const passkeys = await findPasskeys({ credentialId: browserCredentialId });
    console.log('🔑 Passkeys found by exact credential ID:', passkeys.length);
    
    if (passkeys.length === 0 && email) {
      // Fallback: look for any passkey for this user
      console.log('🔄 Fallback: Looking for any passkey for user email:', email);
      const user = await findUser({ email });
      if (user) {
        const userPasskeys = await findPasskeys({ userId: user.id });
        console.log('🔑 User passkeys found:', userPasskeys.length);
        if (userPasskeys.length > 0) {
          passkey = userPasskeys.find(pk => pk.credentialId === browserCredentialId);
          if (!passkey) {
            passkey = userPasskeys.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
            console.log('⚠️  No exact credential match, using most recent passkey:', passkey.id);
          } else {
            console.log('✅ Found exact credential match:', passkey.id);
          }
        }
      }
    } else {
      passkey = passkeys[0];
      console.log('✅ Found passkey by credential ID:', passkey.id);
    }

    if (!passkey) {
      console.error('❌ Passkey not found for credential ID:', browserCredentialId.substring(0, 10) + '...');
      return res.status(400).json({
        error: 'Passkey not found',
        message: 'This passkey is not registered with any account'
      });
    }

    const user = await findUser(passkey.userId);
    if (!user) {
      return res.status(400).json({
        error: 'User not found'
      });
    }

    console.log('🔍 Passkey details:');
    console.log('  - ID:', passkey.id);
    console.log('  - User ID:', passkey.userId);
    console.log('  - Counter:', passkey.counter);
    console.log('  - Public Key present:', !!passkey.credentialPublicKey);
    
    // Convert credential data to expected format for fido2-lib (needs ArrayBuffer)
    const rawIdBuffer = Buffer.from(credential.rawId, 'base64url');
    const idBuffer = Buffer.from(credential.id, 'base64url');
    const clientDataJSONBuffer = Buffer.from(credential.response.clientDataJSON, 'base64');
    const authenticatorDataBuffer = Buffer.from(credential.response.authenticatorData, 'base64');
    const signatureBuffer = Buffer.from(credential.response.signature, 'base64');
    const userHandleBuffer = credential.response.userHandle ? Buffer.from(credential.response.userHandle, 'base64') : null;
    
    const processedCredential = {
      ...credential,
      rawId: new Uint8Array(rawIdBuffer).buffer,
      id: new Uint8Array(idBuffer).buffer,
      response: {
        ...credential.response,
        clientDataJSON: new Uint8Array(clientDataJSONBuffer).buffer,
        authenticatorData: new Uint8Array(authenticatorDataBuffer).buffer,
        signature: new Uint8Array(signatureBuffer).buffer,
        userHandle: userHandleBuffer ? new Uint8Array(userHandleBuffer).buffer : null
      }
    };
    
    console.log('🔧 Processed auth credential for fido2-lib:', {
      rawIdType: typeof processedCredential.rawId,
      rawIdIsArrayBuffer: processedCredential.rawId instanceof ArrayBuffer,
      idType: typeof processedCredential.id,
      idIsArrayBuffer: processedCredential.id instanceof ArrayBuffer,
      clientDataJSONType: typeof processedCredential.response.clientDataJSON,
      clientDataJSONIsArrayBuffer: processedCredential.response.clientDataJSON instanceof ArrayBuffer,
      authenticatorDataType: typeof processedCredential.response.authenticatorData,
      authenticatorDataIsArrayBuffer: processedCredential.response.authenticatorData instanceof ArrayBuffer,
      signatureType: typeof processedCredential.response.signature,
      signatureIsArrayBuffer: processedCredential.response.signature instanceof ArrayBuffer,
      userHandleType: typeof processedCredential.response.userHandle,
      userHandleIsArrayBuffer: processedCredential.response.userHandle instanceof ArrayBuffer
    });

    // Prepare assertion expectations for fido2-lib
    // In development, we handle counter rollback more gracefully
    const developmentMode = process.env.NODE_ENV !== 'production';
    const expectedCounter = developmentMode ? 0 : (passkey.counter || 0);
    
    const assertionExpectations = {
      challenge: expectedChallenge,
      origin: origin,
      factor: "either",
      publicKey: passkey.credentialPublicKey, // PEM format from registration
      prevCounter: expectedCounter,
      userHandle: Buffer.from(user.id).toString('base64url')
    };

    console.log('🔧 Verifying assertion with fido2-lib...');
    console.log('🔧 Expected counter:', expectedCounter, '(development mode:', developmentMode, ')');
    
    let authResult;
    try {
      authResult = await fido2.assertionResult(processedCredential, assertionExpectations);
    } catch (error) {
      if (error.message.includes('counter rollback') && developmentMode) {
        console.log('⚠️  Counter rollback detected in development mode, attempting recovery...');
        
        // In development, try with counter = 0 to handle database resets
        const recoveryExpectations = {
          ...assertionExpectations,
          prevCounter: 0
        };
        
        try {
          authResult = await fido2.assertionResult(processedCredential, recoveryExpectations);
          console.log('✅ Counter rollback recovery successful');
        } catch (recoveryError) {
          console.error('❌ Counter rollback recovery failed:', recoveryError.message);
          throw error; // Re-throw original error
        }
      } else {
        throw error; // Re-throw for production or non-counter errors
      }
    }
    
    console.log('🔖 Assertion result:', {
      verified: !!authResult.authnrData,
      counter: authResult.authnrData?.get('counter')
    });

    if (!authResult.authnrData) {
      return res.status(401).json({
        error: 'Passkey authentication failed',
        message: 'The passkey signature could not be verified'
      });
    }

    const newCounter = authResult.authnrData.get('counter');
    
    // Update passkey counter and last used
    // Ensure counter always increases to prevent rollback detection
    const updatedCounter = Math.max(newCounter || 0, (passkey.counter || 0) + 1);
    await updatePasskey(passkey.id, {
      counter: updatedCounter,
      lastUsed: new Date().toISOString()
    });

    // Update user last login
    await updateUser(user.id, { lastLogin: new Date().toISOString() });

    // Clear challenge
    delete req.app.locals.authChallenges[challengeKey];

    // Log successful login
    await addAuditLog({
      userId: user.id,
      action: 'passkey_login',
      resourceType: 'user',
      resourceId: user.id,
      details: { passkeyId: passkey.id }
    });

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET not configured');
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Authentication service not properly configured'
      });
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        authMethod: 'passkey',
        iat: Math.floor(Date.now() / 1000)
      },
      jwtSecret,
      { 
        expiresIn: '24h',
        issuer: 'secure-asset-portal',
        audience: 'secure-asset-portal-client'
      }
    );

    console.log('✅ Passkey authentication successful for user:', user.email);

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
    console.error('❌ Passkey authentication finish error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({
      error: 'Failed to complete passkey authentication',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user's passkeys by email param
router.get('/passkeys/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`📋 Checking passkeys for email: ${email}`);
    
    const user = await findUser({ email });
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        userExists: false,
        passkeys: [] 
      });
    }
    
    const passkeys = await findPasskeys({ userId: user.id });
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

    const user = await findUser({ email });
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const passkeys = await findPasskeys({ userId: user.id });
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

// Add passkey to existing account - Begin (requires authentication or email verification)
router.post('/passkey/add/begin', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('🔑 Adding passkey to existing account for email:', email);

    if (!email) {
      return res.status(400).json({
        error: 'Email required',
        message: 'Email address is required to add a passkey'
      });
    }

    const user = await findUser({ email });
    console.log('👤 User found:', user ? `Yes (ID: ${user.id})` : 'No');
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No account found with this email address'
      });
    }

    // Get existing passkeys for this user
    const existingPasskeys = await findPasskeys({ userId: user.id });
    console.log('🔑 Existing passkeys count:', existingPasskeys.length);

    const excludeCredentials = existingPasskeys.map(passkey => ({
      id: passkey.credentialId,
      type: 'public-key',
      transports: passkey.transports || ['internal']
    }));

    console.log('🔧 Generating passkey registration options for additional passkey...');
    
    const registrationOptions = await fido2.attestationOptions();
    
    // Convert challenge to base64url (handle ArrayBuffer and Buffer)
    let challenge;
    if (registrationOptions.challenge instanceof ArrayBuffer) {
      challenge = Buffer.from(registrationOptions.challenge).toString('base64url');
    } else if (Buffer.isBuffer(registrationOptions.challenge)) {
      challenge = registrationOptions.challenge.toString('base64url');
    } else {
      challenge = registrationOptions.challenge;
    }
    
    // Customize the options for adding additional passkey
    const customOptions = {
      challenge: challenge,
      rp: {
        name: 'Secure Asset Portal',
        id: getRpId(req)
      },
      user: {
        id: Buffer.from(user.id).toString('base64url'),
        name: user.email,
        displayName: `${user.firstName} ${user.lastName}`
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        requireResidentKey: true,
        userVerification: 'required'
      },
      timeout: 60000,
      attestation: 'none',
      excludeCredentials,
      extensions: {
        credProps: true
      }
    };
    
    console.log('✅ Additional passkey options generated successfully');

    // Store challenge temporarily
    await updateUser(user.id, { currentChallenge: customOptions.challenge });

    res.json(customOptions);
  } catch (error) {
    console.error('Add passkey begin error:', error);
    res.status(500).json({
      error: 'Failed to begin adding passkey',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add passkey to existing account - Finish
router.post('/passkey/add/finish', async (req, res) => {
  try {
    const { email, credential } = req.body;
    console.log('🔑 Finishing passkey addition for email:', email);

    const user = await findUser({ email });
    if (!user || !user.current_challenge) {
      return res.status(400).json({
        error: 'Invalid session',
        message: 'Session expired or invalid. Please try again.'
      });
    }

    const clientDataJSON = JSON.parse(Buffer.from(credential.response.clientDataJSON, 'base64').toString());
    
    console.log('🔍 Expected challenge:', user.current_challenge);
    console.log('🔍 Received challenge:', clientDataJSON.challenge);
    
    // Convert credential data to expected format for fido2-lib (needs ArrayBuffer)
    const rawIdBuffer = Buffer.from(credential.rawId, 'base64url');
    const idBuffer = Buffer.from(credential.id, 'base64url');
    const clientDataJSONBuffer = Buffer.from(credential.response.clientDataJSON, 'base64');
    const attestationObjectBuffer = Buffer.from(credential.response.attestationObject, 'base64');
    
    const processedCredential = {
      ...credential,
      rawId: new Uint8Array(rawIdBuffer).buffer,
      id: new Uint8Array(idBuffer).buffer,
      response: {
        ...credential.response,
        clientDataJSON: new Uint8Array(clientDataJSONBuffer).buffer,
        attestationObject: new Uint8Array(attestationObjectBuffer).buffer
      }
    };
    
    const attestationExpectations = {
      challenge: user.current_challenge,
      origin: getOrigin(req),
      factor: "either"
    };

    console.log('🔧 Verifying additional passkey with fido2-lib...');
    const regResult = await fido2.attestationResult(processedCredential, attestationExpectations);
    
    if (!regResult.authnrData) {
      return res.status(400).json({
        error: 'Passkey registration failed',
        message: 'Could not verify passkey'
      });
    }
    
    // Extract credential data from fido2-lib result
    const credIdBuffer = regResult.authnrData.get('credId');
    const credentialId = Buffer.from(credIdBuffer).toString('base64url');
    const credentialPublicKey = regResult.authnrData.get('credentialPublicKeyPem');
    const counter = regResult.authnrData.get('counter');
    
    // Check if this passkey already exists
    const existingPasskey = await findPasskeys({ credentialId });
    if (existingPasskey.length > 0) {
      return res.status(409).json({
        error: 'Passkey already registered',
        message: 'This passkey is already associated with an account'
      });
    }
    
    const passkey = await addPasskey({
      userId: user.id,
      credentialId: credentialId,
      credentialPublicKey: credentialPublicKey || '',
      counter: counter || 0,
      credentialDeviceType: 'singleDevice',
      credentialBackedUp: false,
      transports: credential.response?.transports || ['internal'],
      name: `${user.firstName}'s Device - ${new Date().toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`,
      lastUsed: new Date().toISOString()
    });
    
    console.log('✅ Additional passkey stored successfully:', passkey.id);

    // Clear challenge
    await updateUser(user.id, { currentChallenge: null });

    // Log the registration
    await addAuditLog({
      userId: user.id,
      action: 'passkey_added',
      resourceType: 'user',
      resourceId: user.id,
      details: { passkeyId: passkey.id }
    });

    // Send passkey confirmation email
    emailService.sendPasskeyConfirmationEmail(user, passkey.name)
      .then(result => {
        if (result.success) {
          console.log(`📧 Passkey confirmation email sent to ${user.email}`);
        }
      })
      .catch(error => {
        console.error(`❌ Passkey confirmation email error:`, error);
      });

    res.json({
      message: 'Passkey added successfully',
      passkey: {
        id: passkey.id,
        name: passkey.name,
        createdAt: passkey.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Add passkey finish error:', error);
    
    res.status(500).json({
      error: 'Failed to add passkey',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Passkey Session Management - for cross-device authentication

// Create passkey session
router.post('/passkey/session/create', async (req, res) => {
  try {
    const { email, options } = req.body;
    
    if (!email || !options) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and options are required'
      });
    }
    
    // Verify user exists
    const user = await findUser({ email });
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No account found with this email address'
      });
    }
    
    // Generate session ID
    const sessionId = uuidv4();
    
    // Store session data in Redis
    await sessionHelpers.storePasskeySession(sessionId, {
      email,
      options,
      userId: user.id,
      completed: false,
      success: false
    });
    
    console.log(`📱 Passkey session created: ${sessionId} for ${email}`);
    
    res.json({
      sessionId,
      message: 'Session created successfully'
    });
    
  } catch (error) {
    console.error('Create passkey session error:', error);
    res.status(500).json({
      error: 'Failed to create session',
      message: 'Unable to create passkey session'
    });
  }
});

// Get passkey session data
router.get('/passkey/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID required',
        message: 'Please provide a valid session ID'
      });
    }
    
    const sessionData = await sessionHelpers.getPasskeySession(sessionId);
    
    if (!sessionData) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session expired or does not exist'
      });
    }
    
    // Don't expose sensitive internal data
    const { userId, createdAt, updatedAt, ...publicData } = sessionData;
    
    res.json(publicData);
    
  } catch (error) {
    console.error('Get passkey session error:', error);
    res.status(500).json({
      error: 'Failed to retrieve session',
      message: 'Unable to get session data'
    });
  }
});

// Check passkey session status
router.get('/passkey/session/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID required',
        message: 'Please provide a valid session ID'
      });
    }
    
    const sessionData = await sessionHelpers.getPasskeySession(sessionId);
    
    if (!sessionData) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session expired or does not exist'
      });
    }
    
    // Return only status information
    res.json({
      completed: sessionData.completed || false,
      success: sessionData.success || false,
      error: sessionData.error || null,
      createdAt: sessionData.createdAt,
      updatedAt: sessionData.updatedAt
    });
    
  } catch (error) {
    console.error('Check passkey session status error:', error);
    res.status(500).json({
      error: 'Failed to check session status',
      message: 'Unable to get session status'
    });
  }
});

// Complete passkey session
router.post('/passkey/session/:sessionId/complete', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { success, error, result } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID required',
        message: 'Please provide a valid session ID'
      });
    }
    
    const sessionData = await sessionHelpers.getPasskeySession(sessionId);
    
    if (!sessionData) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session expired or does not exist'
      });
    }
    
    // Update session with completion data
    const updatedSession = await sessionHelpers.updatePasskeySession(sessionId, {
      completed: true,
      success: success || false,
      error: error || null,
      result: result || null
    });
    
    console.log(`📱 Passkey session completed: ${sessionId} (success: ${success})`);
    
    // Clean up session after a delay to allow polling to catch the completion
    setTimeout(async () => {
      try {
        await sessionHelpers.deletePasskeySession(sessionId);
        console.log(`🗑️ Session ${sessionId} cleaned up`);
      } catch (cleanupError) {
        console.error('Session cleanup error:', cleanupError);
      }
    }, 10000); // 10 second delay
    
    res.json({
      message: 'Session completed successfully',
      completed: true,
      success: success || false
    });
    
  } catch (error) {
    console.error('Complete passkey session error:', error);
    res.status(500).json({
      error: 'Failed to complete session',
      message: 'Unable to update session status'
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
