const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { findUser, updateUser, deleteUser, addAuditLog } = require('../data/mockDatabase');
const router = express.Router();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      message: 'Please provide a valid access token'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired'
      });
    }
    req.user = user;
    next();
  });
};

// Get current user profile
router.get('/profile', authenticateToken, (req, res) => {
  try {
    const user = findUser(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to retrieve profile',
      message: 'Unable to fetch user profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().isLength({ min: 2 }).trim().escape(),
  body('lastName').optional().isLength({ min: 2 }).trim().escape(),
  body('email').optional().isEmail().normalizeEmail(),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const user = findUser(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    const { firstName, lastName, email } = req.body;

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = findUser({ email });
      if (existingUser && existingUser.id !== req.user.userId) {
        return res.status(409).json({
          error: 'Email already exists',
          message: 'Another user is already using this email address'
        });
      }
    }

    // Update user data
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (email) updates.email = email;
    
    const updatedUser = updateUser(req.user.userId, updates);
    
    // Log profile update
    addAuditLog({
      userId: req.user.userId,
      action: 'update_profile',
      resourceType: 'user',
      resourceId: req.user.userId,
      oldValues: { firstName: user.firstName, lastName: user.lastName, email: user.email },
      newValues: updates
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        twoFactorEnabled: updatedUser.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'Unable to update user profile'
    });
  }
});

// Change password
router.put('/password', authenticateToken, [
  body('currentPassword').isLength({ min: 1 }),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = findUser(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Invalid current password',
        message: 'The current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    updateUser(req.user.userId, { password: hashedNewPassword });
    
    // Log password change
    addAuditLog({
      userId: req.user.userId,
      action: 'change_password',
      resourceType: 'user',
      resourceId: req.user.userId
    });

    res.json({
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      message: 'Unable to update password'
    });
  }
});

// Delete user account
router.delete('/account', authenticateToken, [
  body('password').isLength({ min: 1 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { password } = req.body;
    const user = findUser(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Password verification failed'
      });
    }

    // Log account deletion
    addAuditLog({
      userId: req.user.userId,
      action: 'delete_account',
      resourceType: 'user',
      resourceId: req.user.userId
    });
    
    // Remove user (this also removes their assets)
    deleteUser(req.user.userId);

    res.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      error: 'Failed to delete account',
      message: 'Unable to delete user account'
    });
  }
});

module.exports = router;
