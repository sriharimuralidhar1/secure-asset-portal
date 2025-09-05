const express = require('express');
const jwt = require('jsonwebtoken');
const { findAssets, findUser } = require('../data/mockDatabase');
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

// Asset categories for reporting
const assetCategories = [
  { id: 'real_estate', name: 'Real Estate', icon: 'home' },
  { id: 'investment_account', name: 'Investment Accounts', icon: 'trending-up' },
  { id: 'bank_account', name: 'Bank Accounts', icon: 'credit-card' },
  { id: 'cryptocurrency', name: 'Cryptocurrency', icon: 'bitcoin' },
  { id: 'physical_asset', name: 'Physical Assets', icon: 'package' },
  { id: 'business_interest', name: 'Business Interests', icon: 'briefcase' },
  { id: 'insurance', name: 'Insurance', icon: 'shield' }
];

// Portfolio summary report
router.get('/portfolio-summary', authenticateToken, (req, res) => {
  try {
    const userAssets = findAssets({ userId: req.user.userId });
    
    const totalValue = userAssets.reduce((sum, asset) => sum + parseFloat(asset.value), 0);
    const totalAssets = userAssets.length;
    
    // Group by category
    const categoryBreakdown = assetCategories.map(category => {
      const categoryAssets = userAssets.filter(asset => asset.type === category.id);
      const categoryValue = categoryAssets.reduce((sum, asset) => sum + parseFloat(asset.value), 0);
      
      return {
        category: category.name,
        id: category.id,
        icon: category.icon,
        count: categoryAssets.length,
        value: categoryValue,
        percentage: totalValue > 0 ? ((categoryValue / totalValue) * 100).toFixed(2) : 0
      };
    }).filter(category => category.count > 0);

    res.json({
      summary: {
        totalValue,
        totalAssets,
        categoriesUsed: categoryBreakdown.length
      },
      categoryBreakdown,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Portfolio summary error:', error);
    res.status(500).json({
      error: 'Failed to generate portfolio summary',
      message: 'Unable to create portfolio report'
    });
  }
});

// Asset performance report
router.get('/asset-performance', authenticateToken, (req, res) => {
  try {
    const userAssets = findAssets({ userId: req.user.userId });
    
    const performanceData = userAssets.map(asset => {
      const purchaseValue = asset.purchaseValue || asset.value;
      const currentValue = asset.value;
      const gainLoss = currentValue - purchaseValue;
      const gainLossPercentage = purchaseValue > 0 ? ((gainLoss / purchaseValue) * 100).toFixed(2) : 0;
      
      return {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        purchaseValue: purchaseValue,
        currentValue: currentValue,
        gainLoss: gainLoss,
        gainLossPercentage: parseFloat(gainLossPercentage),
        createdAt: asset.createdAt
      };
    });

    // Sort by gain/loss percentage
    performanceData.sort((a, b) => b.gainLossPercentage - a.gainLossPercentage);

    const totalGainLoss = performanceData.reduce((sum, asset) => sum + asset.gainLoss, 0);
    const avgGainLoss = performanceData.length > 0 ? totalGainLoss / performanceData.length : 0;

    res.json({
      performance: performanceData,
      summary: {
        totalGainLoss,
        averageGainLoss: avgGainLoss,
        bestPerformer: performanceData[0] || null,
        worstPerformer: performanceData[performanceData.length - 1] || null
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Asset performance error:', error);
    res.status(500).json({
      error: 'Failed to generate performance report',
      message: 'Unable to create asset performance report'
    });
  }
});

// Monthly growth report
router.get('/monthly-growth', authenticateToken, (req, res) => {
  try {
    const userAssets = findAssets({ userId: req.user.userId });
    
    // Generate monthly data for the last 12 months
    const monthlyData = [];
    const currentDate = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      
      // Filter assets that existed at this time
      const monthAssets = userAssets.filter(asset => {
        const assetDate = new Date(asset.createdAt);
        return assetDate <= date;
      });
      
      const monthValue = monthAssets.reduce((sum, asset) => sum + parseFloat(asset.value), 0);
      
      monthlyData.push({
        month: date.toISOString().slice(0, 7), // YYYY-MM format
        value: monthValue,
        assetCount: monthAssets.length
      });
    }

    res.json({
      monthlyGrowth: monthlyData,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Monthly growth error:', error);
    res.status(500).json({
      error: 'Failed to generate growth report',
      message: 'Unable to create monthly growth report'
    });
  }
});

// Export data for external use
router.get('/export', authenticateToken, (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const userAssets = findAssets({ userId: req.user.userId });
    
    if (format === 'csv') {
      // Generate CSV format
      const csvHeader = 'ID,Name,Type,Value,Description,Created At,Updated At\n';
      const csvData = userAssets.map(asset => 
        `${asset.id},"${asset.name}",${asset.type},${asset.value},"${asset.description || ''}",${asset.createdAt},${asset.updatedAt || asset.createdAt}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="assets-export.csv"');
      res.send(csvHeader + csvData);
    } else {
      // Default JSON format
      res.json({
        assets: userAssets,
        exportedAt: new Date().toISOString(),
        totalAssets: userAssets.length,
        totalValue: userAssets.reduce((sum, asset) => sum + parseFloat(asset.value), 0)
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      error: 'Failed to export data',
      message: 'Unable to export asset data'
    });
  }
});

// Tax report (basic implementation)
router.get('/tax-report', authenticateToken, (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const userAssets = findAssets({ userId: req.user.userId });
    
    // Filter assets by year
    const yearAssets = userAssets.filter(asset => {
      const assetYear = new Date(asset.createdAt).getFullYear();
      return assetYear.toString() === year.toString();
    });

    const taxData = {
      year: year,
      totalAssetsAcquired: yearAssets.length,
      totalValueAcquired: yearAssets.reduce((sum, asset) => sum + parseFloat(asset.value), 0),
      assetsByCategory: assetCategories.map(category => {
        const categoryAssets = yearAssets.filter(asset => asset.type === category.id);
        return {
          category: category.name,
          count: categoryAssets.length,
          value: categoryAssets.reduce((sum, asset) => sum + parseFloat(asset.value), 0)
        };
      }).filter(category => category.count > 0)
    };

    res.json({
      taxReport: taxData,
      generatedAt: new Date().toISOString(),
      note: 'This is a basic tax report. Consult with a tax professional for comprehensive tax planning.'
    });
  } catch (error) {
    console.error('Tax report error:', error);
    res.status(500).json({
      error: 'Failed to generate tax report',
      message: 'Unable to create tax report'
    });
  }
});

module.exports = router;
