const db = require('../config/db');

exports.create = async (req, res) => {
    const images = req.files ? req.files.map(file => file.location) : []; // Multiple image locations

    if (images.length === 0) {
        return res.status(400).send({
            success: false,
            message: "No images uploaded"
        });
    }

    try {
        for (let image of images) {
            await db.query(`INSERT INTO blogs (image) VALUES(?)`, [image]);
        }

        return res.status(201).send({
            success: true,
            message: "Banners added successfully"
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};


exports.getAll = async (req, res) => {
    try {
        const data = await db.query(`SELECT * FROM blogs`);
        return res.status(200).send({
            success: true,
            blogs: data[0], 
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
        });
    }
};


exports.getById = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).send({
            success: false,
            message: 'Blog ID is required',
        });
    }

    try {
        const data = await db.query(`SELECT * FROM blogs WHERE id = ?`, [id]);

        if (data[0].length === 0) {
            return res.status(404).send({
                success: false,
                message: 'Blog not found',
            });
        }

        return res.status(200).send({
            success: true,
            blog: data[0][0], // Return the first matching blog
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params; 
    const images = req.files ? req.files.map(file => file.location) : []; 

    if (!id) {
        return res.status(400).send({
            success: false,
            message: "Blog ID is required"
        });
    }

    if (images.length === 0) {
        return res.status(400).send({
            success: false,
            message: "No images uploaded"
        });
    }

    try {
        await db.query(`UPDATE blogs SET image = ? WHERE id = ?`, [images[0], id]);
        
        return res.status(200).send({
            success: true,
            message: "Blog image updated successfully"
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};

exports.updateBlog = async (req, res) => {
    const { id } = req.params; // Blog ID from request parameters
    const images = req.files ? req.files.map(file => file.location) : []; // Multiple image locations

    if (!id) {
        return res.status(400).send({
            success: false,
            message: "Blog ID is required"
        });
    }

    if (images.length === 0) {
        return res.status(400).send({
            success: false,
            message: "No images uploaded"
        });
    }

    try {
        await db.query(`UPDATE blogs SET image = ? WHERE id = ?`, [images[0], id]);
        
        return res.status(200).send({
            success: true,
            message: "Blog image updated successfully"
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};

exports.deleteBlog = async (req, res) => {
    const { id } = req.params; // Blog ID from request parameters

    if (!id) {
        return res.status(400).send({
            success: false,
            message: "Blog ID is required"
        });
    }

    try {
        await db.query(`DELETE FROM blogs WHERE id = ?`, [id]);
        
        return res.status(200).send({
            success: true,
            message: "Blog deleted successfully"
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};


exports.update = async (req, res) => {
    const { id } = req.params;
    const { title, pera } = req.body;
    const image = req.file ? req.file.location : null;

    try {
        // Check if the blog exists
        const existingBlog = await db.query('SELECT * FROM tiny_blogs WHERE id = ?', [id]);

        if (existingBlog[0].length === 0) {
            return res.status(404).send({
                success: false,
                message: 'Blog not found',
            });
        }

        // Get existing values to preserve them if not provided in the request
        const currentBlog = existingBlog[0][0]; // Extract the first row

        const updatedTitle = title || currentBlog.title;
        const updatedPera = pera || currentBlog.pera;
        const updatedImage = image || currentBlog.image;

        // Update only the provided fields
        const updateQuery = `
            UPDATE tiny_blogs
            SET title = ?, pera = ?, image = ?
            WHERE id = ?
        `;

        const result = await db.query(updateQuery, [updatedTitle, updatedPera, updatedImage, id]);

        if (result[0].affectedRows === 0) {
            return res.status(400).send({
                success: false,
                message: 'No changes were made to the blog',
            });
        }

        return res.status(200).send({
            success: true,
            message: 'Blog updated successfully',
        });
    } catch (err) {
        console.error("Error:", err);
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
            error: err.message || err,
        });
    }
};


exports.delete = async (req, res) => {
    const { id } = req.params; // Get the blog ID from URL params

    try {
        // Check if the blog exists
        const existingBlog = await db.query('SELECT * FROM tiny_blogs WHERE id = ?', [id]);
        if (existingBlog[0].length === 0) {
            return res.status(404).send({
                success: false,
                message: 'Blog not found',
            });
        }
        await db.query('DELETE FROM blog_comments WHERE blog_id = ?', [id]);
        // Delete the blog
        const result = await db.query('DELETE FROM tiny_blogs WHERE id = ?', [id]);

        if (result[0].affectedRows === 0) {
            return res.status(404).send({
                success: false,
                message: 'Failed to delete blog',
            });
        }

        return res.status(200).send({
            success: true,
            message: 'Blog deleted successfully',
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
        });
    }
};


exports.comment = async (req, res) => {
    const { id } = req.params;
    const { name, email, comment, like } = req.body;

    if (!name || !email || !comment) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required!',
        });
    }

    try {
        const [existingBlog] = await db.query('SELECT * FROM tiny_blogs WHERE id = ?', [id]);
        if (existingBlog.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found',
            });
        }

        // Check if the user has already commented using the same email
        const [existingComment] = await db.query(
            'SELECT * FROM blog_comments WHERE blog_id = ? AND email = ?',
            [id, email]
        );

        if (existingComment.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You have already commented on this blog!',
            });
        }

        // Insert the new comment
        await db.query(
            'INSERT INTO blog_comments (blog_id, name, email, comment, like_count, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [id, name, email, comment, like ? 1 : 0]
        );

        // Update like count in blogs table only if like is true
        if (like) {
            await db.query('UPDATE tiny_blogs SET like_count = like_count + 1 WHERE id = ?', [id]);
        }

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



exports.likeBlog = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if the blog exists
        const [existingBlog] = await db.query('SELECT * FROM tiny_blogs WHERE id = ?', [id]);
        if (existingBlog.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found',
            });
        }

        // Increment like count in the `blogs` table
        await db.query('UPDATE tiny_blogs SET like_count = like_count + 1 WHERE id = ?', [id]);

        return res.status(200).json({
            success: true,
            message: 'Blog liked successfully!',
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};


exports.getBlogDetails = async (req, res) => {
    const { id } = req.params; 

    try {
        const [result] = await db.query(
            `SELECT 
                b.id AS blog_id,
                b.like_count AS total_likes,
                COUNT(c.id) AS total_comments,
                JSON_ARRAYAGG(
                JSON_OBJECT(
                'name', c.name,
                'email', c.email,
                'comment', c.comment
                 )
                 ) AS comments
                FROM tiny_blogs b
            LEFT JOIN blog_comments c ON b.id = c.blog_id
            WHERE b.id = ?
            GROUP BY b.id, b.like_count;`,
            [id]
        );

        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found',
            });
        }

        return res.status(200).json({
            success: true,
            data: result[0],
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};


exports.getRecommendationBlog = async (req, res) => {
    try {
        const { keyword, id } = req.query;
        const blogId = id ? parseInt(id, 10) : null;
        const decodedKeyword = keyword ? decodeURIComponent(keyword) : '';

        // console.log("Received Query Params:", { keyword: decodedKeyword, id: blogId });

        // Function to extract Hindi & English keywords
        const extractKeywords = (text) => {
            if (!text) return [];
            return text
                .replace(/[^\p{L}\p{N}\s]/gu, '') // Unicode-safe regex: keeps letters/numbers in all languages
                .split(/\s+/) // Split by spaces
                .filter(word => word.length > 2) // Only meaningful words (Hindi words are usually >2 chars)
                .slice(0, 5); // Limit to 5 keywords
        };

        let searchResults = [];

        if (decodedKeyword.trim().length >= 2) {
            const extractedKeywords = extractKeywords(decodedKeyword);
            // console.log("Extracted Keywords:", extractedKeywords);

            if (extractedKeywords.length > 0) {
                const searchQuery = `
                    SELECT * FROM tiny_blogs 
                    WHERE (${extractedKeywords.map(() => `(title LIKE ? OR pera LIKE ?)`).join(' OR ')}) 
                    ${blogId ? 'AND id != ?' : ''} 
                    LIMIT 5`;

                let params = [];
                extractedKeywords.forEach(word => {
                    params.push(`%${word}%`, `%${word}%`);
                });
                if (blogId) params.push(blogId);

                // console.log("Executing Search Query:", searchQuery);
                // console.log("Query Parameters:", params);

                try {
                    const [searchData] = await db.query(searchQuery, params);
                    searchResults = searchData;
                    // console.log("Search Query Results:", searchResults);
                } catch (queryError) {
                    // console.error("Search Query Error:", queryError.message);
                }
            }
        }

        if (searchResults.length < 5) {
            const latestQuery = blogId
                ? `SELECT * FROM tiny_blogs WHERE id != ? ORDER BY created_at DESC LIMIT ?`
                : `SELECT * FROM tiny_blogs ORDER BY created_at DESC LIMIT ?`;

            const latestParams = blogId ? [blogId, 5 - searchResults.length] : [5 - searchResults.length];

            // console.log("Executing Latest Query:", latestQuery);
            // console.log("Latest Query Parameters:", latestParams);

            try {
                const [latestData] = await db.query(latestQuery, latestParams);
                searchResults = [...searchResults, ...latestData];
            } catch (latestQueryError) {
                console.error("Latest Query Error:", latestQueryError.message);
            }
        }

        return res.status(200).send({
            success: true,
            blogs: searchResults,
        });

    } catch (err) {
        console.error("Error fetching blogs:", err.message, err.stack);
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
        });
    }
};



