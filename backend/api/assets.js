const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Mock asset storage (replace with database in production)
let assets = [];

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
router.get('/', authenticateToken, (req, res) => {
  try {
    const userAssets = assets.filter(asset => asset.userId === req.user.userId);
    
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
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const asset = assets.find(a => 
      a.id === req.params.id && a.userId === req.user.userId
    );

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
router.post('/', authenticateToken, validateAsset, (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, type, value, description, metadata } = req.body;

    const asset = {
      id: Date.now().toString(),
      userId: req.user.userId,
      name,
      type,
      value: parseFloat(value),
      description: description || '',
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    assets.push(asset);

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
router.put('/:id', authenticateToken, validateAsset, (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const assetIndex = assets.findIndex(a => 
      a.id === req.params.id && a.userId === req.user.userId
    );

    if (assetIndex === -1) {
      return res.status(404).json({
        error: 'Asset not found',
        message: 'The requested asset does not exist'
      });
    }

    const { name, type, value, description, metadata } = req.body;

    assets[assetIndex] = {
      ...assets[assetIndex],
      name,
      type,
      value: parseFloat(value),
      description: description || '',
      metadata: metadata || {},
      updatedAt: new Date().toISOString()
    };

    res.json({
      message: 'Asset updated successfully',
      asset: assets[assetIndex]
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
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const assetIndex = assets.findIndex(a => 
      a.id === req.params.id && a.userId === req.user.userId
    );

    if (assetIndex === -1) {
      return res.status(404).json({
        error: 'Asset not found',
        message: 'The requested asset does not exist'
      });
    }

    assets.splice(assetIndex, 1);

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
router.get('/type/:type', authenticateToken, (req, res) => {
  try {
    const userAssets = assets.filter(asset => 
      asset.userId === req.user.userId && asset.type === req.params.type
    );
    
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
