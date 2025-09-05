const express = require('express');
const jwt = require('jsonwebtoken');
const { findUser, findAssets, findPasskeys, addAuditLog } = require('../data/dataAccess');
const router = express.Router();

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      message: 'Please provide a valid access token'
    });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({
      error: 'Server configuration error'
    });
  }

  jwt.verify(token, jwtSecret, async (err, decoded) => {
    if (err) {
      return res.status(403).json({
        error: 'Invalid token'
      });
    }
    
    // Check if user has admin role
    const user = await findUser(decoded.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        message: 'You do not have permission to access this resource'
      });
    }
    
    req.user = decoded;
    req.adminUser = user;
    next();
  });
};

// Get all users (admin only)
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const { query } = require('../data/database');
    const result = await query(
      'SELECT id, email, first_name, last_name, two_factor_enabled, created_at, last_login FROM users ORDER BY created_at DESC'
    );
    
    const users = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      twoFactorEnabled: row.two_factor_enabled,
      createdAt: row.created_at,
      lastLogin: row.last_login
    }));

    res.json({ users });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Delete user account (admin only)
router.delete('/users/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { query } = require('../data/database');
    
    // Get user details before deletion
    const user = await findUser(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (userId === req.user.userId) {
      return res.status(400).json({
        error: 'Cannot delete your own account'
      });
    }

    // Get user's data for audit log
    const assets = await findAssets({ userId });
    const passkeys = await findPasskeys({ userId });

    // Delete user (cascading will handle related records)
    const deleteResult = await query('DELETE FROM users WHERE id = $1 RETURNING *', [userId]);
    
    if (deleteResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Log the admin action
    await addAuditLog({
      userId: req.user.userId,
      action: 'admin_delete_user',
      resourceType: 'user',
      resourceId: userId,
      details: {
        deletedUser: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        deletedAssets: assets.length,
        deletedPasskeys: passkeys.length,
        adminEmail: req.adminUser.email
      }
    });

    res.json({
      message: 'User account deleted successfully',
      deletedUser: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      deletedData: {
        assets: assets.length,
        passkeys: passkeys.length
      }
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ 
      error: 'Failed to delete user account',
      message: 'Please try again later'
    });
  }
});

module.exports = router;
