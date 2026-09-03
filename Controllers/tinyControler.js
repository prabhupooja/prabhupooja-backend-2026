const db = require('../config/db');

exports.create = async (req, res) => {
    const { title, pera } = req.body;
    const image = req.file ? req.file.location : null;
    if (!title || !pera) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }


    try {
        const timestamp = new Date()
        const [result] = await db.query(
            `INSERT INTO tiny_blogs (title, pera,image,timestamp ) VALUES (?,?,?,?)`,
            [title, pera,image,timestamp]
        );

        return res.status(201).json({
            success: true,
            message: 'Blog created successfully',
            blogId: result.insertId
        });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};


exports.getAll = async (req, res) => {
    let retries = 1;
    while (retries >= 0) {
        try {
            const [blogs] = await db.query(`SELECT * FROM tiny_blogs ORDER BY id DESC`);

            return res.status(200).json({
                success: true,
                message: 'Blogs fetched successfully',
                data: blogs
            });
        } catch (error) {
            console.error("Error:", error);
            if (error.code === 'ECONNRESET' && retries > 0) {
                retries--;
                continue;
            }
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await db.query(`SELECT * FROM tiny_blogs WHERE id=?`, [id]);
        if (!data || data.length === 0) {
            return res.status(404).send({
                success: false,
                message: "blog not found",
            });
        }

        return res.status(200).send({
            success: true,
            data: data[0],
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
        });
    }
};