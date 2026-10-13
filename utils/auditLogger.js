const db = require("../config/db");

/**
 * Universal Operational Audit Logger Helper
 * Non-blocking, isolated execution to guarantee business transactions never fail on audit log errors.
 *
 * @param {Object} params
 * @param {number|string} params.agentId - ID of the admin/agent/staff performing the action
 * @param {string} [params.agentName] - Name of the admin/agent
 * @param {string} params.action - Action descriptor (e.g. 'LOGIN', 'APPROVE_SELLER', 'VERIFY_PANDIT', 'CANCEL_ORDER')
 * @param {string} [params.targetType] - Entity affected (e.g. 'seller', 'pandit', 'order', 'agent', 'user')
 * @param {string|number} [params.targetId] - ID of the entity affected
 * @param {Object|string} [params.details] - Details, reasons, or before/after state diff
 * @param {string} [params.ipAddress] - Client IP address
 */
const recordAgentAuditLog = async ({
  agentId,
  agentName,
  action,
  targetType,
  targetId,
  details,
  ipAddress,
}) => {
  try {
    const detailStr =
      typeof details === "object" ? JSON.stringify(details) : details || null;

    await db.query(
      `INSERT INTO agent_audit_logs (agent_id, agent_name, action, target_type, target_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        agentId || 0,
        agentName || null,
        action,
        targetType || null,
        targetId ? String(targetId) : null,
        detailStr,
        ipAddress || null,
      ]
    );
  } catch (err) {
    // Fail-safe: Audit logging failures must never break the main user transaction
    console.error("❌ [Audit Log Failed (Non-blocking)]:", err.message);
  }
};

module.exports = {
  recordAgentAuditLog,
};
