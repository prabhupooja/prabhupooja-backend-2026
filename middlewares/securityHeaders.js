/**
 * Lightweight Security Headers Middleware
 * Protects against XSS, clickjacking, MIME sniffing, and information disclosure.
 */
module.exports = function securityHeaders(req, res, next) {
  // Prevent clickjacking by denying iframes embedding
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable browser XSS filtering
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Hide powered-by header
  res.removeHeader('X-Powered-By');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};
