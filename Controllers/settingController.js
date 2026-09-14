const db = require('../config/db');
const { deleteCache } = require("../config/redis");

/**
 * Fetch current delivery charge configuration
 * (Universal delivery charge, Free delivery threshold, Status)
 */
exports.getDeliveryChargeSetting = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT setting_key, setting_value, description FROM app_settings 
             WHERE setting_key IN ('universal_delivery_charge', 'free_delivery_above', 'delivery_charge_active')`
        );

        const settingsMap = {};
        (rows || []).forEach((row) => {
            settingsMap[row.setting_key] = row.setting_value;
        });

        const universalDeliveryCharge = parseFloat(settingsMap['universal_delivery_charge'] !== undefined ? settingsMap['universal_delivery_charge'] : 40.00) || 0.00;
        const freeDeliveryAbove = parseFloat(settingsMap['free_delivery_above'] !== undefined ? settingsMap['free_delivery_above'] : 999.00) || 0.00;
        const deliveryChargeActive = settingsMap['delivery_charge_active'] !== undefined ? (settingsMap['delivery_charge_active'] === '1' || settingsMap['delivery_charge_active'] === 'true') : true;

        return res.status(200).json({
            success: true,
            data: {
                universal_delivery_charge: universalDeliveryCharge,
                free_delivery_above: freeDeliveryAbove,
                delivery_charge_active: deliveryChargeActive,
                settings: settingsMap,
            },
        });
    } catch (error) {
        console.error("Error fetching delivery charge settings:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

/**
 * Update delivery charge configuration (Admin Only)
 */
exports.updateDeliveryChargeSetting = async (req, res) => {
    const { universal_delivery_charge, free_delivery_above, delivery_charge_active } = req.body;

    try {
        const queries = [];

        if (universal_delivery_charge !== undefined) {
            const val = parseFloat(universal_delivery_charge);
            queries.push(
                db.query(
                    `INSERT INTO app_settings (setting_key, setting_value, description)
                     VALUES ('universal_delivery_charge', ?, 'Universal fallback delivery charge in rupees')
                     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
                    [isNaN(val) ? '0.00' : val.toFixed(2)]
                )
            );
        }

        if (free_delivery_above !== undefined) {
            const val = parseFloat(free_delivery_above);
            queries.push(
                db.query(
                    `INSERT INTO app_settings (setting_key, setting_value, description)
                     VALUES ('free_delivery_above', ?, 'Order amount above which delivery is free (0 to disable)')
                     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
                    [isNaN(val) ? '0.00' : val.toFixed(2)]
                )
            );
        }

        if (delivery_charge_active !== undefined) {
            const activeVal = (delivery_charge_active === true || delivery_charge_active === '1' || delivery_charge_active === 1 || delivery_charge_active === 'true') ? '1' : '0';
            queries.push(
                db.query(
                    `INSERT INTO app_settings (setting_key, setting_value, description)
                     VALUES ('delivery_charge_active', ?, '1 to enable delivery charges, 0 to disable')
                     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
                    [activeVal]
                )
            );
        }

        if (queries.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No setting parameters provided for update",
            });
        }

        await Promise.all(queries);

        try {
            await deleteCache("app_settings:*");
        } catch (cErr) {}

        return res.status(200).json({
            success: true,
            message: "Delivery charge settings updated successfully",
            updated: {
                universal_delivery_charge,
                free_delivery_above,
                delivery_charge_active,
            },
        });
    } catch (error) {
        console.error("Error updating delivery charge settings:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

/**
 * Get all system settings (Admin)
 */
exports.getAllSettings = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM app_settings ORDER BY setting_key ASC");
        return res.status(200).json({
            success: true,
            data: rows || [],
        });
    } catch (error) {
        console.error("Error getting all settings:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
