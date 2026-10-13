const db = require("../config/db");

// In-Memory Queue Buffer for high-throughput zero-blocking writes
let logBufferQueue = [];
let isFlushing = false;

/**
 * Flush batched logs to MySQL database
 */
async function flushLogsToDatabase() {
  if (isFlushing || logBufferQueue.length === 0) return;

  isFlushing = true;
  const batchSize = 200;
  const logsToInsert = logBufferQueue.splice(0, batchSize);

  try {
    const values = logsToInsert.map((log) => [
      log.user_id || null,
      log.user_type || "guest",
      log.session_id || "anonymous",
      log.event_type || "PAGE_VIEW",
      log.page_url || "/",
      log.page_title || null,
      log.page_image || null,
      log.action_name || null,
      log.target_id || null,
      log.scroll_depth || 0,
      log.time_spent_seconds || 0,
      log.referrer_url || null,
      log.device_type || "Desktop",
      log.browser || null,
      log.ip_address || null,
      log.user_agent || null,
      log.metadata ? JSON.stringify(log.metadata) : null,
      log.created_at || new Date(),
    ]);

    const sql = `
      INSERT INTO user_activity_logs (
        user_id, user_type, session_id, event_type, 
        page_url, page_title, page_image, action_name, 
        target_id, scroll_depth, time_spent_seconds, 
        referrer_url, device_type, browser, ip_address, 
        user_agent, metadata, created_at
      ) VALUES ?
    `;

    await db.query(sql, [values]);
  } catch (err) {
    console.error("❌ [Activity Log Flush Error]:", err.message);
  } finally {
    isFlushing = false;
    // If more logs queued up during flush, trigger next batch immediately
    if (logBufferQueue.length >= 100) {
      setImmediate(flushLogsToDatabase);
    }
  }
}

// Background worker flushes buffer every 3 seconds
setInterval(flushLogsToDatabase, 3000);

/**
 * Track user activity (single event or batch)
 * Sub-millisecond response time by pushing to in-memory queue
 */
exports.trackActivity = async (req, res) => {
  try {
    const rawEvents = Array.isArray(req.body.events)
      ? req.body.events
      : Array.isArray(req.body)
      ? req.body
      : [req.body];

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      null;
    const userAgent = req.headers["user-agent"] || null;
    const authUserId = req.user?.id || req.user?.userId || null;
    const authUserType = req.user?.role || (authUserId ? "customer" : null);

    let queuedCount = 0;

    for (const item of rawEvents) {
      if (!item || typeof item !== "object") continue;

      const userId = authUserId || item.userId || item.user_id || null;
      const userType =
        authUserType ||
        item.userType ||
        item.user_type ||
        (userId ? "customer" : "guest");

      const logEntry = {
        user_id: userId,
        user_type: userType,
        session_id: item.sessionId || item.session_id || req.sessionID || "anonymous",
        event_type: (item.eventType || item.event_type || "PAGE_VIEW").toUpperCase(),
        page_url: (item.pageUrl || item.page_url || "/").substring(0, 500),
        page_title: item.pageTitle || item.page_title || null,
        page_image: item.pageImage || item.page_image || null,
        action_name: item.actionName || item.action_name || null,
        target_id: item.targetId || item.target_id ? String(item.targetId || item.target_id) : null,
        scroll_depth: Math.min(100, Math.max(0, parseInt(item.scrollDepth || item.scroll_depth, 10) || 0)),
        time_spent_seconds: Math.max(0, parseInt(item.timeSpentSeconds || item.time_spent_seconds, 10) || 0),
        referrer_url: item.referrerUrl || item.referrer_url || null,
        device_type: item.deviceType || item.device_type || "Desktop",
        browser: item.browser || null,
        ip_address: ip,
        user_agent: userAgent,
        metadata: item.metadata || null,
        created_at: new Date(),
      };

      logBufferQueue.push(logEntry);
      queuedCount++;
    }

    // Flush immediately if buffer threshold reached
    if (logBufferQueue.length >= 100) {
      setImmediate(flushLogsToDatabase);
    }

    return res.status(200).json({
      success: true,
      message: "Activity tracked successfully",
      queued: queuedCount,
    });
  } catch (error) {
    console.error("Error in trackActivity:", error);
    return res.status(500).json({ success: false, message: "Failed to queue activity logs" });
  }
};

