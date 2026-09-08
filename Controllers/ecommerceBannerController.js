const db = require('../config/db');
const { getCache, setCache, deleteCache } = require("../config/redis");

// Invalidate ecommerce banner cache helper
const clearEcommerceBannerCache = async () => {
    try {
        await deleteCache("ecommerce_banner:all");
        await deleteCache("ecommerce_banner:*");
    } catch (e) {
        console.warn("Ecommerce banner cache clear warning:", e.message);
    }
};

// Create an E-Commerce Banner
exports.create = async (req, res) => {
    let image = null;
    if (req.file) {
        image = req.file.location || (req.file.key ? `https://${process.env.S3_BUCKET_NAME || 'prabhupooja1'}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${req.file.key}` : null) || req.file.path || req.file.filename;
    } 
    
    if (!image && req.files) {
        if (Array.isArray(req.files) && req.files.length > 0) {
            image = req.files[0].location || req.files[0].path || req.files[0].filename;
        } else if (req.files.image && req.files.image.length > 0) {
            image = req.files.image[0].location || req.files.image[0].path || req.files.image[0].filename;
        }
    }

    if (!image && req.body) {
        image = req.body.image || req.body.imageUrl || req.body.image_url || req.body.banner || req.body.bannerImage || req.body.banner_image || req.body.img || req.body.file;
        if (typeof image === 'object' && image !== null) {
            image = image.url || image.location || image.path || image.src || image.uri || null;
        }
    }

    if (!image && req.body && typeof req.body.data === 'string') {
        try {
            const parsed = JSON.parse(req.body.data);
            image = parsed.image || parsed.imageUrl || parsed.image_url || parsed.banner || parsed.banner_image;
        } catch (e) {}
    }

    const title = req.body?.title || req.body?.name || '';
    const redirect_url = req.body?.redirect_url || req.body?.redirectUrl || req.body?.url || '';
    const status = req.body?.status !== undefined ? parseInt(req.body.status, 10) : 1;

    const finalTitle = title && String(title).trim() ? String(title).trim() : null;
    const finalImage = image && String(image).trim() ? String(image).trim() : '';
    const finalRedirectUrl = redirect_url && String(redirect_url).trim() ? String(redirect_url).trim() : null;
    const finalStatus = (!isNaN(status) && status !== null && status !== undefined) ? parseInt(status, 10) : 1;

    if (!finalImage || finalImage === 'undefined' || finalImage === 'null') {
        return res.status(400).json({
            success: false,
            message: "Banner image is required. Please upload or select a banner image."
        });
    }

    try {
        const [data] = await db.query(
            `INSERT INTO ecommerce_banner (title, image, redirect_url, status) VALUES (?, ?, ?, ?)`, 
            [finalTitle, finalImage, finalRedirectUrl, finalStatus]
        );

        if (!data || !data.insertId) {
            return res.status(500).json({
                success: false,
                message: "Error inserting ecommerce banner"
            });
        }

        // Invalidate banner cache
        await clearEcommerceBannerCache();

        return res.status(201).json({
            success: true,
            message: "E-Commerce banner added successfully",
            data: {
                id: data.insertId,
                title: finalTitle,
                image: finalImage,
                redirect_url: finalRedirectUrl,
                status: finalStatus
            }
        });
    } catch (err) {
        console.error("Error adding ecommerce banner:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error",
            error: err.message
        });
    }
};

