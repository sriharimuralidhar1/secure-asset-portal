// Mock database storage
// In production, this would be replaced with actual database models

const mockDatabase = {
  users: [],
  assets: [],
  auditLogs: [],
  passkeys: [] // Store passkey credentials
};

// Helper functions for data management
const generateId = () => Date.now().toString();

const findUser = (criteria) => {
  if (typeof criteria === 'string') {
    return mockDatabase.users.find(user => user.id === criteria);
  }
  
  if (criteria.email) {
    return mockDatabase.users.find(user => user.email === criteria.email);
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
  
  // User operations
  findUser,
  addUser,
  updateUser,
  deleteUser,
  
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