let cachedUserMeta = null;
async function resolveUserMeta() {
  if (cachedUserMeta) return cachedUserMeta;
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM users");
    const names = cols.map((c) => c.Field.toLowerCase());
    cachedUserMeta = {
      phoneField: names.includes("mobile") ? "u.mobile" : names.includes("phone") ? "u.phone" : "''",
      avatarField: names.includes("image") ? "u.image" : names.includes("profile_image") ? "u.profile_image" : "''",
      hasMobile: names.includes("mobile"),
      hasPhone: names.includes("phone"),
      hasImage: names.includes("image"),
      hasProfileImage: names.includes("profile_image"),
    };
  } catch (err) {
    cachedUserMeta = {
      phoneField: "''",
      avatarField: "''",
      hasMobile: false,
      hasPhone: false,
      hasImage: false,
      hasProfileImage: false,
    };
  }
  return cachedUserMeta;
}

/**
 * Admin: Get paginated and filtered activity logs
 */
exports.getAdminAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { eventType, userType, userId, search, startDate, endDate } = req.query;

    const conditions = [];
    const params = [];

    if (eventType) {
      conditions.push("l.event_type = ?");
      params.push(eventType);
    }

    if (userType) {
      conditions.push("l.user_type = ?");
      params.push(userType);
    }

    if (userId) {
      conditions.push("l.user_id = ?");
      params.push(userId);
    }

    if (startDate) {
      conditions.push("l.created_at >= ?");
      params.push(startDate);
    }

    if (endDate) {
      conditions.push("l.created_at <= ?");
      params.push(`${endDate} 23:59:59`);
    }

    if (search && search.trim()) {
      conditions.push(
        "(l.page_title LIKE ? OR l.page_url LIKE ? OR l.action_name LIKE ? OR u.email LIKE ? OR u.name LIKE ?)"
      );
      const searchParam = `%${search.trim()}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const userMeta = await resolveUserMeta();

    const listQuery = `
      SELECT 
        l.*,
        u.name AS user_name,
        u.email AS user_email,
        COALESCE(${userMeta.phoneField}, '') AS user_phone,
        COALESCE(${userMeta.avatarField}, '') AS user_avatar
      FROM user_activity_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM user_activity_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ${whereClause}
    `;

    const [logs] = await db.query(listQuery, [...params, limit, offset]);
    const [[{ total }]] = await db.query(countQuery, params);

    return res.status(200).json({
      success: true,
      total: Number(total || 0),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: logs,
    });
  } catch (error) {
    console.error("Error in getAdminAuditLogs:", error);
    return res.status(500).json({ success: false, message: "Error fetching activity logs", error: error.message });
  }
};

/**
 * Admin: Get paginated and filtered staff/agent operational audit logs (agent_audit_logs)
 */
exports.getAgentOperationalAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { agentId, action, targetType, targetId, startDate, endDate, search } = req.query;

    const conditions = [];
    const params = [];

    if (agentId) {
      conditions.push("a.agent_id = ?");
      params.push(agentId);
    }
    if (action) {
      conditions.push("a.action = ?");
      params.push(action);
    }
    if (targetType) {
      conditions.push("a.target_type = ?");
      params.push(targetType);
    }
    if (targetId) {
      conditions.push("a.target_id = ?");
      params.push(String(targetId));
    }
    if (startDate) {
      conditions.push("a.created_at >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("a.created_at <= ?");
      params.push(`${endDate} 23:59:59`);
    }
    if (search && search.trim()) {
      conditions.push(
        "(a.agent_name LIKE ? OR a.action LIKE ? OR a.target_type LIKE ? OR a.target_id LIKE ? OR a.details LIKE ?)"
      );
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const listQuery = `
      SELECT a.* 
      FROM agent_audit_logs a
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM agent_audit_logs a
      ${whereClause}
    `;

    const [logs] = await db.query(listQuery, [...params, limit, offset]);
    const [[{ total }]] = await db.query(countQuery, params);

    return res.status(200).json({
      success: true,
      total: Number(total || 0),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: logs,
    });
  } catch (error) {
    console.error("Error in getAgentOperationalAuditLogs:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching operational audit logs",
      error: error.message,
    });
  }
};

/**
 * Admin: Get complete user journey sequence for a specific user
 */
exports.getUserJourney = async (req, res) => {
  try {
    const userId = req.params.userId || req.query.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const [logs] = await db.query(
      `SELECT * FROM user_activity_logs 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM user_activity_logs WHERE user_id = ?`,
      [userId]
    );

    let userData = null;
    try {
      const [userRows] = await db.query(
        `SELECT id, name, email FROM users WHERE id = ?`,
        [userId]
      );
      if (userRows.length > 0) {
        userData = userRows[0];
        const meta = await resolveUserMeta();
        if (meta.phoneField !== "''") {
          const col = meta.phoneField.replace("u.", "");
          const [phoneRow] = await db.query(`SELECT ${col} FROM users WHERE id = ?`, [userId]);
          userData.phone = phoneRow[0]?.[col] || "";
        }
        if (meta.avatarField !== "''") {
          const col = meta.avatarField.replace("u.", "");
          const [avatarRow] = await db.query(`SELECT ${col} FROM users WHERE id = ?`, [userId]);
          userData.avatar = avatarRow[0]?.[col] || "";
        }
      }
    } catch (uErr) {
      console.warn("User fetch notice in getUserJourney:", uErr.message);
    }

    return res.status(200).json({
      success: true,
      user: userData,
      total: Number(total || 0),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: logs,
    });
  } catch (error) {
    console.error("Error in getUserJourney:", error);
    return res.status(500).json({ success: false, message: "Error fetching user journey", error: error.message });
  }
};

/**
 * Admin: Activity summary statistics for dashboard
 */
exports.getActivitySummary = async (req, res) => {
  try {
    // 1. Today's stats
    const [[todayStats]] = await db.query(`
      SELECT 
        COUNT(*) AS total_events_today,
        COUNT(DISTINCT session_id) AS unique_visitors_today,
        COUNT(CASE WHEN event_type = 'PAGE_VIEW' THEN 1 END) AS page_views_today,
        COUNT(CASE WHEN action_name IS NOT NULL THEN 1 END) AS action_clicks_today
      FROM user_activity_logs
      WHERE DATE(created_at) = CURDATE()
    `);

    // 2. Top 10 most visited pages today
    const [topPages] = await db.query(`
      SELECT 
        page_url, 
        MAX(page_title) AS page_title, 
        COUNT(*) AS views,
        COUNT(DISTINCT session_id) AS unique_visitors
      FROM user_activity_logs
      WHERE DATE(created_at) = CURDATE() AND event_type = 'PAGE_VIEW'
      GROUP BY page_url
      ORDER BY views DESC
      LIMIT 10
    `);

    // 3. Event types breakdown
    const [eventBreakdown] = await db.query(`
      SELECT 
        event_type, 
        COUNT(*) AS count
      FROM user_activity_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY event_type
      ORDER BY count DESC
    `);

    // 4. Device types breakdown
    const [deviceBreakdown] = await db.query(`
      SELECT 
        device_type, 
        COUNT(*) AS count
      FROM user_activity_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY device_type
      ORDER BY count DESC
    `);

    return res.status(200).json({
      success: true,
      data: {
        today: {
          totalEvents: Number(todayStats?.total_events_today || 0),
          uniqueVisitors: Number(todayStats?.unique_visitors_today || 0),
          pageViews: Number(todayStats?.page_views_today || 0),
          actionClicks: Number(todayStats?.action_clicks_today || 0),
        },
        topPages,
        eventBreakdown,
        deviceBreakdown,
      },
    });
  } catch (error) {
    console.error("Error in getActivitySummary:", error);
    return res.status(500).json({ success: false, message: "Error fetching activity summary", error: error.message });
  }
};
