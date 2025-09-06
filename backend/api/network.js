const express = require('express');
const os = require('os');
const router = express.Router();

// Get network information for cross-device authentication
router.get('/network-info', (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    let localIp = null;
    
    // Find the first non-internal IPv4 address
    Object.keys(interfaces).forEach(interfaceName => {
      const interfaceInfo = interfaces[interfaceName];
      for (const address of interfaceInfo) {
        if (address.family === 'IPv4' && !address.internal) {
          localIp = address.address;
          break;
        }
      }
      if (localIp) return; // Stop once we find the first one
    });
    
    // Fallback to localhost if no network interface found
    if (!localIp) {
      localIp = '127.0.0.1';
    }
    
    console.log(`🌐 Network info requested - Local IP: ${localIp}`);
    
    res.json({
      localIp,
      hostname: os.hostname(),
      platform: os.platform(),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Network info error:', error);
    res.status(500).json({
      error: 'Failed to get network information',
      message: 'Unable to determine local network IP'
    });
  }
});

module.exports = router;
