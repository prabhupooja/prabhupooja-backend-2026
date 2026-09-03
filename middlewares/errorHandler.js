/**
 * Centralized Global Error Handler Middleware
 */
module.exports = function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  const isProd = process.env.NODE_ENV === 'production';

  console.error(`🚨 [API Error] ${req.method} ${req.originalUrl}:`, err.message);
  if (!isProd && err.stack) {
    console.error(err.stack);
  }

  return res.status(statusCode).json({
    success: false,
    message: err.message || "An unexpected internal server error occurred",
    ...(isProd ? {} : { stack: err.stack, details: err })
  });
};
