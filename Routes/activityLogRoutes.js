const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const activityLogController = require("../Controllers/activityLogController");
const { AdminverifyToken } = require("../config/admintoken");
const config = require("../config/env");

const jwtSecretKey = config.JWT_SECRET_KEY || process.env.JWT_SECRET_KEY || "prabhuPooja001";

/**
 * Optional Auth Middleware:
 * If token is present, automatically decodes user info without throwing 401 if missing.
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const tokenValue = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : authHeader.trim();
      const decoded = jwt.verify(tokenValue, jwtSecretKey);
      if (decoded && (decoded.userId || decoded.id)) {
        req.user = {
          id: decoded.userId || decoded.id,
          role: decoded.role || "customer",
        };
      }
    } catch (e) {
      // Ignore invalid token so tracking never fails
    }
  }
  next();
};

// 1. High-speed Frontend Tracking Endpoint (Supports Single or Batch Array)
router.post("/track", optionalAuth, activityLogController.trackActivity);
router.post("/track-batch", optionalAuth, activityLogController.trackActivity);

// 2. Admin Audit & Analytics Endpoints (Protected by AdminverifyToken)
router.get("/admin/logs", AdminverifyToken, activityLogController.getAdminAuditLogs);
router.get("/admin/staff-logs", AdminverifyToken, activityLogController.getAgentOperationalAuditLogs);
router.get("/admin/agent-logs", AdminverifyToken, activityLogController.getAgentOperationalAuditLogs);
router.get("/admin/user-journey/:userId", AdminverifyToken, activityLogController.getUserJourney);
router.get("/admin/summary", AdminverifyToken, activityLogController.getActivitySummary);

module.exports = router;
