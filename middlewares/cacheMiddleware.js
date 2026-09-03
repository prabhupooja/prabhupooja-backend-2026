const { getCache, setCache } = require("../config/redis");

/**
 * Cache Middleware for Express GET routes
 * @param {number} durationSeconds - Cache TTL in seconds (default: 300)
 * @param {string} customKeyPrefix - Optional custom prefix for key
 */
const cacheMiddleware = (durationSeconds = 300, customKeyPrefix = "") => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const keyPrefix = customKeyPrefix ? `${customKeyPrefix}:` : "api_cache:";
    const cacheKey = `${keyPrefix}${req.originalUrl || req.url}`;

    try {
      const cachedResponse = await getCache(cacheKey);

      if (cachedResponse !== null && cachedResponse !== undefined) {
        res.setHeader("X-Cache", "HIT");
        return res.status(200).json(cachedResponse);
      }

      res.setHeader("X-Cache", "MISS");

      // Intercept res.json to store into cache
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Only cache successful 2xx responses
        if (res.statusCode >= 200 && res.statusCode < 300 && body) {
          setCache(cacheKey, body, durationSeconds).catch(() => {});
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.warn("Cache middleware error (proceeding to DB):", error.message);
      next();
    }
  };
};

module.exports = cacheMiddleware;
