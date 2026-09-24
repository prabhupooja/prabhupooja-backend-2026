const db = require('../config/db');
const { AgentGenerateToken } = require('../config/agentToken');
const bcrypt = require('bcrypt');

/**
 * Internal Audit Logger Helper
 */
const recordAgentAuditLog = async ({ agentId, agentName, action, targetType, targetId, details, ipAddress }) => {
  try {
    const detailStr = typeof details === 'object' ? JSON.stringify(details) : (details || null);
    await db.query(
      `INSERT INTO agent_audit_logs (agent_id, agent_name, action, target_type, target_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [agentId, agentName || null, action, targetType || null, targetId ? String(targetId) : null, detailStr, ipAddress || null]
    );
  } catch (err) {
    console.error('Error recording agent audit log:', err.message);
  }
};
exports.recordAgentAuditLog = recordAgentAuditLog;

/**
 * Create a new Agent (Admin-only or privileged creator)
 */
exports.create = async (req, res) => {
    try {
        const { name, email, number, gender, status, permissions } = req.body;
        const profile = req.file ? req.file.location : null;

        if (!name || !email || !number || !gender) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, number, and gender are required fields',
            });
        }

        const generatePassword = (rawName) => {
            const firstName = rawName.trim().split(' ')[0];
            const specialChars = ['@', '#', '!', '$', '%', '&'];
            const randomSpecialChar = specialChars[Math.floor(Math.random() * specialChars.length)];
            const randomNumbers = Math.floor(Math.random() * 9000) + 1000;
            return `${firstName.charAt(0).toLowerCase()}${firstName.charAt(1).toUpperCase()}${randomSpecialChar}${randomNumbers}`;
        };

        const rawPassword = req.body.password && req.body.password.trim() ? req.body.password.trim() : generatePassword(name);
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        const role = 'agent';
        const agentStatus = status || 'active';
        const permString = typeof permissions === 'object' ? JSON.stringify(permissions) : (permissions || null);

        const [existingUser] = await db.query(
            `SELECT id FROM agent WHERE email = ? OR number = ?`,
            [email, number]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email or phone number already exists',
            });
        }

        const [result] = await db.query(
            `INSERT INTO agent (name, email, number, profile, password, role, gender, status, permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, email, number, profile, hashedPassword, role, gender, agentStatus, permString]
        );

        // Audit log
        if (req.user) {
            await recordAgentAuditLog({
                agentId: req.user.id,
                agentName: req.user.name || 'Admin',
                action: 'CREATE_AGENT',
                targetType: 'agent',
                targetId: result.insertId,
                details: { name, email, number, status: agentStatus },
                ipAddress: req.ip
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Agent created successfully',
            data: {
                id: result.insertId,
                name,
                email,
                number,
                role,
                profile,
                gender,
                status: agentStatus,
                generatedPassword: req.body.password ? undefined : rawPassword
            },
        });
    } catch (error) {
        console.error('Error creating agent:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error, please try again later.',
        });
    }
};

/**
 * Get all Agents (Excludes password)
 */
exports.getAllAgents = async (req, res) => {
    try {
        const [agents] = await db.query(
            `SELECT id, name, email, number, role, profile, gender, status, permissions, created_at, updated_at FROM agent ORDER BY id DESC`
        );

        return res.status(200).send({
            success: true,
            message: "Agents retrieved successfully",
            count: agents.length,
            data: agents,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Server error, please try again later.",
        });
    }
};

/**
 * Get Agent By ID (Excludes password)
 */
exports.getAgentById = async (req, res) => {
    const { id } = req.params;

    try {
        const [agent] = await db.query(
            `SELECT id, name, email, number, role, profile, gender, status, permissions, created_at, updated_at FROM agent WHERE id = ?`,
            [id]
        );

        if (agent.length === 0) {
            return res.status(404).send({
                success: false,
                message: "Agent not found",
            });
        }

        return res.status(200).send({
            success: true,
            message: "Agent retrieved successfully",
            data: agent[0],
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Server error, please try again later.",
        });
    }
};

