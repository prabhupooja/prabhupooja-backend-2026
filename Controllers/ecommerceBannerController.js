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

// Formatter to standardize dynamic banner responses
const formatBanner = (row) => {
    if (!row) return null;

    let parsedTheme = null;
    if (row.theme) {
        try {
            parsedTheme = typeof row.theme === 'string' ? JSON.parse(row.theme) : row.theme;
        } catch (e) {
            parsedTheme = null;
        }
    }
    if (!parsedTheme) {
        parsedTheme = {
            backgroundType: "gradient",
            primary: "#F7D58A",
            secondary: "#FFF7E5",
            accent: "#8B1A0E",
            text: "#5A210F"
        };
    }

    let parsedFeatures = [];
    if (row.features) {
        try {
            parsedFeatures = typeof row.features === 'string' ? JSON.parse(row.features) : row.features;
        } catch (e) {
            parsedFeatures = [];
        }
    }
    if (!Array.isArray(parsedFeatures)) {
        parsedFeatures = [];
    }

    const ctaLink = row.redirect_url || '/ecommerce';
    const ctaText = row.button_text || 'अभी खरीदें';

    return {
        id: row.id,
        _id: row.id,
        title: row.title || '',
        smallHeading: row.small_heading || '',
        small_heading: row.small_heading || '',
        subtitle: row.subtitle || '',
        image: row.image || '',
        imageUrl: row.image || '',
        backgroundImageUrl: row.background_image || null,
        background_image: row.background_image || null,
        offer: {
            title: row.offer_title || '',
            prefix: row.offer_prefix || '',
            value: row.offer_value || '',
            suffix: row.offer_suffix || ''
        },
        offerTitle: row.offer_title || '',
        offerPrefix: row.offer_prefix || '',
        offerValue: row.offer_value || '',
        offerSuffix: row.offer_suffix || '',
        theme: parsedTheme,
        features: parsedFeatures,
        cta: {
            text: ctaText,
            link: ctaLink
        },
        buttonText: ctaText,
        button_text: ctaText,
        buttonLink: ctaLink,
        redirect_url: row.redirect_url || '',
        badgeEnabled: row.badge_enabled !== 0,
        badge_enabled: row.badge_enabled !== 0,
        sortOrder: row.sort_order || 1,
        sort_order: row.sort_order || 1,
        status: row.status !== undefined ? row.status : 1,
        active: row.status === 1,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
};

// Create a Dynamic E-Commerce Banner
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
    const small_heading = req.body?.small_heading || req.body?.smallHeading || '';
    const subtitle = req.body?.subtitle || req.body?.description || '';
    const background_image = req.body?.background_image || req.body?.backgroundImageUrl || req.body?.backgroundImage || null;
    
    const offer_title = req.body?.offer_title || req.body?.offerTitle || req.body?.offer?.title || '';
    const offer_prefix = req.body?.offer_prefix || req.body?.offerPrefix || req.body?.offer?.prefix || '';
    const offer_value = req.body?.offer_value || req.body?.offerValue || req.body?.offer?.value || '';
    const offer_suffix = req.body?.offer_suffix || req.body?.offerSuffix || req.body?.offer?.suffix || '';
    
    const button_text = req.body?.button_text || req.body?.buttonText || req.body?.cta?.text || 'अभी खरीदें';
    const redirect_url = req.body?.redirect_url || req.body?.redirectUrl || req.body?.buttonLink || req.body?.cta?.link || req.body?.url || '';

    let theme = req.body?.theme;
    if (typeof theme === 'object' && theme !== null) {
        theme = JSON.stringify(theme);
    } else if (typeof theme !== 'string') {
        theme = JSON.stringify({
            backgroundType: "gradient",
            primary: "#F7D58A",
            secondary: "#FFF7E5",
            accent: "#8B1A0E",
            text: "#5A210F"
        });
    }

    let features = req.body?.features;
    if (Array.isArray(features)) {
        features = JSON.stringify(features);
    } else if (typeof features !== 'string') {
        features = JSON.stringify([]);
    }

    const badge_enabled = req.body?.badge_enabled !== undefined ? (req.body.badge_enabled === true || req.body.badge_enabled === 'true' || req.body.badge_enabled === 1 || req.body.badge_enabled === '1' ? 1 : 0) : 1;
    const sort_order = req.body?.sort_order !== undefined ? parseInt(req.body.sort_order, 10) : (req.body?.sortOrder !== undefined ? parseInt(req.body.sortOrder, 10) : 1);
    const status = req.body?.status !== undefined ? (parseInt(req.body.status, 10) === 0 ? 0 : 1) : 1;

    const finalTitle = title && String(title).trim() ? String(title).trim() : null;
    const finalImage = image && String(image).trim() ? String(image).trim() : '';
    const finalSmallHeading = small_heading && String(small_heading).trim() ? String(small_heading).trim() : null;
    const finalSubtitle = subtitle && String(subtitle).trim() ? String(subtitle).trim() : null;
    const finalBackgroundImage = background_image && String(background_image).trim() ? String(background_image).trim() : null;
    const finalOfferTitle = offer_title && String(offer_title).trim() ? String(offer_title).trim() : null;
    const finalOfferPrefix = offer_prefix && String(offer_prefix).trim() ? String(offer_prefix).trim() : null;
    const finalOfferValue = offer_value && String(offer_value).trim() ? String(offer_value).trim() : null;
    const finalOfferSuffix = offer_suffix && String(offer_suffix).trim() ? String(offer_suffix).trim() : null;
    const finalButtonText = button_text && String(button_text).trim() ? String(button_text).trim() : 'अभी खरीदें';
    const finalRedirectUrl = redirect_url && String(redirect_url).trim() ? String(redirect_url).trim() : null;

    if (!finalImage || finalImage === 'undefined' || finalImage === 'null') {
        return res.status(400).json({
            success: false,
            message: "Banner image is required. Please upload or select a banner image."
        });
    }

    try {
        const [data] = await db.query(
            `INSERT INTO ecommerce_banner (
                title, small_heading, subtitle, image, background_image,
                offer_title, offer_prefix, offer_value, offer_suffix,
                button_text, redirect_url, theme, features,
                badge_enabled, sort_order, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [
                finalTitle, finalSmallHeading, finalSubtitle, finalImage, finalBackgroundImage,
                finalOfferTitle, finalOfferPrefix, finalOfferValue, finalOfferSuffix,
                finalButtonText, finalRedirectUrl, theme, features,
                badge_enabled, isNaN(sort_order) ? 1 : sort_order, status
            ]
        );

        if (!data || !data.insertId) {
            return res.status(500).json({
                success: false,
                message: "Error inserting ecommerce banner"
            });
        }

        // Invalidate banner cache
        await clearEcommerceBannerCache();

        const createdBanner = formatBanner({
            id: data.insertId,
            title: finalTitle,
            small_heading: finalSmallHeading,
            subtitle: finalSubtitle,
            image: finalImage,
            background_image: finalBackgroundImage,
            offer_title: finalOfferTitle,
            offer_prefix: finalOfferPrefix,
            offer_value: finalOfferValue,
            offer_suffix: finalOfferSuffix,
            button_text: finalButtonText,
            redirect_url: finalRedirectUrl,
            theme,
            features,
            badge_enabled,
            sort_order: isNaN(sort_order) ? 1 : sort_order,
            status,
            created_at: new Date(),
            updated_at: new Date()
        });

        return res.status(201).json({
            success: true,
            message: "E-Commerce banner added successfully",
            data: createdBanner
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
    if (!id) {
        return res.status(400).json({
            success: false,
            message: "Banner ID is required"
        });
    }

    let parsedBody = req.body || {};
    if (typeof parsedBody.data === 'string') {
        try {
            const nested = JSON.parse(parsedBody.data);
            parsedBody = { ...nested, ...parsedBody };
        } catch (e) {}
    }

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

    if (!image && parsedBody) {
        image = parsedBody.image || parsedBody.imageUrl || parsedBody.image_url || parsedBody.banner || parsedBody.bannerImage || parsedBody.banner_image || parsedBody.img || parsedBody.file;
        if (typeof image === 'object' && image !== null) {
            image = image.url || image.location || image.path || image.src || image.uri || null;
        }
    }

    try {
        const updates = [];
        const values = [];

        if (image && String(image).trim() && image !== 'undefined' && image !== 'null') {
            updates.push("image = ?");
            values.push(String(image).trim());
        }
        if (parsedBody.title !== undefined || parsedBody.name !== undefined) {
            const t = parsedBody.title !== undefined ? parsedBody.title : parsedBody.name;
            updates.push("title = ?");
            values.push(t ? String(t).trim() : null);
        }
        if (parsedBody.small_heading !== undefined || parsedBody.smallHeading !== undefined) {
            const sh = parsedBody.small_heading !== undefined ? parsedBody.small_heading : parsedBody.smallHeading;
            updates.push("small_heading = ?");
            values.push(sh ? String(sh).trim() : null);
        }
        if (parsedBody.subtitle !== undefined || parsedBody.description !== undefined) {
            const sub = parsedBody.subtitle !== undefined ? parsedBody.subtitle : parsedBody.description;
            updates.push("subtitle = ?");
            values.push(sub ? String(sub).trim() : null);
        }
        if (parsedBody.background_image !== undefined || parsedBody.backgroundImageUrl !== undefined || parsedBody.backgroundImage !== undefined) {
            const bg = parsedBody.background_image !== undefined ? parsedBody.background_image : (parsedBody.backgroundImageUrl !== undefined ? parsedBody.backgroundImageUrl : parsedBody.backgroundImage);
            updates.push("background_image = ?");
            values.push(bg ? String(bg).trim() : null);
        }

        // Offer fields (supports offer object, offerTitle / offer_title, etc.)
        let offerObj = parsedBody.offer;
        if (typeof offerObj === 'string') {
            try { offerObj = JSON.parse(offerObj); } catch (e) { offerObj = null; }
        }

        if (parsedBody.offer_title !== undefined || parsedBody.offerTitle !== undefined || (offerObj && offerObj.title !== undefined)) {
            const ot = parsedBody.offer_title !== undefined ? parsedBody.offer_title : (parsedBody.offerTitle !== undefined ? parsedBody.offerTitle : offerObj?.title);
            updates.push("offer_title = ?");
            values.push(ot ? String(ot).trim() : null);
        }
        if (parsedBody.offer_prefix !== undefined || parsedBody.offerPrefix !== undefined || (offerObj && offerObj.prefix !== undefined)) {
            const op = parsedBody.offer_prefix !== undefined ? parsedBody.offer_prefix : (parsedBody.offerPrefix !== undefined ? parsedBody.offerPrefix : offerObj?.prefix);
            updates.push("offer_prefix = ?");
            values.push(op ? String(op).trim() : null);
        }
        if (parsedBody.offer_value !== undefined || parsedBody.offerValue !== undefined || (offerObj && offerObj.value !== undefined)) {
            const ov = parsedBody.offer_value !== undefined ? parsedBody.offer_value : (parsedBody.offerValue !== undefined ? parsedBody.offerValue : offerObj?.value);
            updates.push("offer_value = ?");
            values.push(ov ? String(ov).trim() : null);
        }
        if (parsedBody.offer_suffix !== undefined || parsedBody.offerSuffix !== undefined || (offerObj && offerObj.suffix !== undefined)) {
            const os = parsedBody.offer_suffix !== undefined ? parsedBody.offer_suffix : (parsedBody.offerSuffix !== undefined ? parsedBody.offerSuffix : offerObj?.suffix);
            updates.push("offer_suffix = ?");
            values.push(os ? String(os).trim() : null);
        }

        // CTA fields (button_text, redirect_url)
        let ctaObj = parsedBody.cta;
        if (typeof ctaObj === 'string') {
            try { ctaObj = JSON.parse(ctaObj); } catch (e) { ctaObj = null; }
        }

        if (parsedBody.button_text !== undefined || parsedBody.buttonText !== undefined || (ctaObj && ctaObj.text !== undefined)) {
            const bt = parsedBody.button_text !== undefined ? parsedBody.button_text : (parsedBody.buttonText !== undefined ? parsedBody.buttonText : ctaObj?.text);
            updates.push("button_text = ?");
            values.push(bt ? String(bt).trim() : 'अभी खरीदें');
        }
        if (parsedBody.redirect_url !== undefined || parsedBody.redirectUrl !== undefined || parsedBody.buttonLink !== undefined || parsedBody.url !== undefined || (ctaObj && ctaObj.link !== undefined)) {
            const ru = parsedBody.redirect_url !== undefined ? parsedBody.redirect_url : (parsedBody.redirectUrl !== undefined ? parsedBody.redirectUrl : (parsedBody.buttonLink !== undefined ? parsedBody.buttonLink : (parsedBody.url !== undefined ? parsedBody.url : ctaObj?.link)));
            updates.push("redirect_url = ?");
            values.push(ru ? String(ru).trim() : null);
        }

        // Theme
        if (parsedBody.theme !== undefined) {
            let th = parsedBody.theme;
            if (typeof th === 'object' && th !== null) {
                th = JSON.stringify(th);
            }
            updates.push("theme = ?");
            values.push(typeof th === 'string' ? th : JSON.stringify(th));
        }

        // Features
        if (parsedBody.features !== undefined) {
            let ft = parsedBody.features;
            if (typeof ft === 'string') {
                try {
                    const parsed = JSON.parse(ft);
                    if (Array.isArray(parsed)) ft = parsed;
                } catch (e) {}
            }
            const finalFt = Array.isArray(ft) ? JSON.stringify(ft) : (typeof ft === 'string' ? ft : JSON.stringify([]));
            updates.push("features = ?");
            values.push(finalFt);
        }

        // Badge, sort_order, status
        if (parsedBody.badge_enabled !== undefined || parsedBody.badgeEnabled !== undefined) {
            const be = parsedBody.badge_enabled !== undefined ? parsedBody.badge_enabled : parsedBody.badgeEnabled;
            updates.push("badge_enabled = ?");
            values.push(be === true || be === 'true' || be === 1 || be === '1' ? 1 : 0);
        }
        if (parsedBody.sort_order !== undefined || parsedBody.sortOrder !== undefined) {
            const so = parsedBody.sort_order !== undefined ? parsedBody.sort_order : parsedBody.sortOrder;
            updates.push("sort_order = ?");
            values.push(parseInt(so, 10) || 1);
        }
        if (parsedBody.status !== undefined) {
            updates.push("status = ?");
            values.push(parseInt(parsedBody.status, 10) === 0 ? 0 : 1);
        }

        if (updates.length === 0) {
            return res.status(400).json({
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
            return res.status(404).json({
                success: false,
                message: "E-Commerce banner not found"
            });
        }

        // Invalidate banner cache
        await clearEcommerceBannerCache();

        // Fetch updated banner
        const [rows] = await db.query(`SELECT * FROM ecommerce_banner WHERE id = ?`, [id]);
        const updatedBanner = rows && rows.length > 0 ? formatBanner(rows[0]) : null;

        return res.status(200).json({
            success: true,
            message: "E-Commerce banner updated successfully",
            data: updatedBanner
        });
    } catch (err) {
        console.error("Error updating ecommerce banner:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error",
            error: err.message
        });
    }
};

// Get All E-Commerce Banners (Cached, sorted by sort_order & id DESC)
exports.getAll = async (req, res) => {
    const includeAll = req.query.all === "true" || req.query.includeAll === "true";
    const cacheKey = includeAll ? "ecommerce_banner:all_admin" : "ecommerce_banner:all";

    try {
        const cachedData = await getCache(cacheKey);
        if (cachedData && Array.isArray(cachedData)) {
            res.setHeader("X-Cache", "HIT");
            return res.status(200).json({
                success: true,
                count: cachedData.length,
                data: cachedData,
                banners: cachedData
            });
        }

        const query = includeAll 
            ? `SELECT * FROM ecommerce_banner ORDER BY sort_order ASC, id DESC`
            : `SELECT * FROM ecommerce_banner WHERE status = 1 ORDER BY sort_order ASC, id DESC`;

        const [data] = await db.query(query);
        const bannerList = (data || []).map(formatBanner);

        await setCache(cacheKey, bannerList, 180); // 3 mins cache
        res.setHeader("X-Cache", "MISS");

        return res.status(200).json({
            success: true,
            count: bannerList.length,
            data: bannerList,
            banners: bannerList
        });
    } catch (err) {
        console.error("Error fetching ecommerce banners:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error",
            error: err.message
        });
    }
};

// Get Single E-Commerce Banner by ID
exports.getById = async (req, res) => {
    const id = req.params.id || req.query?.id;
    if (!id) {
        return res.status(400).json({
            success: false,
            message: "Banner ID is required"
        });
    }
    try {
        const [data] = await db.query(`SELECT * FROM ecommerce_banner WHERE id = ?`, [id]);
        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "E-Commerce banner not found"
            });
        }
        return res.status(200).json({
            success: true,
            data: formatBanner(data[0])
        });
    } catch (err) {
        console.error("Error fetching ecommerce banner by id:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
};

// Delete an E-Commerce Banner
exports.delete = async (req, res) => {
    const id = req.params.id || req.body?.id || req.query?.id;
    if (!id) {
        return res.status(400).json({
            success: false,
            message: "ID is required"
        });
    }
    try {
        const [result] = await db.query(`DELETE FROM ecommerce_banner WHERE id = ?`, [id]);
        if (!result || result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "E-Commerce banner not found"
            });
        }

        // Invalidate banner cache
        await clearEcommerceBannerCache();

        return res.status(200).json({
            success: true,
            message: "E-Commerce banner deleted successfully"
        });
    } catch (err) {
        console.error("Error deleting ecommerce banner:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error",
            error: err.message
        });
    }
};

