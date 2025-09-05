const { query, getClient } = require('./database');

// =============================================================================
// USER MANAGEMENT
// =============================================================================

const findUser = async (criteria) => {
  try {
    let queryText = 'SELECT * FROM users WHERE ';
    let params = [];
    
    if (typeof criteria === 'string' || typeof criteria === 'number') {
      // Search by ID
      queryText += 'id = $1';
      params = [criteria];
    } else if (criteria.email) {
      // Search by email
      queryText += 'email = $1';
      params = [criteria.email];
    } else if (criteria.id) {
      // Search by ID in object
      queryText += 'id = $1';
      params = [criteria.id];
    } else {
      return null;
    }
    
    const result = await query(queryText, params);
    const user = result.rows[0];
    
    if (!user) return null;
    
    // Convert snake_case to camelCase for JavaScript usage
    return {
      ...user,
      firstName: user.first_name,
      lastName: user.last_name,
      twoFactorEnabled: user.two_factor_enabled,
      twoFactorSecret: user.two_factor_secret,
      lastLogin: user.last_login,
      currentChallenge: user.current_challenge,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  } catch (error) {
    console.error('❌ Error finding user:', error);
    return null;
  }
};

const addUser = async (userData) => {
  try {
    const queryText = `
      INSERT INTO users (id, email, password, first_name, last_name, two_factor_secret, two_factor_enabled)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const params = [
      Date.now().toString(),
      userData.email,
      userData.password,
      userData.firstName,
      userData.lastName,
      userData.twoFactorSecret || null,
      userData.twoFactorEnabled || false
    ];
    
    const result = await query(queryText, params);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error adding user:', error);
    throw error;
  }
};

const updateUser = async (userId, updates) => {
  try {
    const setClause = [];
    const params = [userId];
    let paramIndex = 2;
    
    if (updates.email) {
      setClause.push(`email = $${paramIndex++}`);
      params.push(updates.email);
    }
    if (updates.password) {
      setClause.push(`password = $${paramIndex++}`);
      params.push(updates.password);
    }
    if (updates.firstName) {
      setClause.push(`first_name = $${paramIndex++}`);
      params.push(updates.firstName);
    }
    if (updates.lastName) {
      setClause.push(`last_name = $${paramIndex++}`);
      params.push(updates.lastName);
    }
    if (updates.twoFactorEnabled !== undefined) {
      setClause.push(`two_factor_enabled = $${paramIndex++}`);
      params.push(updates.twoFactorEnabled);
    }
    if (updates.twoFactorSecret) {
      setClause.push(`two_factor_secret = $${paramIndex++}`);
      params.push(updates.twoFactorSecret);
    }
    if (updates.lastLogin) {
      setClause.push(`last_login = $${paramIndex++}`);
      params.push(updates.lastLogin);
    }
    if (updates.currentChallenge !== undefined) {
      setClause.push(`current_challenge = $${paramIndex++}`);
      params.push(updates.currentChallenge);
    }
    
    if (setClause.length === 0) {
      return await findUser(userId);
    }
    
    const queryText = `
      UPDATE users 
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await query(queryText, params);
    const user = result.rows[0];
    
    if (!user) return null;
    
    // Convert snake_case to camelCase for JavaScript usage
    return {
      ...user,
      firstName: user.first_name,
      lastName: user.last_name,
      twoFactorEnabled: user.two_factor_enabled,
      twoFactorSecret: user.two_factor_secret,
      lastLogin: user.last_login,
      currentChallenge: user.current_challenge,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  } catch (error) {
    console.error('❌ Error updating user:', error);
    throw error;
  }
};

// =============================================================================
// PASSKEY MANAGEMENT
// =============================================================================

const findPasskeys = async (criteria) => {
  try {
    let queryText = 'SELECT * FROM passkeys WHERE ';
    let params = [];
    
    if (criteria.credentialId) {
      queryText += 'credential_id = $1';
      params = [criteria.credentialId];
    } else if (criteria.userId) {
      queryText += 'user_id = $1 ORDER BY created_at DESC';
      params = [criteria.userId];
    } else {
      return [];
    }
    
    const result = await query(queryText, params);
    return result.rows.map(row => {
      // Handle transports from DB - it might be JSONB or string
      let parsedTransports;
      try {
        parsedTransports = typeof row.transports === 'string' ? JSON.parse(row.transports) : row.transports;
      } catch (parseError) {
        console.warn('⚠️  Failed to parse transports for passkey:', row.id, row.transports);
        parsedTransports = ['internal'];
      }
      
      return {
        id: row.id,
        userId: row.user_id,
        credentialId: row.credential_id,
        credentialPublicKey: row.credential_public_key,
        counter: row.counter,
        transports: parsedTransports,
        createdAt: row.created_at,
        lastUsed: row.last_used,
        name: row.name
      };
    });
  } catch (error) {
    console.error('❌ Error finding passkeys:', error);
    return [];
  }
};

const addPasskey = async (passkeyData) => {
  try {
    const id = Date.now().toString();
    const queryText = `
      INSERT INTO passkeys (id, user_id, credential_id, credential_public_key, counter, transports, name, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;
    
    // Handle transports - ensure it's properly formatted for JSONB storage
    const transports = passkeyData.transports || ['internal'];
    const transportsForDB = Array.isArray(transports) ? JSON.stringify(transports) : transports;
    
    const params = [
      id,
      passkeyData.userId,
      passkeyData.credentialId,
      passkeyData.credentialPublicKey,
      passkeyData.counter || 0,
      transportsForDB,
      passkeyData.name || 'Passkey'
    ];
    
    const result = await query(queryText, params);
    const row = result.rows[0];
    
    // Handle transports from DB - it might be JSONB or string
    let parsedTransports;
    try {
      parsedTransports = typeof row.transports === 'string' ? JSON.parse(row.transports) : row.transports;
    } catch (parseError) {
      console.warn('⚠️  Failed to parse transports, using default:', row.transports);
      parsedTransports = ['internal'];
    }
    
    return {
      id: row.id,
      userId: row.user_id,
      credentialId: row.credential_id,
      credentialPublicKey: row.credential_public_key,
      counter: row.counter,
      transports: parsedTransports,
      name: row.name,
      createdAt: row.created_at
    };
  } catch (error) {
    console.error('❌ Error adding passkey:', error);
    throw error;
  }
};

const updatePasskey = async (passkeyId, updates) => {
  try {
    const setClause = [];
    const params = [passkeyId];
    let paramIndex = 2;
    
    if (updates.counter !== undefined) {
      setClause.push(`counter = $${paramIndex++}`);
      params.push(updates.counter);
    }
    if (updates.lastUsed) {
      setClause.push(`last_used = $${paramIndex++}`);
      params.push(updates.lastUsed);
    }
    
    if (setClause.length === 0) {
      return null;
    }
    
    const queryText = `
      UPDATE passkeys 
      SET ${setClause.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await query(queryText, params);
    const row = result.rows[0];
    if (!row) return null;
    
    // Handle transports from DB - it might be JSONB or string
    let parsedTransports;
    try {
      parsedTransports = typeof row.transports === 'string' ? JSON.parse(row.transports) : row.transports;
    } catch (parseError) {
      console.warn('⚠️  Failed to parse transports for passkey update:', row.id, row.transports);
      parsedTransports = ['internal'];
    }
    
    return {
      id: row.id,
      userId: row.user_id,
      credentialId: row.credential_id,
      credentialPublicKey: row.credential_public_key,
      counter: row.counter,
      transports: parsedTransports,
      name: row.name,
      createdAt: row.created_at,
      lastUsed: row.last_used
    };
  } catch (error) {
    console.error('❌ Error updating passkey:', error);
    throw error;
  }
};

// =============================================================================
// ASSET MANAGEMENT
// =============================================================================

const findAssets = async (criteria) => {
  try {
    let queryText = 'SELECT * FROM assets WHERE ';
    let params = [];
    
    if (criteria.userId && criteria.id) {
      queryText += 'user_id = $1 AND id = $2';
      params = [criteria.userId, criteria.id];
    } else if (criteria.userId) {
      queryText += 'user_id = $1 ORDER BY created_at DESC';
      params = [criteria.userId];
    } else if (criteria.id) {
      queryText += 'id = $1';
      params = [criteria.id];
    } else {
      return [];
    }
    
    const result = await query(queryText, params);
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      type: row.type,
      value: parseFloat(row.value),
      purchaseValue: parseFloat(row.purchase_value || row.value),
      description: row.description,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } catch (error) {
    console.error('❌ Error finding assets:', error);
    return [];
  }
};

const addAsset = async (assetData) => {
  try {
    const id = Date.now().toString();
    const queryText = `
      INSERT INTO assets (id, user_id, name, type, value, purchase_value, description, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;
    
    const params = [
      id,
      assetData.userId,
      assetData.name,
      assetData.type,
      assetData.value,
      assetData.purchaseValue || assetData.value,
      assetData.description || '',
      JSON.stringify(assetData.metadata || {})
    ];
    
    const result = await query(queryText, params);
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      type: row.type,
      value: parseFloat(row.value),
      purchaseValue: parseFloat(row.purchase_value),
      description: row.description,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('❌ Error adding asset:', error);
    throw error;
  }
};

const updateAsset = async (assetId, updates) => {
  try {
    const setClause = [];
    const params = [assetId];
    let paramIndex = 2;
    
    if (updates.name) {
      setClause.push(`name = $${paramIndex++}`);
      params.push(updates.name);
    }
    if (updates.type) {
      setClause.push(`type = $${paramIndex++}`);
      params.push(updates.type);
    }
    if (updates.value !== undefined) {
      setClause.push(`value = $${paramIndex++}`);
      params.push(updates.value);
    }
    if (updates.purchaseValue !== undefined) {
      setClause.push(`purchase_value = $${paramIndex++}`);
      params.push(updates.purchaseValue);
    }
    if (updates.description !== undefined) {
      setClause.push(`description = $${paramIndex++}`);
      params.push(updates.description);
    }
    if (updates.metadata) {
      setClause.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(updates.metadata));
    }
    
    if (setClause.length === 0) {
      const assets = await findAssets({ id: assetId });
      return assets[0] || null;
    }
    
    const queryText = `
      UPDATE assets 
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await query(queryText, params);
    const row = result.rows[0];
    if (!row) return null;
    
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      type: row.type,
      value: parseFloat(row.value),
      purchaseValue: parseFloat(row.purchase_value),
      description: row.description,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('❌ Error updating asset:', error);
    throw error;
  }
};

const deleteAsset = async (assetId) => {
  try {
    const queryText = 'DELETE FROM assets WHERE id = $1 RETURNING *';
    const result = await query(queryText, [assetId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error deleting asset:', error);
    throw error;
  }
};

// =============================================================================
// AUDIT LOGGING
// =============================================================================

const addAuditLog = async (logData) => {
  try {
    const queryText = `
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, details, ip_address, user_agent, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `;
    
    const params = [
      logData.userId,
      logData.action,
      logData.resourceType || null,
      logData.resourceId || null,
      JSON.stringify(logData.oldValues || {}),
      JSON.stringify(logData.newValues || {}),
      JSON.stringify(logData.details || {}),
      logData.ipAddress || null,
      logData.userAgent || null
    ];
    
    const result = await query(queryText, params);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error adding audit log:', error);
    // Don't throw error for audit logs - just log it
  }
};

module.exports = {
  // Users
  findUser,
  addUser,
  updateUser,
  
  // Passkeys  
  findPasskeys,
  addPasskey,
  updatePasskey,
  
  // Assets
  findAssets,
  addAsset,
  updateAsset,
  deleteAsset,
  
  // Audit
  addAuditLog
};
