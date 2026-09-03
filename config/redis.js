const Redis = require("ioredis");
const dotenv = require("dotenv");
dotenv.config();

// In-Memory Fallback Cache Store (for zero-failure operation when Redis is offline)
const memoryCache = new Map();

// Helper to clean up expired in-memory items periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of memoryCache.entries()) {
    if (item.expiry && item.expiry <= now) {
      memoryCache.delete(key);
    }
  }
}, 60000); // Clean every 60s

let isRedisConnected = false;
let redisClient = null;

try {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: true,
    connectTimeout: 3000,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        // Stop reconnecting aggressively if Redis server is down
        return null;
      }
      return Math.min(times * 200, 1000);
    },
  });

  redisClient.on("connect", () => {
    isRedisConnected = true;
    console.log("⚡ [Redis Cache] Connected to Redis successfully.");
  });

  redisClient.on("ready", () => {
    isRedisConnected = true;
  });

  redisClient.on("error", (err) => {
    isRedisConnected = false;
    // Suppress spammy connection logs while gracefully using in-memory cache
  });

  redisClient.on("close", () => {
    isRedisConnected = false;
  });

  // Attempt initial connect
  redisClient.connect().catch(() => {
    isRedisConnected = false;
    console.log("ℹ️ [Cache Engine] Redis server offline. Operating in high-speed In-Memory Cache mode.");
  });
} catch (error) {
  isRedisConnected = false;
  console.log("ℹ️ [Cache Engine] Operating in In-Memory Cache mode.");
}

/**
 * Get Cached Value
 * @param {string} key
 * @returns {Promise<any|null>}
 */
const getCache = async (key) => {
  try {
    if (isRedisConnected && redisClient) {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    }
  } catch (err) {
    // Fallback to memory
  }

  // Check In-Memory Cache
  const memoryItem = memoryCache.get(key);
  if (memoryItem) {
    if (!memoryItem.expiry || memoryItem.expiry > Date.now()) {
      return memoryItem.data;
    }
    memoryCache.delete(key);
  }
  return null;
};

/**
 * Set Cached Value with TTL in seconds
 * @param {string} key
 * @param {any} data
 * @param {number} ttlInSeconds - Default 300 seconds (5 mins)
 */
const setCache = async (key, data, ttlInSeconds = 300) => {
  try {
    if (isRedisConnected && redisClient) {
      await redisClient.set(key, JSON.stringify(data), "EX", ttlInSeconds);
      return;
    }
  } catch (err) {
    // Fallback to memory
  }

  // Set In-Memory Cache
  const expiry = ttlInSeconds ? Date.now() + ttlInSeconds * 1000 : null;
  memoryCache.set(key, { data, expiry });
};

/**
 * Delete Cache by Key or Prefix pattern (e.g. "prasad:*")
 * @param {string} pattern
 */
const deleteCache = async (pattern) => {
  try {
    if (isRedisConnected && redisClient) {
      if (pattern.includes("*")) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } else {
        await redisClient.del(pattern);
      }
    }
  } catch (err) {
    // Continue to clear memory cache
  }

  // In-Memory deletion
  if (pattern.includes("*")) {
    const prefix = pattern.replace("*", "");
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
  } else {
    memoryCache.delete(pattern);
  }
};

/**
 * Clear All Cache
 */
const flushAllCache = async () => {
  try {
    if (isRedisConnected && redisClient) {
      await redisClient.flushdb();
    }
  } catch (err) {}
  memoryCache.clear();
};

/**
 * Helper to fetch from cache, or execute DB query function if missing
 * @param {string} key
 * @param {number} ttlInSeconds
 * @param {Function} fetchFn
 */
const getOrSetCache = async (key, ttlInSeconds, fetchFn) => {
  const cached = await getCache(key);
  if (cached !== null && cached !== undefined) {
    return { data: cached, source: "cache" };
  }

  const freshData = await fetchFn();
  if (freshData !== null && freshData !== undefined) {
    await setCache(key, freshData, ttlInSeconds);
  }
  return { data: freshData, source: "db" };
};

module.exports = {
  redis: redisClient,
  isRedisConnected: () => isRedisConnected,
  getCache,
  setCache,
  deleteCache,
  flushAllCache,
  getOrSetCache,
};
