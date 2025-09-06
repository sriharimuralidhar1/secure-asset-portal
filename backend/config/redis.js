const redis = require('redis');

// Redis client setup
let client = null;

const getRedisClient = async () => {
  if (!client) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    client = redis.createClient({
      url: redisUrl,
      retry_strategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      console.log('✅ Connected to Redis server');
    });

    client.on('disconnect', () => {
      console.log('❌ Disconnected from Redis server');
    });

    await client.connect();
  }
  
  return client;
};

// Graceful shutdown
const closeRedisConnection = async () => {
  if (client) {
    await client.disconnect();
    client = null;
    console.log('📴 Redis connection closed');
  }
};

// Session management helpers
const sessionHelpers = {
  // Store passkey session data (expires in 5 minutes)
  async storePasskeySession(sessionId, data) {
    const client = await getRedisClient();
    const key = `passkey-session:${sessionId}`;
    await client.setEx(key, 300, JSON.stringify({
      ...data,
      createdAt: new Date().toISOString()
    }));
  },

  // Get passkey session data
  async getPasskeySession(sessionId) {
    const client = await getRedisClient();
    const key = `passkey-session:${sessionId}`;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  },

  // Update session status
  async updatePasskeySession(sessionId, updates) {
    const client = await getRedisClient();
    const key = `passkey-session:${sessionId}`;
    const existing = await this.getPasskeySession(sessionId);
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      await client.setEx(key, 300, JSON.stringify(updated));
      return updated;
    }
    return null;
  },

  // Delete session
  async deletePasskeySession(sessionId) {
    const client = await getRedisClient();
    const key = `passkey-session:${sessionId}`;
    await client.del(key);
  },

  // Check if session exists and is valid
  async sessionExists(sessionId) {
    const client = await getRedisClient();
    const key = `passkey-session:${sessionId}`;
    return await client.exists(key) === 1;
  }
};

module.exports = {
  getRedisClient,
  closeRedisConnection,
  sessionHelpers
};
