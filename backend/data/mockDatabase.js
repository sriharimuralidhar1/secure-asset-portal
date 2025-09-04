// Mock database storage
// In production, this would be replaced with actual database models

// BRAVE CLEAN TEST - All data wiped
const mockDatabase = {
  users: [], // Empty slate for Brave testing
  assets: [],
  auditLogs: [],
  passkeys: [] // Fresh for passkey testing
};

// Clear everything on startup
console.log('🗑️ BRAVE CLEAN TEST: Fresh database ready for passkey testing');

// Clear database function for testing
const clearDatabase = () => {
  mockDatabase.users = [];
  mockDatabase.assets = [];
  mockDatabase.auditLogs = [];
  mockDatabase.passkeys = [];
  console.log('🗑️ Database cleared');
};

// Helper functions for data management
const generateId = () => Date.now().toString();

// Debug function to list all users
const getAllUsers = () => {
  return mockDatabase.users.map(user => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    createdAt: user.createdAt
  }));
};

const findUser = (criteria) => {
  if (typeof criteria === 'string') {
    return mockDatabase.users.find(user => user.id === criteria);
  }
  
  if (criteria.email) {
    console.log('🔍 Looking for user with email:', criteria.email);
    console.log('📋 Available users:', mockDatabase.users.map(u => u.email));
    
    // Try exact match first
    let user = mockDatabase.users.find(u => u.email === criteria.email);
    
    // If no exact match, try case-insensitive
    if (!user) {
      user = mockDatabase.users.find(u => u.email.toLowerCase() === criteria.email.toLowerCase());
    }
    
    // If still no match, try without dots (common email variation)
    if (!user) {
      const searchEmailNoDots = criteria.email.replace(/\./g, '');
      user = mockDatabase.users.find(u => u.email.replace(/\./g, '') === searchEmailNoDots);
    }
    
    console.log('👤 User found:', user ? `Yes (${user.email})` : 'No');
    return user;
  }
  
  return null;
};

const addUser = (userData) => {
  const user = {
    id: generateId(),
    ...userData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockDatabase.users.push(user);
  return user;
};

const updateUser = (userId, updates) => {
  const userIndex = mockDatabase.users.findIndex(user => user.id === userId);
  if (userIndex !== -1) {
    mockDatabase.users[userIndex] = {
      ...mockDatabase.users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return mockDatabase.users[userIndex];
  }
  return null;
};

const deleteUser = (userId) => {
  const userIndex = mockDatabase.users.findIndex(user => user.id === userId);
  if (userIndex !== -1) {
    const deletedUser = mockDatabase.users.splice(userIndex, 1)[0];
    
    // Also delete user's assets
    mockDatabase.assets = mockDatabase.assets.filter(asset => asset.userId !== userId);
    
    return deletedUser;
  }
  return null;
};

const findAssets = (criteria = {}) => {
  let result = mockDatabase.assets;
  
  if (criteria.userId) {
    result = result.filter(asset => asset.userId === criteria.userId);
  }
  
  if (criteria.type) {
    result = result.filter(asset => asset.type === criteria.type);
  }
  
  if (criteria.id) {
    result = result.filter(asset => asset.id === criteria.id);
  }
  
  return result;
};

const addAsset = (assetData) => {
  const asset = {
    id: generateId(),
    ...assetData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockDatabase.assets.push(asset);
  return asset;
};

const updateAsset = (assetId, updates) => {
  const assetIndex = mockDatabase.assets.findIndex(asset => asset.id === assetId);
  if (assetIndex !== -1) {
    mockDatabase.assets[assetIndex] = {
      ...mockDatabase.assets[assetIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return mockDatabase.assets[assetIndex];
  }
  return null;
};

const deleteAsset = (assetId) => {
  const assetIndex = mockDatabase.assets.findIndex(asset => asset.id === assetId);
  if (assetIndex !== -1) {
    return mockDatabase.assets.splice(assetIndex, 1)[0];
  }
  return null;
};

const addAuditLog = (logData) => {
  const log = {
    id: generateId(),
    ...logData,
    createdAt: new Date().toISOString()
  };
  
  mockDatabase.auditLogs.push(log);
  return log;
};

// Passkey credential management
const findPasskeys = (criteria = {}) => {
  let result = mockDatabase.passkeys;
  
  if (criteria.userId) {
    result = result.filter(passkey => passkey.userId === criteria.userId);
  }
  
  if (criteria.credentialId) {
    result = result.filter(passkey => passkey.credentialId === criteria.credentialId);
  }
  
  return result;
};

const addPasskey = (passkeyData) => {
  const passkey = {
    id: generateId(),
    ...passkeyData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockDatabase.passkeys.push(passkey);
  return passkey;
};

const updatePasskey = (passkeyId, updates) => {
  const passkeyIndex = mockDatabase.passkeys.findIndex(passkey => passkey.id === passkeyId);
  if (passkeyIndex !== -1) {
    mockDatabase.passkeys[passkeyIndex] = {
      ...mockDatabase.passkeys[passkeyIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return mockDatabase.passkeys[passkeyIndex];
  }
  return null;
};

const deletePasskey = (passkeyId) => {
  const passkeyIndex = mockDatabase.passkeys.findIndex(passkey => passkey.id === passkeyId);
  if (passkeyIndex !== -1) {
    return mockDatabase.passkeys.splice(passkeyIndex, 1)[0];
  }
  return null;
};

module.exports = {
  // Direct access to data (for debugging)
  mockDatabase,
  
  // Database management
  clearDatabase,
  
  // User operations
  findUser,
  addUser,
  updateUser,
  deleteUser,
  getAllUsers,
  
  // Asset operations
  findAssets,
  addAsset,
  updateAsset,
  deleteAsset,
  
  // Audit operations
  addAuditLog,
  
  // Passkey operations
  findPasskeys,
  addPasskey,
  updatePasskey,
  deletePasskey,
  
  // Utility
  generateId
};