// Update an E-Commerce Banner
exports.update = async (req, res) => {
    const id = req.params.id || req.body?.id || req.query?.id;
    let image = null;
    if (req.file) {
        image = req.file.location || (req.file.key ? `https://${process.env.S3_BUCKET_NAME || 'prabhupooja1'}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${req.file.key}` : null) || req.file.path || req.file.filename;
    } 
    
    if (!image && req.files && Array.isArray(req.files) && req.files.length > 0) {
        image = req.files[0].location || req.files[0].path || req.files[0].filename;
    }

    if (!image && req.body?.image) {
        image = req.body.image;
        if (typeof image === 'object' && image !== null) {
            image = image.url || image.location || image.path || null;
        }
    }
    const title = req.body?.title !== undefined ? req.body.title : undefined;
    const redirect_url = req.body?.redirect_url !== undefined ? req.body.redirect_url : (req.body?.redirectUrl !== undefined ? req.body.redirectUrl : req.body?.url);
    const status = req.body?.status !== undefined ? parseInt(req.body.status, 10) : undefined;

    if (!id) {
        return res.status(400).send({
            success: false,
            message: "ID is required"
        });
    }

    try {
        const updates = [];
        const values = [];

        if (image) {
            updates.push("image = ?");
            values.push(image);
        }
        if (title !== undefined) {
            updates.push("title = ?");
            values.push(title);
        }
        if (redirect_url !== undefined) {
            updates.push("redirect_url = ?");
            values.push(redirect_url);
        }
        if (status !== undefined) {
            updates.push("status = ?");
            values.push(status);
        }

        if (updates.length === 0) {
            return res.status(400).send({
                success: false,
                message: "No fields provided to update"
            });
        }

        values.push(id);
        const [result] = await db.query(
            `UPDATE ecommerce_banner SET ${updates.join(", ")} WHERE id = ?`,
            values
        );

        if (!result || result.affectedRows === 0) {
            return res.status(404).send({
                success: false,
                message: "E-Commerce banner not found"
            });
        }

        // Invalidate banner cache
        await clearEcommerceBannerCache();

        return res.status(200).send({
            success: true,
            message: "E-Commerce banner updated successfully"
        });
    } catch (err) {
        console.error("Error updating ecommerce banner:", err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
            error: err.message
        });
    }
};

// Get All E-Commerce Banners (Cached, newest first)
exports.getAll = async (req, res) => {
    const includeAll = req.query.all === "true" || req.query.includeAll === "true";
    const cacheKey = includeAll ? "ecommerce_banner:all_admin" : "ecommerce_banner:all";

    try {
        const cachedData = await getCache(cacheKey);
        if (cachedData && Array.isArray(cachedData)) {
            res.setHeader("X-Cache", "HIT");
            return res.status(200).send({
                success: true,
                count: cachedData.length,
                data: cachedData,
                banners: cachedData
            });
        }

        const query = includeAll 
            ? `SELECT * FROM ecommerce_banner ORDER BY id DESC`
            : `SELECT * FROM ecommerce_banner WHERE status = 1 ORDER BY id DESC`;

        const [data] = await db.query(query);
        const bannerList = data || [];

        await setCache(cacheKey, bannerList, 180); // 3 mins cache
        res.setHeader("X-Cache", "MISS");

        return res.status(200).send({
            success: true,
            count: bannerList.length,
            data: bannerList,
            banners: bannerList
        });
    } catch (err) {
        console.error("Error fetching ecommerce banners:", err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
            error: err.message
        });
    }
};

// Get Single E-Commerce Banner by ID
exports.getById = async (req, res) => {
    const id = req.params.id || req.query?.id;
    if (!id) {
        return res.status(400).send({
            success: false,
            message: "Banner ID is required"
        });
    }
    try {
        const [data] = await db.query(`SELECT * FROM ecommerce_banner WHERE id = ?`, [id]);
        if (!data || data.length === 0) {
            return res.status(404).send({
                success: false,
                message: "E-Commerce banner not found"
            });
        }
        return res.status(200).send({
            success: true,
            data: data[0]
        });
    } catch (err) {
        console.error("Error fetching ecommerce banner by id:", err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};

// Delete an E-Commerce Banner
exports.delete = async (req, res) => {
    const id = req.params.id || req.body?.id || req.query?.id;
    if (!id) {
        return res.status(400).send({
            success: false,
            message: "ID is required"
        });
    }
    try {
        const [result] = await db.query(`DELETE FROM ecommerce_banner WHERE id = ?`, [id]);
        if (!result || result.affectedRows === 0) {
            return res.status(404).send({
                success: false,
                message: "E-Commerce banner not found"
            });
        }

        // Invalidate banner cache
        await clearEcommerceBannerCache();

        return res.status(200).send({
            success: true,
            message: "E-Commerce banner deleted successfully"
        });
    } catch (err) {
        console.error("Error deleting ecommerce banner:", err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
            error: err.message
        });
    }
};
