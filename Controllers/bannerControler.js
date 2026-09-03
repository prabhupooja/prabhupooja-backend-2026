const db = require('../config/db');
const { getCache, setCache, deleteCache } = require("../config/redis");

// Invalidate banner cache helper
const clearBannerCache = async () => {
    try {
        await deleteCache("banner:all");
        await deleteCache("banner:*");
    } catch (e) {
        console.warn("Banner cache clear warning:", e.message);
    }
};

// Create a Banner
exports.create = async (req, res) => {
    const image = req.file ? req.file.location : (req.body?.image || null);
    const redirect_url = req.body?.redirect_url || req.body?.redirectUrl || req.body?.url || '';

    if (!image) {
        return res.status(400).send({
            success: false,
            message: "Banner image is required"
        });
    }

    try {
        const [data] = await db.query(
            `INSERT INTO banner (image, redirect_url) VALUES(?, ?)`, 
            [image, redirect_url]
        );

        if (!data || !data.insertId) {
            return res.status(500).send({
                success: false,
                message: "Error in insert query"
            });
        }

        // Invalidate banner cache
        await clearBannerCache();

        return res.status(201).send({
            success: true,
            message: "Banner added successfully",
            data: {
                id: data.insertId,
                image,
                redirect_url
            }
        });
    } catch (err) {
        console.error("Error adding banner:", err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
            error: err.message
        });
    }
};

// Update a Banner
exports.update = async (req, res) => {
    const id = req.params.id || req.body?.id || req.query?.id;
    const image = req.file ? req.file.location : req.body?.image;
    const redirect_url = req.body?.redirect_url || req.body?.redirectUrl || req.body?.url;

    if (!id) {
        return res.status(400).send({
            success: false,
            message: "ID is required"
        });
    }

    try {
        let result;
        if (image) {
            [result] = await db.query(
                `UPDATE banner SET image = ?, redirect_url = COALESCE(?, redirect_url) WHERE id = ?`,
                [image, redirect_url !== undefined ? redirect_url : null, id]
            );
        } else {
            [result] = await db.query(
                `UPDATE banner SET redirect_url = COALESCE(?, redirect_url) WHERE id = ?`,
                [redirect_url !== undefined ? redirect_url : null, id]
            );
        }

        if (!result || result.affectedRows === 0) {
            return res.status(404).send({
                success: false,
                message: "Banner not found"
            });
        }

        // Invalidate banner cache
        await clearBannerCache();

        return res.status(200).send({
            success: true,
            message: "Banner updated successfully"
        });
    } catch (err) {
        console.error("Error updating banner:", err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
            error: err.message
        });
    }
};

// Get All Banners (Cached with sorting newest first)
exports.getAll = async (req, res) => {
    const cacheKey = "banner:all";
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

        const [data] = await db.query(`SELECT * FROM banner ORDER BY id DESC`);
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
        console.error("Error fetching banners:", err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
            error: err.message
        });
    }
};

// Get Single Banner by ID
exports.getById = async (req, res) => {
    const id = req.params.id || req.query?.id;
    if (!id) {
        return res.status(400).send({
            success: false,
            message: "Banner ID is required"
        });
    }
    try {
        const [data] = await db.query(`SELECT * FROM banner WHERE id = ?`, [id]);
        if (!data || data.length === 0) {
            return res.status(404).send({
                success: false,
                message: "Banner not found"
            });
        }
        return res.status(200).send({
            success: true,
            data: data[0]
        });
    } catch (err) {
        console.error("Error fetching banner by id:", err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};

// Delete a Banner
exports.delete = async (req, res) => {
    const id = req.params.id || req.body?.id || req.query?.id;
    if (!id) {
        return res.status(400).send({
            success: false,
            message: "ID is required"
        });
    }
    try {
        const [result] = await db.query(`DELETE FROM banner WHERE id = ?`, [id]);
        if (!result || result.affectedRows === 0) {
            return res.status(404).send({
                success: false,
                message: "Banner not found"
            });
        }

        // Invalidate banner cache
        await clearBannerCache();

        return res.status(200).send({
            success: true,
            message: "Banner deleted successfully"
        });
    } catch (err) {
        console.error("Error deleting banner:", err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
            error: err.message
        });
    }
};



