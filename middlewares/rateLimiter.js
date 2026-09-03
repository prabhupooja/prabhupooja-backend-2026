/**
 * High-Speed Sliding Window Rate Limiter Middleware
 * Protects auth, OTP, and booking endpoints from brute-force and DDoS spam.
 */

const ipRequestMap = new Map();

// Periodically clean stale IP records (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestMap.entries()) {
    if (record.resetTime <= now) {
      ipRequestMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Creates a rate limiting middleware function
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max requests allowed in window
 * @param {string} options.message - Custom error message
 */
function createRateLimiter({ windowMs, max, message }) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();
    const key = `${req.baseUrl || req.path}:${ip}`;

    let record = ipRequestMap.get(key);

    if (!record || record.resetTime <= now) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      ipRequestMap.set(key, record);
      return next();
    }

    if (record.count >= max) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        message: message || `Too many requests. Please try again after ${retryAfterSeconds} seconds.`,
        retryAfterSeconds
      });
    }

    record.count += 1;
    return next();
  };
}

// Preconfigured Limiters
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 30, // 30 login/OTP attempts per 15 mins
  message: "Too many login/OTP attempts from this IP. Please wait 15 minutes before trying again."
});

const bookingLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 60, // 60 booking requests per 10 mins
  message: "Too many booking requests. Please wait a few minutes before submitting again."
});

const generalLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 500, // 500 requests per minute
  message: "Rate limit exceeded. Please slow down your requests."
});

module.exports = {
  createRateLimiter,
  authLimiter,
  bookingLimiter,
  generalLimiter
};
