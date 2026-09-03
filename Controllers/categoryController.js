const db = require('../config/db');
const { getCache, setCache, deleteCache } = require("../config/redis");

exports.create = async (req, res) => {
    const { name } = req.body;
    const image = req.file ? req.file.location  : null;

    try {
        const [result] = await db.query(
            `INSERT INTO category (name, image) VALUES (?, ?)`,
            [name, image]
        );

        if (result.affectedRows === 0) {
            return res.status(400).send({
                success: false,
                message: "Failed to add category"
            });
        }

        // Invalidate category cache
        await deleteCache("category:*");

        return res.status(201).send({
            success: true,
            message: "Category added successfully",
            categoryId: result.insertId, // Returning inserted ID
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
    const cacheKey = "category:all";
    try {
        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            res.setHeader("X-Cache", "HIT");
            return res.status(200).send({
                success: true,
                data: cachedData
            });
        }

        const [data] = await db.query(`SELECT * FROM category`);
        if (!data.length) {
            return res.status(404).send({
                success: false,
                message: "No categories found"
            });
        }

        await setCache(cacheKey, data, 1800); // 30 mins
        res.setHeader("X-Cache", "MISS");

        return res.status(200).send({
            success: true,
            data
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};


exports.getById = async (req, res) => {
    const { id } = req.params;
    const cacheKey = `category:item:${id}`;

    try {
        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            res.setHeader("X-Cache", "HIT");
            return res.status(200).send({
                success: true,
                data: cachedData 
            });
        }

        const [data] = await db.query(`SELECT * FROM category WHERE id = ?`, [id]);
        if (!data.length) {
            return res.status(404).send({
                success: false,
                message: "Category not found"
            });
        }

        await setCache(cacheKey, data[0], 1800);
        res.setHeader("X-Cache", "MISS");

        return res.status(200).send({
            success: true,
            data: data[0] 
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const image = req.file ? req.file.location || req.file.path : null;

    try {
        // Check if category exists
        const [existing] = await db.query(`SELECT * FROM category WHERE id = ?`, [id]);
        if (!existing.length) {
            return res.status(404).send({
                success: false,
                message: "Category not found"
            });
        }

        // Prepare the fields to update, applying COALESCE to only update provided fields
        const updateFields = [];
        const updateValues = [];

        if (name) {
            updateFields.push("name = ?");
            updateValues.push(name);
        }

        if (image) {
            updateFields.push("image = ?");
            updateValues.push(image);
        }

        // If no fields were provided to update
        if (updateFields.length === 0) {
            return res.status(400).send({
                success: false,
                message: "No valid fields to update"
            });
        }

        // Add the ID as the last parameter for the WHERE clause
        const query = `UPDATE category SET ${updateFields.join(', ')} WHERE id = ?`;

        // Add the id to the updateValues array at the end (for WHERE clause)
        updateValues.push(id);

        // Update category
        const [result] = await db.query(query, updateValues);

        if (result.affectedRows === 0) {
            return res.status(400).send({
                success: false,
                message: "Failed to update category"
            });
        }

        // Invalidate category cache
        await deleteCache("category:*");

        return res.status(200).send({
            success: true,
            message: "Category updated successfully"
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};


exports.delete = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query(`DELETE FROM category WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).send({
                success: false,
                message: "Category not found"
            });
        }

        // Invalidate category cache
        await deleteCache("category:*");

        return res.status(200).send({
            success: true,
            message: "Category deleted successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};