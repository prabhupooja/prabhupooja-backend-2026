const { AdmingenerateToken } = require('../config/admintoken');
const db = require('../config/db');
const dotenv = require('dotenv')
dotenv.config();

exports.login = async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).send({
            success: false,
            message: 'All fields are required',
        });
    }

    try {
        // Step 1: Check if username exists in the database
        const [rows] = await db.query(
            `SELECT * FROM admin WHERE username = ? AND role = ?`,
            [username, role]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).send({
                success: false,
                message: 'User not found',
            });
        }

        const user = rows[0];
        const isPasswordValid = (password === user.password);

        if (!isPasswordValid) {
            return res.status(401).send({
                success: false,
                message: 'Invalid password',
            });
        }

        const token = AdmingenerateToken(user.id);

        // Update the token in the database, whether the user is logging in for the first time or repeatedly
        const [update] = await db.query(
            `UPDATE admin SET token = ? WHERE username = ? AND role = ?`,
            [token, username, role]
        );

        if (update.affectedRows === 0) {
            return res.status(500).send({
                success: false,
                message: 'Failed to update token in database',
            });
        }

        return res.status(200).send({
            success: true,
            message: 'Login successful',
            token: token,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error',
        });
    }
};
exports.updateAdmin = async (req, res) => {
    const { id } = req.params; 
    const { name, password } = req.body;

    if (!id) {
        return res.status(400).send({
            success: false,
            message: "ID is required",
        });
    }

    try {
       
        const [existingUser] = await db.query(`SELECT * FROM admin WHERE id = ?`, [id]);

        if (existingUser.length === 0) {
            return res.status(404).send({
                success: false,
                message: "User not found",
            });
        }

    
        let query = `UPDATE admin SET `;
        let fields = [];
        let values = [];

        if (name) {
            fields.push(`name = ?`);
            values.push(name);
        }

        if (password) {
            fields.push(`password = ?`);
            values.push(password);
        }

        if (fields.length === 0) {
            return res.status(400).send({
                success: false,
                message: "Nothing to update",
            });
        }

        query += fields.join(", ") + ` WHERE id = ?`;
        values.push(id);

        const [updateResult] = await db.query(query, values);

        if (updateResult.affectedRows === 0) {
            return res.status(500).send({
                success: false,
                message: "Update failed",
            });
        }

        return res.status(200).send({
            success: true,
            message: "User updated successfully",
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
        });
    }
};
exports.getAdminByToken = async (req, res) => {
    try {
      const userId = req.user.id;
      if (!userId) {
        return res.status(401).send({
          success: false,
          message: "Unauthorized access",
        });
      }
      const [userResult] = await db.query("SELECT * FROM admin WHERE id = ?", [userId]);
  
      if (userResult.length === 0) {
        return res.status(404).send({
          success: false,
          message: "User not found",
        });
      }
      return res.status(200).send({
        success: true,
        message: "User record retrieved successfully",
        data: userResult[0],
      });
    } catch (error) {
      console.error("Error in getUser function:", error);
      return res.status(500).send({
        success: false,
        message: "Error in fetching user data",
        error,
      });
    }
  };
  