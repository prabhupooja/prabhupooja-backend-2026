const db=require('../config/db');

exports.create = async (req, res) => {
    const { name, email } = req.body;

    if (!email || !email.trim()) {
        return res.status(400).send({
            success: false,
            message: "Email is required to subscribe",
        });
    }

    try {
        // Check if the email already exists in the database
        const [existingEmail] = await db.query(`SELECT * FROM newletter WHERE email = ?`, [email.trim()]);

        if (existingEmail.length > 0) {
            return res.status(200).send({
                success: true,
                message: "You are already subscribed to our newsletter!",
            });
        }

        // Insert the new record
        const [data] = await db.query(`INSERT INTO newletter (name, email) VALUES (?, ?)`, [name ? name.trim() : null, email.trim()]);

        return res.status(201).send({
            success: true,
            message: "Thank you for subscribing to our newsletter!",
            data: { id: data.insertId }
        });
    } catch (error) {
        console.error("Newsletter subscription error:", error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};
exports.getAll = async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM newletter`);

        if (rows.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No subscribers found",
            });
        }

        return res.status(200).send({
            success: true,
            data: rows,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
        });
    }
};
