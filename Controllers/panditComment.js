const db = require('../config/db');

exports.comment = async (req, res) => {
    const { id } = req.params;
    const { name, email,rating, comment } = req.body;

    if (!name || !email || !comment||!rating) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required!',
        });
    }

    try {
        const [existingPandit] = await db.query('SELECT * FROM pandit WHERE id = ?', [id]);
        if (existingPandit.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pandit not found',
            });
        }
        const [existingComment] = await db.query(
            'SELECT * FROM pandit_comment WHERE pandit_id = ? AND email = ?',
            [id, email]
        );

        if (existingComment.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You have already commented on this pandit!',
            });
        }
        await db.query(
            'INSERT INTO pandit_comment (pandit_id, name, email, comment,rating, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [id, name, email, comment,rating]
        );
        return res.status(201).json({
            success: true,
            message: 'Comment added successfully!',
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

exports.getCommentsByPandit = async (req, res) => {
    const { id } = req.params; // Pandit ID

    try {
        // Check if the Pandit exists
        const [existingPandit] = await db.query('SELECT * FROM pandit WHERE id = ?', [id]);
        if (existingPandit.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pandit not found',
            });
        }

        // Fetch comments
        const [comments] = await db.query(
            `SELECT name, email, comment, rating, created_at 
             FROM pandit_comment 
             WHERE pandit_id = ? 
             ORDER BY created_at DESC`,
            [id]
        );

        // Fetch total comments & average rating
        const [statsResult] = await db.query(
            `SELECT COUNT(*) AS comment_count, 
                    COALESCE(AVG(rating), 0) AS average_rating 
             FROM pandit_comment 
             WHERE pandit_id = ?`,
            [id]
        );

        const commentCount = statsResult[0].comment_count;
        const averageRating = parseFloat(statsResult[0].average_rating).toFixed(2); // Ensure float before toFixed()

        return res.status(200).json({
            success: true,
            commentCount,
            averageRating: parseFloat(averageRating), // Convert string to number
            comments,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};