/**
 * Update Agent By ID
 */
exports.updateAgentById = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, number, gender, password, status, permissions } = req.body;
        const profile = req.file ? req.file.location : null;

        const [existingAgent] = await db.query(`SELECT * FROM agent WHERE id = ?`, [id]);

        if (existingAgent.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found',
            });
        }

        let updateFields = [];
        let values = [];

        if (name) {
            updateFields.push("name = ?");
            values.push(name);
        }
        if (email) {
            const [emailCheck] = await db.query(`SELECT id FROM agent WHERE email = ? AND id != ?`, [email, id]);
            if (emailCheck.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists',
                });
            }
            updateFields.push("email = ?");
            values.push(email);
        }
        if (number) {
            const [numberCheck] = await db.query(`SELECT id FROM agent WHERE number = ? AND id != ?`, [number, id]);
            if (numberCheck.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number already exists',
                });
            }
            updateFields.push("number = ?");
            values.push(number);
        }
        if (gender) {
            updateFields.push("gender = ?");
            values.push(gender);
        }
        if (status) {
            updateFields.push("status = ?");
            values.push(status);
        }
        if (permissions) {
            const permStr = typeof permissions === 'object' ? JSON.stringify(permissions) : permissions;
            updateFields.push("permissions = ?");
            values.push(permStr);
        }
        if (profile) {
            updateFields.push("profile = ?");
            values.push(profile);
        }
        if (password && password.trim()) {
            const hashed = await bcrypt.hash(password.trim(), 10);
            updateFields.push("password = ?");
            values.push(hashed);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields provided for update',
            });
        }

        values.push(id);
        const updateQuery = `UPDATE agent SET ${updateFields.join(", ")} WHERE id = ?`;
        await db.query(updateQuery, values);

        if (req.user) {
            await recordAgentAuditLog({
                agentId: req.user.id,
                agentName: req.user.name || 'Admin',
                action: 'UPDATE_AGENT',
                targetType: 'agent',
                targetId: id,
                details: { updatedFields: updateFields },
                ipAddress: req.ip
            });
        }

        const [updatedAgent] = await db.query(
            `SELECT id, name, email, number, gender, role, profile, status, permissions, created_at, updated_at FROM agent WHERE id = ?`,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: 'Agent updated successfully',
            data: updatedAgent[0],
        });
    } catch (error) {
        console.error('Error updating agent:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error, please try again later.',
        });
    }
};

/**
 * Delete Agent By ID (Admin only)
 */
exports.deleteAgentById = async (req, res) => {
    const { id } = req.params;

    try {
        const [existingAgent] = await db.query(`SELECT id, name, email FROM agent WHERE id = ?`, [id]);

        if (existingAgent.length === 0) {
            return res.status(404).send({
                success: false,
                message: "Agent not found",
            });
        }

        await db.query(`DELETE FROM agent WHERE id = ?`, [id]);

        if (req.user) {
            await recordAgentAuditLog({
                agentId: req.user.id,
                agentName: req.user.name || 'Admin',
                action: 'DELETE_AGENT',
                targetType: 'agent',
                targetId: id,
                details: { deletedAgent: existingAgent[0] },
                ipAddress: req.ip
            });
        }

        return res.status(200).send({
            success: true,
            message: "Agent deleted successfully",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Server error, please try again later.",
        });
    }
};

/**
 * Agent Login (with bcrypt & legacy plaintext auto-upgrade)
 */
exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).send({
            success: false,
            message: 'Email and password are required',
        });
    }
    try {
        const [result] = await db.query(
            `SELECT * FROM agent WHERE email = ?`,
            [email]
        );

        if (result.length === 0) {
            return res.status(404).send({
                success: false,
                message: 'User not found',
            });
        }

        const user = result[0];

        // Check account status
        if (user.status && user.status !== 'active') {
            const blockMsg = user.status === 'blocked'
                ? 'Your agent account is currently blocked by Admin'
                : `Your agent account is currently ${user.status}. Please contact administrator.`;
            return res.status(403).json({
                success: false,
                message: blockMsg,
            });
        }

        let isPasswordValid = false;
        const storedPassword = user.password || '';

        if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
            isPasswordValid = await bcrypt.compare(password, storedPassword);
        } else {
            // Legacy plaintext fallback & auto-upgrade
            isPasswordValid = (password === storedPassword);
            if (isPasswordValid) {
                try {
                    const upgradedHash = await bcrypt.hash(password, 10);
                    await db.query(`UPDATE agent SET password = ? WHERE id = ?`, [upgradedHash, user.id]);
                    console.log(`[Agent Auth] Auto-upgraded password hash for agent ${user.email} (id: ${user.id})`);
                } catch (upgradeErr) {
                    console.error("Failed to auto-upgrade legacy agent password:", upgradeErr.message);
                }
            }
        }

        if (!isPasswordValid) {
            return res.status(401).send({
                success: false,
                message: 'Invalid email or password',
            });
        }

        const token = AgentGenerateToken(user);

        // Record audit log for login
        await recordAgentAuditLog({
            agentId: user.id,
            agentName: user.name,
            action: 'LOGIN',
            targetType: 'agent',
            targetId: user.id,
            details: 'Agent logged in successfully',
            ipAddress: req.ip
        });

        return res.status(200).send({
            success: true,
            message: 'Login successful',
            token: token,
            role: user.role || 'agent',
            agent: {
                id: user.id,
                name: user.name,
                email: user.email,
                number: user.number,
                profile: user.profile,
                gender: user.gender,
                status: user.status || 'active',
                role: user.role || 'agent',
                permissions: user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions || '{}') : user.permissions) : null
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error',
        });
    }
};

/**
 * Get Agent Profile By Token
 */
exports.getAgentProfileByToken = async (req, res) => {
    try {
        const { id } = req.user;

        if (!id) {
            return res.status(401).send({
                success: false,
                message: 'Unauthorized: Invalid token',
            });
        }

        const [result] = await db.query(
            `SELECT id, name, email, number, role, profile, gender, status, permissions, created_at, updated_at FROM agent WHERE id = ?`,
            [id]
        );

        if (result.length === 0) {
            return res.status(404).send({
                success: false,
                message: 'Agent not found',
            });
        }

        return res.status(200).send({
            success: true,
            message: 'Agent profile retrieved successfully',
            data: result[0],
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error',
        });
    }
};

/**
 * Update Agent Profile (Self)
 */
