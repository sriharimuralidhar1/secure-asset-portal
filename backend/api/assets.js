const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { findAssets, addAsset, updateAsset, deleteAsset, addAuditLog } = require('../data/dataAccess');
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

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET not configured');
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Authentication service not properly configured'
    });
  }

  jwt.verify(token, jwtSecret, (err, user) => {
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

// Validation middleware for asset creation
const validateAsset = [
  body('name').isLength({ min: 1 }).trim().escape(),
  body('type').isIn([
    'real_estate', 'investment_account', 'bank_account', 
    'cryptocurrency', 'physical_asset', 'business_interest', 'insurance'
  ]),
  body('value').isNumeric().custom(value => {
    if (parseFloat(value) < 0) {
      throw new Error('Value must be non-negative');
    }
    return true;
  }),
  body('description').optional().trim().escape(),
];

// Get all assets for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userAssets = await findAssets({ userId: req.user.userId });
    
    res.json({
      assets: userAssets,
      total: userAssets.length,
      totalValue: userAssets.reduce((sum, asset) => sum + parseFloat(asset.value), 0)
    });
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({
      error: 'Failed to retrieve assets',
      message: 'Unable to fetch asset data'
    });
  }
});

// Get asset by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userAssets = await findAssets({ userId: req.user.userId, id: req.params.id });
    const asset = userAssets[0];

    if (!asset) {
      return res.status(404).json({
        error: 'Asset not found',
        message: 'The requested asset does not exist'
      });
    }

    res.json({ asset });
  } catch (error) {
    console.error('Get asset error:', error);
    res.status(500).json({
      error: 'Failed to retrieve asset',
      message: 'Unable to fetch asset data'
    });
  }
});

// Create new asset
router.post('/', authenticateToken, validateAsset, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, type, value, description, metadata } = req.body;

    const asset = await addAsset({
      userId: req.user.userId,
      name,
      type,
      value: parseFloat(value),
      description: description || '',
      metadata: metadata || {}
    });
    
    // Log asset creation
    await addAuditLog({
      userId: req.user.userId,
      action: 'create_asset',
      resourceType: 'asset',
      resourceId: asset.id,
      newValues: { name, type, value }
    });

    res.status(201).json({
      message: 'Asset created successfully',
      asset
    });

  } catch (error) {
    console.error('Create asset error:', error);
    res.status(500).json({
      error: 'Failed to create asset',
      message: 'Unable to create asset'
    });
  }
});

// Update asset
router.put('/:id', authenticateToken, validateAsset, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userAssets = await findAssets({ userId: req.user.userId, id: req.params.id });
    const existingAsset = userAssets[0];

    if (!existingAsset) {
      return res.status(404).json({
        error: 'Asset not found',
        message: 'The requested asset does not exist'
      });
    }

    const { name, type, value, description, metadata } = req.body;
    
    const updatedAsset = await updateAsset(req.params.id, {
      name,
      type,
      value: parseFloat(value),
      description: description || '',
      metadata: metadata || {}
    });
    
    // Log asset update
    await addAuditLog({
      userId: req.user.userId,
      action: 'update_asset',
      resourceType: 'asset',
      resourceId: req.params.id,
      oldValues: { name: existingAsset.name, type: existingAsset.type, value: existingAsset.value },
      newValues: { name, type, value }
    });

    res.json({
      message: 'Asset updated successfully',
      asset: updatedAsset
    });

  } catch (error) {
    console.error('Update asset error:', error);
    res.status(500).json({
      error: 'Failed to update asset',
      message: 'Unable to update asset'
    });
  }
});

// Delete asset
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userAssets = await findAssets({ userId: req.user.userId, id: req.params.id });
    const asset = userAssets[0];

    if (!asset) {
      return res.status(404).json({
        error: 'Asset not found',
        message: 'The requested asset does not exist'
      });
    }

    await deleteAsset(req.params.id);
    
    // Log asset deletion
    await addAuditLog({
      userId: req.user.userId,
      action: 'delete_asset',
      resourceType: 'asset',
      resourceId: req.params.id,
      oldValues: { name: asset.name, type: asset.type, value: asset.value }
    });

    res.json({
      message: 'Asset deleted successfully'
    });

  } catch (error) {
    console.error('Delete asset error:', error);
    res.status(500).json({
      error: 'Failed to delete asset',
      message: 'Unable to delete asset'
    });
  }
});

// Get assets by type
router.get('/type/:type', authenticateToken, async (req, res) => {
  try {
    const userAssets = await findAssets({ userId: req.user.userId, type: req.params.type });
    
    res.json({
      assets: userAssets,
      type: req.params.type,
      total: userAssets.length,
      totalValue: userAssets.reduce((sum, asset) => sum + parseFloat(asset.value), 0)
    });
  } catch (error) {
    console.error('Get assets by type error:', error);
    res.status(500).json({
      error: 'Failed to retrieve assets',
      message: 'Unable to fetch asset data'
    });
  }
});

module.exports = router;
