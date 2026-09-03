const db = require('../config/db');
const { AgentGenerateToken } = require('../config/agentToken');


exports.create = async (req, res) => {
    try {
        const { name, email, number, gender } = req.body;
        const profile = req.file ? req.file.location : null;

        // Check for missing required fields
        if (!name || !email || !number || !gender) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, number, and gender are required fields',
            });
        }

        // Use provided password or generate one
        const generatePassword = (name) => {
            const firstName = name.trim().split(' ')[0];
            const specialChars = ['@', '#', '!', '$', '%', '^', '&', '*'];
            const randomSpecialChar = specialChars[Math.floor(Math.random() * specialChars.length)];
            const randomNumbers = Math.floor(Math.random() * 9000) + 1000;
            return `${firstName.charAt(0).toLowerCase()}${firstName.charAt(1).toUpperCase()}${randomSpecialChar}${randomNumbers}`;
        };

        const password = req.body.password && req.body.password.trim() ? req.body.password.trim() : generatePassword(name);

        const role = 'agent';

        // Check if email or number already exists
        const [existingUser] = await db.query(
            `SELECT id FROM agent WHERE email = ? OR number = ?`,
            [email, number]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email or number already exists',
            });
        }

        // Insert new agent into the database
        const [result] = await db.query(
            `INSERT INTO agent (name, email, number, profile, password, role, gender) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, email, number, profile, password, role, gender]
        );

        return res.status(201).json({
            success: true,
            message: 'Agent created successfully',
            data: { id: result.insertId, name, email, number, role, profile },
        });
    } catch (error) {
        console.error('Error creating agent:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error, please try again later.',
        });
    }
};


exports.getAllAgents = async (req, res) => {
    try {
        const [agents] = await db.query(`SELECT * FROM agent`);

        if (agents.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No agents found",
            });
        }

        return res.status(200).send({
            success: true,
            message: "Agents retrieved successfully",
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


exports.getAgentById = async (req, res) => {
    const { id } = req.params;

    try {
        const [agent] = await db.query(`SELECT * FROM agent WHERE id = ?`, [id]);

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

exports.updateAgentById = async (req, res) => {
    try {
        const { id } = req.params; // Get agent ID from URL
        const { name, email, number, gender,password } = req.body;
        const profile = req.file ? req.file.location : null; // Handle profile image upload

        // Check if the agent exists
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
            // Check if email already exists for another agent
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
                    message: 'Number already exists',
                });
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
        if(password){
            updateFields.push("password = ?");
            values.push(password)
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

        // Fetch the updated agent details
        const [updatedAgent] = await db.query(`SELECT id, name, email, number, gender,password, profile FROM agent WHERE id = ?`, [id]);

        return res.status(200).json({
            success: true,
            message: 'Agent updated successfully',
            data: updatedAgent[0], // Return updated agent details
        });
    } catch (error) {
        console.error('Error updating agent:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error, please try again later.',
        });
    }
};



exports.deleteAgentById = async (req, res) => {
    const { id } = req.params;

    try {
        const [existingAgent] = await db.query(`SELECT * FROM agent WHERE id = ?`, [id]);

        if (existingAgent.length === 0) {
            return res.status(404).send({
                success: false,
                message: "Agent not found",
            });
        }

        await db.query(`DELETE FROM agent WHERE id = ?`, [id]);

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
        const isPasswordValid = (password === user.password);

        if (!isPasswordValid) {
            return res.status(401).send({
                success: false,
                message: 'Invalid password',
            });
        }
        const token = AgentGenerateToken(user.id);

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
                role: user.role || 'agent'
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
            `SELECT * FROM agent WHERE id = ?`,
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
            updateFields.push("password = ?");
            values.push(password.trim());
        }

        if (updateFields.length > 0) {
            values.push(id);
            await db.query(`UPDATE agent SET ${updateFields.join(", ")} WHERE id = ?`, values);
        }

        const [updated] = await db.query(`SELECT id, name, email, number, gender, profile, role FROM agent WHERE id = ?`, [id]);

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