exports.updateAgentProfile = async (req, res) => {
    try {
        const { id } = req.user;
        const { name, email, number, gender, password } = req.body;
        const profile = req.file ? req.file.location : null;

        if (!id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const [existing] = await db.query(`SELECT * FROM agent WHERE id = ?`, [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }

        let updateFields = [];
        let values = [];

        if (name) {
            updateFields.push("name = ?");
            values.push(name);
        }
        if (email) {
            const [check] = await db.query(`SELECT id FROM agent WHERE email = ? AND id != ?`, [email, id]);
            if (check.length > 0) {
                return res.status(400).json({ success: false, message: 'Email already in use' });
            }
            updateFields.push("email = ?");
            values.push(email);
        }
        if (number) {
            const [check] = await db.query(`SELECT id FROM agent WHERE number = ? AND id != ?`, [number, id]);
            if (check.length > 0) {
                return res.status(400).json({ success: false, message: 'Phone number already in use' });
            }
            updateFields.push("number = ?");
            values.push(number);
        }
        if (gender) {
            updateFields.push("gender = ?");
            values.push(gender);
        }
        if (profile) {
            updateFields.push("profile = ?");
            values.push(profile);
        }
        if (password && password.trim()) {
            const hashed = await bcrypt.hash(password.trim(), 10);
            updateFields.push("password = ?");
            values.push(hashed);
        }

        if (updateFields.length > 0) {
            values.push(id);
            await db.query(`UPDATE agent SET ${updateFields.join(", ")} WHERE id = ?`, values);
        }

        const [updated] = await db.query(
            `SELECT id, name, email, number, gender, profile, role, status, permissions, created_at, updated_at FROM agent WHERE id = ?`,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updated[0]
        });
    } catch (error) {
        console.error('Error updating agent profile:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

/**
 * Change Password (Self with old password verification)
 */
exports.changePassword = async (req, res) => {
    try {
        const { id } = req.user;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Both current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
        }

        const [agents] = await db.query(`SELECT id, password FROM agent WHERE id = ?`, [id]);
        if (agents.length === 0) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }

        const agent = agents[0];
        let isCurrentValid = false;

        if (agent.password && (agent.password.startsWith('$2a$') || agent.password.startsWith('$2b$'))) {
            isCurrentValid = await bcrypt.compare(currentPassword, agent.password);
        } else {
            isCurrentValid = (currentPassword === agent.password);
        }

        if (!isCurrentValid) {
            return res.status(401).json({ success: false, message: 'Incorrect current password' });
        }

        const newHashed = await bcrypt.hash(newPassword, 10);
        await db.query(`UPDATE agent SET password = ? WHERE id = ?`, [newHashed, id]);

        await recordAgentAuditLog({
            agentId: id,
            agentName: req.user.name || 'Agent',
            action: 'CHANGE_PASSWORD',
            targetType: 'agent',
            targetId: id,
            details: 'Agent changed password successfully',
            ipAddress: req.ip
        });

        return res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing agent password:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Toggle Agent Status (Admin Only)
 */
exports.toggleAgentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['active', 'inactive', 'blocked'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status. Must be active, inactive, or blocked' });
        }

        const [agent] = await db.query(`SELECT id, name, email FROM agent WHERE id = ?`, [id]);
        if (agent.length === 0) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }

        await db.query(`UPDATE agent SET status = ? WHERE id = ?`, [status, id]);

        if (req.user) {
            await recordAgentAuditLog({
                agentId: req.user.id,
                agentName: req.user.name || 'Admin',
                action: 'TOGGLE_AGENT_STATUS',
                targetType: 'agent',
                targetId: id,
                details: { newStatus: status, agentEmail: agent[0].email },
                ipAddress: req.ip
            });
        }

        return res.status(200).json({
            success: true,
            message: `Agent status updated to ${status} successfully`
        });
    } catch (error) {
        console.error('Error toggling agent status:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Get Agent Dashboard Overview / Statistics
 */
exports.getAgentDashboardStats = async (req, res) => {
    try {
        const agentId = req.user.id;

        // 1. Pandit Stats
        const [[panditStats]] = await db.query(`
            SELECT 
                COUNT(*) AS total_pandits,
                SUM(CASE WHEN (verified = 0 OR verified IS NULL) AND (rejected = 0 OR rejected IS NULL) THEN 1 ELSE 0 END) AS pending_pandits,
                SUM(CASE WHEN verified = 1 OR status = 'approved' OR status = 'verified' THEN 1 ELSE 0 END) AS verified_pandits,
                SUM(CASE WHEN rejected = 1 OR status = 'rejected' THEN 1 ELSE 0 END) AS rejected_pandits
            FROM pandit
        `);

        // 2. Seller Stats
        const [[sellerStats]] = await db.query(`
            SELECT 
                COUNT(*) AS total_sellers,
                SUM(CASE WHEN aadhaar_status != 'approved' OR pan_status != 'approved' OR aadhaar_status IS NULL OR pan_status IS NULL THEN 1 ELSE 0 END) AS pending_sellers,
                SUM(CASE WHEN status = 'active' OR status = 'approved' OR verified = 1 THEN 1 ELSE 0 END) AS active_sellers,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_sellers
            FROM sellers
        `);

        // 3. Orders Stats
        const [[orderStats]] = await db.query(`
            SELECT 
                COUNT(*) AS total_orders,
                SUM(CASE WHEN LOWER(order_status) NOT IN ('delivered', 'cancel', 'cancelled', 'refund', 'refunded') THEN 1 ELSE 0 END) AS active_orders,
                SUM(CASE WHEN LOWER(order_status) = 'delivered' THEN 1 ELSE 0 END) AS delivered_orders,
                SUM(CASE WHEN LOWER(order_status) IN ('cancel', 'cancelled') THEN 1 ELSE 0 END) AS cancelled_orders
            FROM orders
        `);

        // 4. Returns Stats (if order_return exists)
        let returnStats = { pending_returns: 0, total_returns: 0 };
        try {
            const [[ret]] = await db.query(`
                SELECT 
                    COUNT(*) AS total_returns,
                    SUM(CASE WHEN refund_status = 'pending' OR admin_status = 'pending' THEN 1 ELSE 0 END) AS pending_returns
                FROM order_return
            `);
            returnStats = {
                total_returns: Number(ret?.total_returns || 0),
                pending_returns: Number(ret?.pending_returns || 0),
            };
        } catch (rErr) {
            // ignore if empty
        }

        // 5. Agent Personal Actions Count
        const [[myActions]] = await db.query(`
            SELECT COUNT(*) AS total_actions_taken
            FROM agent_audit_logs
            WHERE agent_id = ?
        `, [agentId]);

        // 6. Recent Audit Activities
        const [recentLogs] = await db.query(`
            SELECT id, action, target_type, target_id, details, created_at
            FROM agent_audit_logs
            WHERE agent_id = ?
            ORDER BY id DESC LIMIT 5
        `, [agentId]);

        return res.status(200).json({
            success: true,
            data: {
                pandits: {
                    total_pandits: Number(panditStats?.total_pandits || 0),
                    pending_pandits: Number(panditStats?.pending_pandits || 0),
                    verified_pandits: Number(panditStats?.verified_pandits || 0),
                    rejected_pandits: Number(panditStats?.rejected_pandits || 0),
                },
                sellers: {
                    total_sellers: Number(sellerStats?.total_sellers || 0),
                    pending_sellers: Number(sellerStats?.pending_sellers || 0),
                    active_sellers: Number(sellerStats?.active_sellers || 0),
                    rejected_sellers: Number(sellerStats?.rejected_sellers || 0),
                },
                orders: {
                    total_orders: Number(orderStats?.total_orders || 0),
                    active_orders: Number(orderStats?.active_orders || 0),
                    delivered_orders: Number(orderStats?.delivered_orders || 0),
                    cancelled_orders: Number(orderStats?.cancelled_orders || 0),
                },
                returns: returnStats,
                myActionsCount: Number(myActions?.total_actions_taken || 0),
                recentActivities: recentLogs
            }
        });
    } catch (error) {
        console.error('Error fetching agent dashboard stats:', error);
        return res.status(500).json({ success: false, message: 'Server error fetching dashboard statistics' });
    }
};

/**
 * Get Audit Logs (Admin sees all; Agent sees own)
 */
exports.getAgentLogs = async (req, res) => {
    try {
        const { role, id } = req.user;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = (page - 1) * limit;

        let query = `SELECT * FROM agent_audit_logs`;
        let countQuery = `SELECT COUNT(*) as total FROM agent_audit_logs`;
        let params = [];

        // If agent, restrict to own logs. If admin and agentId query provided, filter by it.
        if (role === 'agent') {
            query += ` WHERE agent_id = ?`;
            countQuery += ` WHERE agent_id = ?`;
            params.push(id);
        } else if (req.query.agentId) {
            query += ` WHERE agent_id = ?`;
            countQuery += ` WHERE agent_id = ?`;
            params.push(req.query.agentId);
        }

        query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
        const queryParams = [...params, limit, offset];

        const [logs] = await db.query(query, queryParams);
        const [[{ total }]] = await db.query(countQuery, params);

        return res.status(200).json({
            success: true,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            data: logs
        });
    } catch (error) {
        console.error('Error fetching agent logs:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};
