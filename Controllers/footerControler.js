const db = require('../config/db');

exports.create = async (req, res) => {
    const image = req.file ? req.file.location : null;
    try {
        const data = await db.query(`INSERT INTO footer (image) VALUES(?)`, [image]);
        if (!data) {
            return res.status(404).send({
                success: false,
                message: "Error in insert query"
            });
        }
        return res.status(201).send({
            success: true,
            message: "Footer added successfully"
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};

// Update a Banner
exports.update = async (req, res) => {
    const { id } = req.params;
    const image = req.file ? req.file.location : null;

    if (!id) {
        return res.status(400).send({
            success: false,
            message: "ID is required"
        });
    }

    try {
        const data = await db.query(
            `UPDATE footer SET image = ? WHERE id = ?`,
            [image, id]
        );

        if (data.affectedRows === 0) {
            return res.status(404).send({
                success: false,
                message: "Footer not found"
            });
        }

        return res.status(200).send({
            success: true,
            message: "Footer updated successfully"
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};

// Get All Banners
exports.getAll = async (req, res) => {
    try {
        const data = await db.query(`SELECT * FROM footer`);
        if (!data.length) {
            return res.status(404).send({
                success: false,
                message: "No footer found"
            });
        }
        return res.status(200).send({
            success: true,
           data: data[0]
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};
