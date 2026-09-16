const db = require("../config/db");
const { sendNotification } = require("./notificationController");

// Helper: Slugify product name for SEO URL Slug
const slugify = (text) => {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// Helper: Safe JSON / list parser
const parseJsonOrList = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {}
    }
    if (trimmed.includes("\n")) {
      return trimmed
        .split("\n")
        .map((s) => s.replace(/^[-*•+]\s*|^\d+[\.)]\s+/, "").trim())
        .filter(Boolean);
    }
    if (trimmed.includes(",")) {
      return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [trimmed];
  }
  return [String(val)];
};

// Standard Product Formatter for consistent API output across App, Web & Admin
const formatProductResponse = (p) => {
  if (!p) return null;

  let parsedImages = [];
  try {
    if (Array.isArray(p.image)) {
      parsedImages = p.image;
    } else if (typeof p.image === "string") {
      const trimmed = p.image.trim();
      if (trimmed.startsWith("[")) {
        parsedImages = JSON.parse(trimmed);
      } else if (trimmed.includes(",")) {
        parsedImages = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
      } else if (trimmed) {
        parsedImages = [trimmed];
      }
    }
  } catch (e) {
    parsedImages = p.image ? [p.image] : [];
  }

  const mrp = parseFloat(p.price || 0);
  const offer = parseFloat(p.offerPrice !== null && p.offerPrice !== undefined ? p.offerPrice : p.price || 0);
  const autoDiscount = mrp > 0 && offer < mrp ? Math.round(((mrp - offer) / mrp) * 100) : 0;
  const discountPercent = p.discount_percent !== null && p.discount_percent !== undefined ? parseFloat(p.discount_percent) : autoDiscount;
  const rawStock = p.stock !== null && p.stock !== undefined ? Number(p.stock) : null;
  const rawNoOfItems = p.noOfItems !== null && p.noOfItems !== undefined ? Number(p.noOfItems) : null;
  let stockQty = 0;
  if (rawStock !== null && rawStock > 0) {
    stockQty = rawStock;
  } else if (rawNoOfItems !== null && rawNoOfItems > 0) {
    stockQty = rawNoOfItems;
  } else if (rawStock !== null) {
    stockQty = rawStock;
  } else if (rawNoOfItems !== null) {
    stockQty = rawNoOfItems;
  }

  const lowStockLimit = p.low_stock_threshold !== null && p.low_stock_threshold !== undefined ? Number(p.low_stock_threshold) : 5;
  let stockStatus = p.stock_status || "In Stock";
  if (stockQty <= 0 && stockStatus !== "Pre-Order") {
    stockStatus = "Out of Stock";
  } else if (stockQty > 0 && stockQty <= lowStockLimit && (stockStatus === "In Stock" || !stockStatus)) {
    stockStatus = "Low Stock";
  } else if (stockQty > lowStockLimit && (stockStatus === "Out of Stock" || !stockStatus)) {
    stockStatus = "In Stock";
  }

  const highlightsList = parseJsonOrList(p.ProductHighlights);
  const packageIncludesList = parseJsonOrList(p.package_includes);
  const tagsList = parseJsonOrList(p.tags || p.search_keywords);

  return {
    ...p,
    // 1. Media
    image: parsedImages,
    images: parsedImages,
    coverImage: parsedImages[0] || null,
    thumbnail: parsedImages[0] || null,

    // 2. Pricing & Stock
    price: mrp,
    mrpPrice: mrp,
    offerPrice: offer,
    sellingPrice: offer,
    discountPercentage: discountPercent,
    discount_percent: discountPercent,
    stock: stockQty,
    stockQuantity: stockQty,
    stock_status: stockStatus,
    stockStatus: stockStatus,
    inStock: !stockStatus.toLowerCase().includes("out") && stockQty > 0,
    lowStockThreshold: p.low_stock_threshold || 5,
    sku: p.ProductCode || `PP-${p.id}`,
    ProductCode: p.ProductCode || `PP-${p.id}`,
    tax_type: p.tax_type || "Tax Inclusive",
    gst_percentage: parseFloat(p.gst_percentage || 0),

    // 3. Category & Taxonomy
    productType: p.productType || "Puja Samagri",
    product_type: p.productType || "Puja Samagri",
    category: p.category || p.theme || "Puja Essentials",
    theme: p.theme || p.category || "Puja Essentials",
    subcategory: p.subcategory || null,
    brand: p.brand || "PrabhuPooja",
    tags: tagsList,
    tagsList: tagsList,
    occasion: p.occasion || null,
    suitable_for: p.suitable_for || null,
    country_of_origin: p.country_of_origin || "India",

    // 4. Content & Inclusions
    short_description: p.short_description || null,
    description: p.description || "",
    highlights: highlightsList,
    highlightsList: highlightsList,
    ProductHighlights: p.ProductHighlights || "",
    package_includes: p.package_includes || "",
    packageIncludes: packageIncludesList,
    packageIncludesList: packageIncludesList,
    Benefits: p.Benefits || null,
    benefits: p.Benefits || null,
    UsageAndCareInstructions: p.UsageAndCareInstructions || null,
    careInstructions: p.UsageAndCareInstructions || null,
    disclaimer: p.disclaimer || "This product is intended for spiritual, cultural, and decorative purposes.",

    // 5. Dynamic Specifications
    specifications: {
      material: p.material || null,
      colour: p.colour || null,
      color: p.colour || null,
      style: p.style || null,
      size_fit: p.size_fit || null,
      height: p.Height || null,
      Height: p.Height || null,
      width: p.width || null,
      depth: p.depth || null,
      length: p.length || null,
      dimension: p.Dimension || null,
      Dimension: p.Dimension || null,
      weight: p.Weight || null,
      Weight: p.Weight || null,
      specification_unit: p.specification_unit || "cm",
      specialFeature: p.specialFeature || null,
      occasion: p.occasion || null,
      suitable_for: p.suitable_for || null,
      country_of_origin: p.country_of_origin || "India",
    },

    // 6. Shipping & Return Policies
    delivery_charge: p.delivery_charge !== null && p.delivery_charge !== undefined && p.delivery_charge !== "" ? parseFloat(p.delivery_charge) : null,
    deliveryCharge: p.delivery_charge !== null && p.delivery_charge !== undefined && p.delivery_charge !== "" ? parseFloat(p.delivery_charge) : null,
    shipping_class: p.shipping_class || "Standard",
    estimated_delivery_days: p.estimated_delivery_days || "3 - 5 Business Days",
    dispatch_time: p.dispatch_time || "Dispatched within 24 Hours",
    return_available: p.return_available !== undefined && p.return_available !== null ? Boolean(p.return_available) : true,
    replacement_available: p.replacement_available !== undefined && p.replacement_available !== null ? Boolean(p.replacement_available) : true,
    replacement_period: p.replacement_period || 7,

    // 7. SEO
    seo_title: p.seo_title || p.productName,
    seo_description: p.seo_description || p.short_description || "",
    url_slug: p.url_slug || slugify(p.productName),
    search_keywords: p.search_keywords || p.tags || "",

    // 8. Badges & Ratings
    is_featured: Boolean(p.is_featured),
    is_bestseller: Boolean(p.is_bestseller),
    rating: parseFloat(p.average_rating || p.rating || 5.0),
    averageRating: parseFloat(p.average_rating || p.rating || 5.0),
    average_rating: parseFloat(p.average_rating || p.rating || 5.0),
    totalReviews: parseInt(p.total_reviews || 0, 10),
    total_reviews: parseInt(p.total_reviews || 0, 10),
  };
};

exports.create = async (req, res) => {
  let {
    productId,
    id,
    productName,
    name,
    title,
    productType,
    product_type,
    category,
    theme,
    subcategory,
    subCategory,
    brand,
    colour,
    color,
    style,
    material,
    specialFeature,
    special_feature,
    stock,
    stock_quantity,
    stockQuantity,
    stock_status,
    stockStatus,
    low_stock_threshold,
    lowStockThreshold,
    noOfItems,
    noOfPieces,
    price,
    mrp,
    mrpPrice,
    mrp_price,
    offerPrice,
    offer_price,
    sellingPrice,
    discount_percent,
    discountPercent,
    discountPercentage,
    delivery_charge,
    deliveryCharge,
    tax_type,
    taxType,
    gst_percentage,
    gst,
    size_fit,
    sizeFit,
    size,
    length,
    Height,
    height,
    width,
    depth,
    Dimension,
    dimension,
    Weight,
    weight,
    specification_unit,
    specificationUnit,
    unit,
    short_description,
    shortDescription,
    description,
    fullDescription,
    ProductHighlights,
    highlights,
    package_includes,
    packageIncludes,
    inTheBox,
    whatsIncluded,
    Benefits,
    benefits,
    UsageAndCareInstructions,
    careInstructions,
    usageInstructions,
    disclaimer,
    shipping_class,
    shippingClass,
    estimated_delivery_days,
    estimatedDeliveryDays,
    dispatch_time,
    dispatchTime,
    return_available,
    returnAvailable,
    replacement_available,
    replacementAvailable,
    replacement_period,
    replacementPeriod,
    seo_title,
    seoTitle,
    seo_description,
    seoDescription,
    url_slug,
    urlSlug,
    search_keywords,
    searchKeywords,
    tags,
    product_tags,
    is_featured,
    isFeatured,
    is_bestseller,
    isBestseller,
    publish_date,
    unpublish_date,
    occasion,
    suitable_for,
    suitableFor,
    country_of_origin,
    countryOfOrigin,
    ProductCode,
    productCode,
    sku,
    SKU,
    merchantId,
    verified,
  } = req.body;

  const targetId = productId || id;
  const finalName = productName || name || title;
  const finalType = productType || product_type || "Puja Samagri";
  const finalCategory = category || theme || "Puja Essentials";
  const finalSubcategory = subcategory || subCategory || null;
  const finalBrand = brand || "PrabhuPooja";
  const finalColour = colour || color || "Multicolor";
  const finalStyle = style || "Traditional";
  const finalMaterial = material || "Standard";
  const finalSpecialFeature = specialFeature || special_feature || null;

  const finalPrice = parseFloat(price || mrp || mrpPrice || mrp_price || 0);
  const finalOfferPrice = parseFloat(offerPrice || offer_price || sellingPrice || finalPrice || 0);

  const calcDiscount =
    finalPrice > 0 && finalOfferPrice < finalPrice
      ? Math.round(((finalPrice - finalOfferPrice) / finalPrice) * 100)
      : 0;
  const finalDiscountPercent = parseFloat(
    discount_percent !== undefined
      ? discount_percent
      : discountPercent !== undefined
      ? discountPercent
      : discountPercentage !== undefined
      ? discountPercentage
      : calcDiscount
  );

  const rawStock = stock !== undefined ? stock : stock_quantity !== undefined ? stock_quantity : stockQuantity !== undefined ? stockQuantity : noOfItems !== undefined ? noOfItems : noOfPieces !== undefined ? noOfPieces : 10;
  const finalStock = parseInt(rawStock, 10) || 0;
  const finalStockStatus = stock_status || stockStatus || (finalStock > 0 ? "In Stock" : "Out of Stock");
  const finalLowStock = parseInt(low_stock_threshold || lowStockThreshold || 5, 10);

  const finalSku = ProductCode || productCode || sku || SKU || `PP-${Date.now().toString(36).toUpperCase()}`;

  const rawDelivery = delivery_charge !== undefined ? delivery_charge : deliveryCharge;
  const parsedDeliveryCharge =
    rawDelivery !== undefined && rawDelivery !== null && rawDelivery !== ""
      ? parseFloat(rawDelivery)
      : null;

  const finalTaxType = tax_type || taxType || "Tax Inclusive";
  const finalGst = parseFloat(gst_percentage || gst || 0);

  const finalSizeFrt = size_fit || sizeFit || size || null;
  const finalLength = length || null;
  const finalHeight = Height || height || null;
  const finalWidth = width || null;
  const finalDepth = depth || null;
  const finalDimension = Dimension || dimension || null;
  const finalWeight = Weight || weight || null;
  const finalUnit = specification_unit || specificationUnit || unit || "cm";

  const finalShortDesc = short_description || shortDescription || null;
  const finalDesc = description || fullDescription || "";

  // Convert highlights / inclusions to formatted string if passed as array
  const formatListString = (val) => {
    if (!val) return null;
    if (Array.isArray(val)) return val.join("\n");
    return typeof val === "string" ? val : JSON.stringify(val);
  };

  const finalHighlights = formatListString(ProductHighlights || highlights);
  const finalPackageIncludes = formatListString(package_includes || packageIncludes || inTheBox || whatsIncluded);
  const finalBenefits = Benefits || benefits || null;
  const finalCare = UsageAndCareInstructions || careInstructions || usageInstructions || null;
  const finalDisclaimer =
    disclaimer ||
    "This product is intended for spiritual, cultural, and decorative purposes. Traditional benefits are based on customary beliefs.";

  const finalShippingClass = shipping_class || shippingClass || "Standard";
  const finalEstDelivery = estimated_delivery_days || estimatedDeliveryDays || "3 - 5 Business Days";
  const finalDispatchTime = dispatch_time || dispatchTime || "Dispatched within 24 Hours";
  const finalReturnAvailable = return_available !== undefined ? (return_available === true || return_available === "true" || return_available === 1 ? 1 : 0) : returnAvailable !== undefined ? (returnAvailable === true || returnAvailable === "true" || returnAvailable === 1 ? 1 : 0) : 1;
  const finalReplacementAvailable = replacement_available !== undefined ? (replacement_available === true || replacement_available === "true" || replacement_available === 1 ? 1 : 0) : replacementAvailable !== undefined ? (replacementAvailable === true || replacementAvailable === "true" || replacementAvailable === 1 ? 1 : 0) : 1;
  const finalReplacementPeriod = parseInt(replacement_period || replacementPeriod || 7, 10);

  const finalSeoTitle = seo_title || seoTitle || finalName;
  const finalSeoDesc = seo_description || seoDescription || finalShortDesc || "";
  const finalSlug = url_slug || urlSlug || slugify(finalName);
  const finalKeywords = search_keywords || searchKeywords || tags || product_tags || null;
  const finalTags = tags || product_tags || finalKeywords || null;

  const finalFeatured = is_featured !== undefined ? (is_featured === true || is_featured === "true" || is_featured === 1 ? 1 : 0) : isFeatured !== undefined ? (isFeatured === true || isFeatured === "true" || isFeatured === 1 ? 1 : 0) : 0;
  const finalBestseller = is_bestseller !== undefined ? (is_bestseller === true || is_bestseller === "true" || is_bestseller === 1 ? 1 : 0) : isBestseller !== undefined ? (isBestseller === true || isBestseller === "true" || isBestseller === 1 ? 1 : 0) : 0;

  const finalOccasion = occasion || null;
  const finalSuitableFor = suitable_for || suitableFor || null;
  const finalCountry = country_of_origin || countryOfOrigin || "India";

  merchantId = merchantId || (req.user && req.user.id) || 1;
  const isVerified = verified !== undefined && verified !== null ? Number(verified) : 1;

  const images = req.files ? req.files.map((file) => file.location || file.path || file.filename) : req.file ? [req.file.location || req.file.path || req.file.filename] : [];

  try {
    if (!finalName || (!finalPrice && finalPrice !== 0)) {
      return res.status(400).json({
        success: false,
        message: "Product Name and Price are required.",
      });
    }

    // If targetId is provided, update existing product
    if (targetId) {
      const [result] = await db.query("SELECT image FROM products WHERE id = ?", [targetId]);

      if (!result || result.length === 0) {
        return res.status(404).json({ success: false, message: "Product not found." });
      }

      let existingImages = [];
      if (result[0].image) {
        try {
          existingImages = typeof result[0].image === "string" ? JSON.parse(result[0].image) : result[0].image;
          if (!Array.isArray(existingImages)) existingImages = [existingImages];
        } catch (e) {
          existingImages = [result[0].image];
        }
      }

      const updatedImages = (images.length > 0 ? [...existingImages, ...images] : existingImages).slice(0, 15);

      await db.query(
        `UPDATE products SET 
          productName = ?, theme = ?, category = ?, subcategory = ?, brand = ?, colour = ?, 
          style = ?, material = ?, specialFeature = ?, noOfItems = ?, stock = ?, stock_status = ?,
          low_stock_threshold = ?, price = ?, offerPrice = ?, discount_percent = ?, delivery_charge = ?,
          tax_type = ?, gst_percentage = ?, size_fit = ?, length = ?, Height = ?, width = ?, depth = ?,
          Dimension = ?, Weight = ?, specification_unit = ?, short_description = ?, description = ?,
          ProductHighlights = ?, package_includes = ?, Benefits = ?, UsageAndCareInstructions = ?,
          disclaimer = ?, shipping_class = ?, estimated_delivery_days = ?, dispatch_time = ?,
          return_available = ?, replacement_available = ?, replacement_period = ?, seo_title = ?,
          seo_description = ?, url_slug = ?, search_keywords = ?, tags = ?, is_featured = ?,
          is_bestseller = ?, occasion = ?, suitable_for = ?, country_of_origin = ?,
          ProductCode = ?, image = ?, merchantId = ?, verified = COALESCE(?, verified, 1)
         WHERE id = ?`,
        [
          finalName,
          finalCategory,
          finalCategory,
          finalSubcategory,
          finalBrand,
          finalColour,
          finalStyle,
          finalMaterial,
          finalSpecialFeature,
          finalStock,
          finalStock,
          finalStockStatus,
          finalLowStock,
          finalPrice,
          finalOfferPrice,
          finalDiscountPercent,
          parsedDeliveryCharge,
          finalTaxType,
          finalGst,
          finalSizeFrt,
          finalLength,
          finalHeight,
          finalWidth,
          finalDepth,
          finalDimension,
          finalWeight,
          finalUnit,
          finalShortDesc,
          finalDesc,
          finalHighlights,
          finalPackageIncludes,
          finalBenefits,
          finalCare,
          finalDisclaimer,
          finalShippingClass,
          finalEstDelivery,
          finalDispatchTime,
          finalReturnAvailable,
          finalReplacementAvailable,
          finalReplacementPeriod,
          finalSeoTitle,
          finalSeoDesc,
          finalSlug,
          finalKeywords,
          finalTags,
          finalFeatured,
          finalBestseller,
          finalOccasion,
          finalSuitableFor,
          finalCountry,
          finalSku,
          JSON.stringify(updatedImages),
          merchantId,
          isVerified,
          targetId,
        ]
      );

      return res.status(200).json({
        success: true,
        message: "Product updated successfully",
        id: targetId,
        productId: targetId,
        images: updatedImages,
      });
    }

    // Create a new product
    const finalImages = images.slice(0, 15);
    const [create] = await db.query(
      `INSERT INTO products (
        productName, theme, category, subcategory, productType, brand, colour, style, material, 
        specialFeature, noOfItems, stock, stock_status, low_stock_threshold, price, offerPrice, 
        discount_percent, delivery_charge, tax_type, gst_percentage, size_fit, length, Height, 
        width, depth, Dimension, Weight, specification_unit, short_description, description, 
        ProductHighlights, package_includes, Benefits, UsageAndCareInstructions, disclaimer, 
        shipping_class, estimated_delivery_days, dispatch_time, return_available, replacement_available, 
        replacement_period, seo_title, seo_description, url_slug, search_keywords, tags, is_featured, 
        is_bestseller, occasion, suitable_for, country_of_origin, ProductCode, image, merchantId, 
        verified, isDeleted, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW()
      )`,
      [
        finalName,
        finalCategory,
        finalCategory,
        finalSubcategory,
        finalType,
        finalBrand,
        finalColour,
        finalStyle,
        finalMaterial,
        finalSpecialFeature,
        finalStock,
        finalStock,
        finalStockStatus,
        finalLowStock,
        finalPrice,
        finalOfferPrice,
        finalDiscountPercent,
        parsedDeliveryCharge,
        finalTaxType,
        finalGst,
        finalSizeFrt,
        finalLength,
        finalHeight,
        finalWidth,
        finalDepth,
        finalDimension,
        finalWeight,
        finalUnit,
        finalShortDesc,
        finalDesc,
        finalHighlights,
        finalPackageIncludes,
        finalBenefits,
        finalCare,
        finalDisclaimer,
        finalShippingClass,
        finalEstDelivery,
        finalDispatchTime,
        finalReturnAvailable,
        finalReplacementAvailable,
        finalReplacementPeriod,
        finalSeoTitle,
        finalSeoDesc,
        finalSlug,
        finalKeywords,
        finalTags,
        finalFeatured,
        finalBestseller,
        finalOccasion,
        finalSuitableFor,
        finalCountry,
        finalSku,
        JSON.stringify(finalImages),
        merchantId,
        isVerified,
      ]
    );

    const insertedId = create?.insertId;

    return res.status(201).json({
      success: true,
      message: "Product created & published successfully",
      id: insertedId,
      productId: insertedId,
      data: {
        id: insertedId,
        insertId: insertedId,
        images: finalImages,
        coverImage: finalImages[0] || null,
        sku: finalSku,
      },
    });
  } catch (error) {
    console.error("Error in product create/update:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const [data] = await db.query(
      `SELECT p.*,
              IFNULL(r.total_reviews, 0) AS total_reviews,
              IFNULL(r.average_rating, 5.0) AS average_rating
       FROM products p
       LEFT JOIN (
         SELECT productId, COUNT(*) AS total_reviews, AVG(rating) AS average_rating
         FROM product_review
         GROUP BY productId
       ) r ON p.id = r.productId
       WHERE p.isDeleted = 0 AND p.verified = 1
       ORDER BY p.created_at DESC`
    );

    if (!data || !data.length) {
      return res.status(200).send({
        success: true,
        message: "No products found",
        data: [],
      });
    }

    const formattedData = data.map(formatProductResponse);

    return res.status(200).send({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error("Product getAll Error:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const [data] = await db.query(
      `SELECT p.*,
              IFNULL(r.total_reviews, 0) AS total_reviews,
              IFNULL(r.average_rating, 5.0) AS average_rating
       FROM products p
       LEFT JOIN (
         SELECT productId, COUNT(*) AS total_reviews, AVG(rating) AS average_rating
         FROM product_review
         GROUP BY productId
       ) r ON p.id = r.productId
       ORDER BY p.created_at DESC`
    );

    if (!data || !data.length) {
      return res.status(200).send({
        success: true,
        message: "No products found",
        data: [],
      });
    }

    const formattedData = data.map(formatProductResponse);

    return res.status(200).send({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error("Product getAllProducts Error:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getAllProductsByfillter = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = "",
      category = "",
      theme = "",
      productType = "",
      product_type = "",
      occasion = "",
      material = "",
      minPrice,
      maxPrice,
      inStock,
      featured,
      bestseller,
      sort = "newest",
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let baseQuery = `
      SELECT p.*,
             IFNULL(r.total_reviews, 0) AS total_reviews,
             IFNULL(r.average_rating, 5.0) AS average_rating
      FROM products p
      LEFT JOIN (
        SELECT productId, COUNT(*) AS total_reviews, AVG(rating) AS average_rating
        FROM product_review
        GROUP BY productId
      ) r ON p.id = r.productId
      WHERE p.isDeleted = 0 AND p.verified = 1
    `;

    let countQuery = `SELECT COUNT(*) AS total FROM products p WHERE p.isDeleted = 0 AND p.verified = 1`;
    let queryParams = [];

    if (search) {
      const searchClause = ` AND (p.productName LIKE ? OR p.description LIKE ? OR p.theme LIKE ? OR p.category LIKE ? OR p.ProductHighlights LIKE ? OR p.tags LIKE ?)`;
      baseQuery += searchClause;
      countQuery += searchClause;
      const term = `%${search}%`;
      queryParams.push(term, term, term, term, term, term);
    }

    const catTerm = category || theme;
    if (catTerm) {
      baseQuery += ` AND (p.category LIKE ? OR p.theme LIKE ?)`;
      countQuery += ` AND (p.category LIKE ? OR p.theme LIKE ?)`;
      queryParams.push(`%${catTerm}%`, `%${catTerm}%`);
    }

    const typeTerm = productType || product_type;
    if (typeTerm) {
      baseQuery += ` AND p.productType LIKE ?`;
      countQuery += ` AND p.productType LIKE ?`;
      queryParams.push(`%${typeTerm}%`);
    }

    if (occasion) {
      baseQuery += ` AND p.occasion LIKE ?`;
      countQuery += ` AND p.occasion LIKE ?`;
      queryParams.push(`%${occasion}%`);
    }

    if (material) {
      baseQuery += ` AND (p.material LIKE ? OR p.colour LIKE ?)`;
      countQuery += ` AND (p.material LIKE ? OR p.colour LIKE ?)`;
      queryParams.push(`%${material}%`, `%${material}%`);
    }

    if (minPrice !== undefined && minPrice !== "") {
      baseQuery += ` AND p.offerPrice >= ?`;
      countQuery += ` AND p.offerPrice >= ?`;
      queryParams.push(parseFloat(minPrice));
    }

    if (maxPrice !== undefined && maxPrice !== "") {
      baseQuery += ` AND p.offerPrice <= ?`;
      countQuery += ` AND p.offerPrice <= ?`;
      queryParams.push(parseFloat(maxPrice));
    }

    if (inStock === "true" || inStock === "1" || inStock === true) {
      baseQuery += ` AND (p.stock > 0 OR p.noOfItems > 0 OR p.stock_status = 'In Stock')`;
      countQuery += ` AND (p.stock > 0 OR p.noOfItems > 0 OR p.stock_status = 'In Stock')`;
    }

    if (featured === "true" || featured === "1" || featured === true) {
      baseQuery += ` AND p.is_featured = 1`;
      countQuery += ` AND p.is_featured = 1`;
    }

    if (bestseller === "true" || bestseller === "1" || bestseller === true) {
      baseQuery += ` AND p.is_bestseller = 1`;
      countQuery += ` AND p.is_bestseller = 1`;
    }

    // Sorting
    let orderByClause = ` ORDER BY p.created_at DESC`;
    if (sort === "price_low") orderByClause = ` ORDER BY p.offerPrice ASC`;
    else if (sort === "price_high") orderByClause = ` ORDER BY p.offerPrice DESC`;
    else if (sort === "rating") orderByClause = ` ORDER BY average_rating DESC`;
    else if (sort === "popular" || sort === "bestseller") orderByClause = ` ORDER BY p.is_bestseller DESC, p.id DESC`;

    const paginationParams = [...queryParams, parseInt(limit, 10), offset];
    baseQuery += `${orderByClause} LIMIT ? OFFSET ?`;

    const bestSellerQuery = `
      SELECT p.*,
             IFNULL(r.total_reviews, 0) AS total_reviews,
             IFNULL(r.average_rating, 5.0) AS average_rating
      FROM products p
      LEFT JOIN (
        SELECT productId, COUNT(*) AS total_reviews, AVG(rating) AS average_rating
        FROM product_review
        GROUP BY productId
      ) r ON p.id = r.productId
      WHERE p.isDeleted = 0 AND p.verified = 1
      ORDER BY p.is_bestseller DESC, p.id DESC
      LIMIT 4
    `;

    const [dataRows, countRows, bestSellerRows] = await Promise.all([
      db.query(baseQuery, paginationParams),
      db.query(countQuery, queryParams),
      db.query(bestSellerQuery),
    ]);

    const productData = (dataRows[0] || []).map(formatProductResponse);
    const total = countRows[0]?.[0]?.total || 0;
    const bestSellerProducts = (bestSellerRows[0] || []).map(formatProductResponse);

    return res.status(200).send({
      success: true,
      productData,
      data: productData,
      bestSellerProducts,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
      },
    });
  } catch (error) {
    console.error("Product filter Error:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getById = async (req, res) => {
  const { id } = req.params;

  try {
    const [data] = await db.query(
      `SELECT p.*, 
              IFNULL(r.total_reviews, 0) AS total_reviews,
              IFNULL(r.average_rating, 5.0) AS average_rating
       FROM products p
       LEFT JOIN (
         SELECT productId, COUNT(*) AS total_reviews, AVG(rating) AS average_rating
         FROM product_review
         GROUP BY productId
       ) r ON p.id = r.productId
       WHERE p.id = ?`,
      [id]
    );

    if (!data || !data.length) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    const formattedProduct = formatProductResponse(data[0]);

    return res.status(200).send({
      success: true,
      data: formattedProduct,
      product: formattedProduct,
    });
  } catch (error) {
    console.error("Product getById Error:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const b = req.body;

  const uploadedImages = req.files
    ? req.files.map((file) => file.location || file.path || file.filename)
    : req.file
    ? [req.file.location || req.file.path || req.file.filename]
    : [];

  try {
    const [data] = await db.query(`SELECT * FROM products WHERE id = ?`, [id]);

    if (!data || !data.length) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }
    const currentProduct = data[0];
    let currentImages = [];

    try {
      if (typeof currentProduct.image === "string") {
        currentImages = JSON.parse(currentProduct.image || "[]");
      } else if (Array.isArray(currentProduct.image)) {
        currentImages = currentProduct.image;
      } else if (currentProduct.image) {
        currentImages = [currentProduct.image];
      }
      if (!Array.isArray(currentImages)) currentImages = [currentImages];
    } catch (err) {
      if (currentProduct.image && typeof currentProduct.image === "string" && currentProduct.image.includes(",")) {
        currentImages = currentProduct.image.split(",").map((s) => s.trim());
      } else if (currentProduct.image) {
        currentImages = [currentProduct.image];
      } else {
        currentImages = [];
      }
    }

    let updateFields = [];
    let values = [];

    const cleanScalar = (val) => {
      if (val === undefined) return undefined;
      if (Array.isArray(val)) {
        return val[val.length - 1];
      }
      return val;
    };

    const addField = (col, val) => {
      if (val !== undefined) {
        const finalVal = cleanScalar(val);
        updateFields.push(`${col} = ?`);
        values.push(finalVal);
      }
    };

    if (b.productName !== undefined || b.name !== undefined || b.title !== undefined) {
      addField("productName", b.productName || b.name || b.title);
    }
    if (b.productType !== undefined || b.product_type !== undefined) {
      addField("productType", b.productType || b.product_type);
    }
    if (b.category !== undefined || b.theme !== undefined) {
      const cat = b.category || b.theme;
      addField("category", cat);
      addField("theme", cat);
    }
    if (b.subcategory !== undefined || b.subCategory !== undefined) {
      addField("subcategory", b.subcategory || b.subCategory);
    }
    if (b.brand !== undefined) addField("brand", b.brand);
    if (b.colour !== undefined || b.color !== undefined) addField("colour", b.colour || b.color);
    if (b.style !== undefined) addField("style", b.style);
    if (b.material !== undefined) addField("material", b.material);
    if (b.specialFeature !== undefined || b.special_feature !== undefined) {
      addField("specialFeature", b.specialFeature || b.special_feature);
    }

    let parsedStock = undefined;
    if (b.stock !== undefined || b.stock_quantity !== undefined || b.noOfItems !== undefined || b.noOfPieces !== undefined) {
      const val = b.stock !== undefined ? b.stock : b.stock_quantity !== undefined ? b.stock_quantity : b.noOfItems !== undefined ? b.noOfItems : b.noOfPieces;
      parsedStock = val === "" || val === null ? 0 : parseInt(val, 10);
      if (isNaN(parsedStock)) parsedStock = 0;
    }

    let parsedStockStatus = b.stock_status || b.stockStatus;
    const lowLimit = parseInt(b.low_stock_threshold || b.lowStockThreshold || currentProduct.low_stock_threshold || 5, 10);

    // If admin explicitly chose 'In Stock' but stock was 0, auto-assign positive stock (default 50 or previous qty)
    if (parsedStockStatus === "In Stock" && (parsedStock === 0 || (parsedStock === undefined && (currentProduct.stock === 0 || currentProduct.stock === null)))) {
      const prevQty = (currentProduct.noOfItems > 0 ? currentProduct.noOfItems : (currentProduct.stock > 0 ? currentProduct.stock : 50));
      parsedStock = prevQty;
    } else if (parsedStockStatus === "Out of Stock") {
      parsedStock = 0;
    } else if (parsedStock !== undefined) {
      if (parsedStock <= 0 && parsedStockStatus !== "Pre-Order") {
        parsedStockStatus = "Out of Stock";
      } else if (parsedStock > 0 && parsedStock <= lowLimit && (!parsedStockStatus || parsedStockStatus === "In Stock")) {
        parsedStockStatus = "Low Stock";
      } else if (parsedStock > lowLimit && (parsedStockStatus === "Out of Stock" || !parsedStockStatus)) {
        parsedStockStatus = "In Stock";
      }
    }

    if (parsedStock !== undefined) {
      addField("stock", parsedStock);
      addField("noOfItems", parsedStock);
    }
    if (parsedStockStatus !== undefined) {
      addField("stock_status", parsedStockStatus);
    }
    if (b.low_stock_threshold !== undefined || b.lowStockThreshold !== undefined) {
      addField("low_stock_threshold", lowLimit);
    }

    if (b.price !== undefined || b.mrp !== undefined || b.mrpPrice !== undefined) {
      addField("price", parseFloat(b.price || b.mrp || b.mrpPrice));
    }
    if (b.offerPrice !== undefined || b.offer_price !== undefined || b.sellingPrice !== undefined) {
      addField("offerPrice", parseFloat(b.offerPrice || b.offer_price || b.sellingPrice));
    }
    if (b.discount_percent !== undefined || b.discountPercent !== undefined || b.discountPercentage !== undefined) {
      addField("discount_percent", parseFloat(b.discount_percent !== undefined ? b.discount_percent : b.discountPercent !== undefined ? b.discountPercent : b.discountPercentage));
    }

    const updateDeliv = b.delivery_charge !== undefined ? b.delivery_charge : b.deliveryCharge;
    if (updateDeliv !== undefined) {
      addField("delivery_charge", updateDeliv === null || updateDeliv === "" ? null : parseFloat(updateDeliv));
    }

    if (b.tax_type !== undefined || b.taxType !== undefined) addField("tax_type", b.tax_type || b.taxType);
    if (b.gst_percentage !== undefined || b.gst !== undefined) addField("gst_percentage", parseFloat(b.gst_percentage || b.gst));

    if (b.size_fit !== undefined || b.sizeFit !== undefined || b.size !== undefined) addField("size_fit", b.size_fit || b.sizeFit || b.size);
    if (b.length !== undefined) addField("length", b.length);
    if (b.Height !== undefined || b.height !== undefined) addField("Height", b.Height || b.height);
    if (b.width !== undefined) addField("width", b.width);
    if (b.depth !== undefined) addField("depth", b.depth);
    if (b.Dimension !== undefined || b.dimension !== undefined) addField("Dimension", b.Dimension || b.dimension);
    if (b.Weight !== undefined || b.weight !== undefined) addField("Weight", b.Weight || b.weight);
    if (b.specification_unit !== undefined || b.unit !== undefined) addField("specification_unit", b.specification_unit || b.unit);

    if (b.short_description !== undefined || b.shortDescription !== undefined) addField("short_description", b.short_description || b.shortDescription);
    if (b.description !== undefined || b.fullDescription !== undefined) addField("description", b.description || b.fullDescription);

    if (b.ProductHighlights !== undefined || b.highlights !== undefined) {
      const hl = b.ProductHighlights || b.highlights;
      addField("ProductHighlights", Array.isArray(hl) ? hl.join("\n") : hl);
    }
    if (b.package_includes !== undefined || b.packageIncludes !== undefined || b.inTheBox !== undefined) {
      const pi = b.package_includes || b.packageIncludes || b.inTheBox;
      addField("package_includes", Array.isArray(pi) ? pi.join("\n") : pi);
    }
    if (b.Benefits !== undefined || b.benefits !== undefined) addField("Benefits", b.Benefits || b.benefits);
    if (b.UsageAndCareInstructions !== undefined || b.careInstructions !== undefined) addField("UsageAndCareInstructions", b.UsageAndCareInstructions || b.careInstructions);
    if (b.disclaimer !== undefined) addField("disclaimer", b.disclaimer);

    if (b.shipping_class !== undefined || b.shippingClass !== undefined) addField("shipping_class", b.shipping_class || b.shippingClass);
    if (b.estimated_delivery_days !== undefined || b.estimatedDeliveryDays !== undefined) {
      addField("estimated_delivery_days", b.estimated_delivery_days || b.estimatedDeliveryDays);
    }
    if (b.dispatch_time !== undefined || b.dispatchTime !== undefined) {
      addField("dispatch_time", b.dispatch_time || b.dispatchTime);
    }
    if (b.return_available !== undefined || b.returnAvailable !== undefined) {
      const ret = b.return_available !== undefined ? b.return_available : b.returnAvailable;
      addField("return_available", ret === true || ret === "true" || ret === 1 ? 1 : 0);
    }
    if (b.replacement_available !== undefined || b.replacementAvailable !== undefined) {
      const rep = b.replacement_available !== undefined ? b.replacement_available : b.replacementAvailable;
      addField("replacement_available", rep === true || rep === "true" || rep === 1 ? 1 : 0);
    }
    if (b.replacement_period !== undefined || b.replacementPeriod !== undefined) {
      addField("replacement_period", parseInt(b.replacement_period || b.replacementPeriod, 10));
    }

    if (b.seo_title !== undefined || b.seoTitle !== undefined) addField("seo_title", b.seo_title || b.seoTitle);
    if (b.seo_description !== undefined || b.seoDescription !== undefined) addField("seo_description", b.seo_description || b.seoDescription);
    if (b.url_slug !== undefined || b.urlSlug !== undefined) addField("url_slug", b.url_slug || b.urlSlug);
    if (b.search_keywords !== undefined || b.tags !== undefined || b.product_tags !== undefined) {
      const kw = b.search_keywords || b.tags || b.product_tags;
      addField("search_keywords", Array.isArray(kw) ? kw.join(",") : kw);
      addField("tags", Array.isArray(kw) ? kw.join(",") : kw);
    }

    if (b.is_featured !== undefined || b.isFeatured !== undefined) {
      const feat = b.is_featured !== undefined ? b.is_featured : b.isFeatured;
      addField("is_featured", feat === true || feat === "true" || feat === 1 ? 1 : 0);
    }
    if (b.is_bestseller !== undefined || b.isBestseller !== undefined) {
      const best = b.is_bestseller !== undefined ? b.is_bestseller : b.isBestseller;
      addField("is_bestseller", best === true || best === "true" || best === 1 ? 1 : 0);
    }

    if (b.occasion !== undefined) addField("occasion", b.occasion);
    if (b.suitable_for !== undefined || b.suitableFor !== undefined) addField("suitable_for", b.suitable_for || b.suitableFor);
    if (b.country_of_origin !== undefined || b.countryOfOrigin !== undefined) addField("country_of_origin", b.country_of_origin || b.countryOfOrigin);
    if (b.ProductCode !== undefined || b.sku !== undefined || b.productCode !== undefined) {
      addField("ProductCode", b.ProductCode || b.sku || b.productCode);
    }

    if (b.verified !== undefined) addField("verified", Number(b.verified));

    // Handle images array
    const rawExisting = b.existingImages !== undefined ? b.existingImages : b.existing_images;
    if (rawExisting !== undefined || uploadedImages.length > 0) {
      let retainedImages = [];
      if (rawExisting !== undefined && rawExisting !== null) {
        if (Array.isArray(rawExisting)) {
          retainedImages = rawExisting;
        } else if (typeof rawExisting === "string") {
          try {
            const parsed = JSON.parse(rawExisting);
            retainedImages = Array.isArray(parsed) ? parsed : [parsed];
          } catch (e) {
            if (rawExisting.includes(",")) {
              retainedImages = rawExisting.split(",").map((s) => s.trim());
            } else if (rawExisting.trim()) {
              retainedImages = [rawExisting.trim()];
            }
          }
        }
      } else {
        retainedImages = currentImages;
      }

      const finalImages = [...retainedImages, ...uploadedImages].slice(0, 15);
      addField("image", JSON.stringify(finalImages));
    }

    if (updateFields.length === 0) {
      return res.status(400).send({
        success: false,
        message: "No fields provided for update",
      });
    }

    values.push(id);

    await db.query(
      `UPDATE products SET ${updateFields.join(", ")} WHERE id = ?`,
      values
    );

    return res.status(200).send({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;

  try {
    const data = await db.query(`SELECT * FROM products WHERE id = ?`, [id]);

    if (!data.length) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    const updatedProduct = await db.query(`DELETE FROM products WHERE id=?`, [
      id,
    ]);

    return res.status(200).send({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.deleteByMerchant = async (req, res) => {
  const { id } = req.params;
  const merchantId = req.params.merchantId || (req.user && req.user.id);

  try {
    let query = `SELECT * FROM products WHERE id = ?`;
    let params = [id];
    if (merchantId) {
      query += ` AND merchantId = ?`;
      params.push(merchantId);
    }
    const [data] = await db.query(query, params);

    if (!data || !data.length) {
      return res.status(404).send({
        success: false,
        message: "Product not found or does not belong to this merchant",
      });
    }

    await db.query(`DELETE FROM products WHERE id = ?`, [id]);

    return res.status(200).send({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("deleteByMerchant error:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.searchProduct = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required.",
      });
    }

    const searchQuery = `%${query}%`;

    const [products] = await db.query(
      `SELECT p.*,
              IFNULL(r.total_reviews, 0) AS total_reviews,
              IFNULL(r.average_rating, 5.0) AS average_rating
       FROM products p
       LEFT JOIN (
         SELECT productId, COUNT(*) AS total_reviews, AVG(rating) AS average_rating
         FROM product_review
         GROUP BY productId
       ) r ON p.id = r.productId
       WHERE p.isDeleted = 0 AND p.verified = 1
         AND (p.productName LIKE ? OR p.description LIKE ? OR p.theme LIKE ? OR p.category LIKE ? OR p.productType LIKE ? OR p.ProductHighlights LIKE ? OR p.tags LIKE ? OR p.ProductCode LIKE ? OR p.occasion LIKE ?)
       ORDER BY p.id DESC LIMIT 50`,
      [
        searchQuery,
        searchQuery,
        searchQuery,
        searchQuery,
        searchQuery,
        searchQuery,
        searchQuery,
        searchQuery,
        searchQuery,
      ]
    );

    const formattedProducts = (products || []).map(formatProductResponse);

    return res.status(200).json({
      success: true,
      data: formattedProducts,
      products: formattedProducts,
    });
  } catch (error) {
    console.error("Error searching product:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while searching for product.",
    });
  }
};

exports.productActive = async (req, res) => {
  const { productId } = req.params;

  try {
    // Check if product exists
    const [product] = await db.query(`SELECT * FROM products WHERE id = ?`, [
      productId,
    ]);

    if (!product.length) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    // Toggle isDeleted
    const currentStatus = product[0].isDeleted;
    const newStatus = currentStatus === 0 ? 1 : 0;

    await db.query(`UPDATE products SET isDeleted = ? WHERE id = ?`, [
      newStatus,
      productId,
    ]);
    const message =
      newStatus === 0 ? "Product is active" : "Product is inactive now";
    return res.status(200).send({
      success: true,
      message: message,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getByMerchantId = async (req, res) => {
  let { merchantId } = req.params;
  let { search } = req.query;

  try {
    if (!merchantId) {
      return res.status(400).send({
        success: false,
        message: "Merchant ID is required",
      });
    }

    merchantId = parseInt(merchantId, 10);
    let queryCondition = "";
    let queryParams = [merchantId];

    if (search) {
      queryCondition = `AND (
                p.productName LIKE ? OR
                p.brand LIKE ? OR
                p.price LIKE ? OR
                p.offerPrice LIKE ? OR
                p.theme LIKE ? OR
                p.category LIKE ? OR
                p.productType LIKE ? OR
                p.stock LIKE ? OR
                p.colour LIKE ? OR
                p.style LIKE ? OR
                p.material LIKE ? OR
                p.ProductCode LIKE ? OR
                p.tags LIKE ?
            )`;

      const likeSearch = `%${search}%`;
      queryParams.push(
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch
      );
    }

    const dataQuery = `
      SELECT 
        p.*,
        IFNULL(r.total_reviews, 0) AS total_reviews,
        IFNULL(r.average_rating, 5.0) AS average_rating
      FROM products p
      LEFT JOIN (
        SELECT 
          productId, 
          COUNT(*) AS total_reviews, 
          AVG(rating) AS average_rating
        FROM product_review
        GROUP BY productId
      ) r ON p.id = r.productId
      WHERE p.merchantId = ? ${queryCondition}
      ORDER BY p.id DESC
    `;

    const [products] = await db.query(dataQuery, queryParams);

    if (!products.length) {
      return res.status(200).send({
        success: true,
        message: "No products found",
        products: [],
        data: [],
      });
    }

    const formattedProducts = products.map(formatProductResponse);

    return res.status(200).send({
      success: true,
      products: formattedProducts,
      data: formattedProducts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.updateByMerchant = async (req, res) => {
  const { id } = req.params;
  const merchantId = req.params.merchantId || (req.user && req.user.id);
  const b = req.body;

  const uploadedImages = req.files
    ? req.files.map((file) => file.location || file.path || file.filename)
    : req.file
    ? [req.file.location || req.file.path || req.file.filename]
    : [];

  try {
    const [data] = await db.query(
      `SELECT * FROM products WHERE id = ? AND merchantId = ?`,
      [id, merchantId]
    );

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found or does not belong to this merchant",
      });
    }

    const currentProduct = data[0];
    let currentImages = [];
    try {
      if (typeof currentProduct.image === "string") {
        currentImages = JSON.parse(currentProduct.image || "[]");
      } else if (Array.isArray(currentProduct.image)) {
        currentImages = currentProduct.image;
      } else if (currentProduct.image) {
        currentImages = [currentProduct.image];
      }
      if (!Array.isArray(currentImages)) currentImages = [currentImages];
    } catch (err) {
      if (currentProduct.image && typeof currentProduct.image === "string" && currentProduct.image.includes(",")) {
        currentImages = currentProduct.image.split(",").map((s) => s.trim());
      } else if (currentProduct.image) {
        currentImages = [currentProduct.image];
      } else {
        currentImages = [];
      }
    }

    let updateFields = [];
    let values = [];

    const addField = (col, val) => {
      if (val !== undefined) {
        updateFields.push(`${col} = ?`);
        values.push(val);
      }
    };

    if (b.productName !== undefined || b.name !== undefined || b.title !== undefined) {
      addField("productName", b.productName || b.name || b.title);
    }
    if (b.productType !== undefined || b.product_type !== undefined) {
      addField("productType", b.productType || b.product_type);
    }
    if (b.category !== undefined || b.theme !== undefined) {
      const cat = b.category || b.theme;
      addField("category", cat);
      addField("theme", cat);
    }
    if (b.subcategory !== undefined || b.subCategory !== undefined) {
      addField("subcategory", b.subcategory || b.subCategory);
    }
    if (b.brand !== undefined) addField("brand", b.brand);
    if (b.colour !== undefined || b.color !== undefined) addField("colour", b.colour || b.color);
    if (b.style !== undefined) addField("style", b.style);
    if (b.material !== undefined) addField("material", b.material);
    if (b.specialFeature !== undefined || b.special_feature !== undefined) {
      addField("specialFeature", b.specialFeature || b.special_feature);
    }

    if (b.stock !== undefined || b.stock_quantity !== undefined || b.noOfItems !== undefined || b.noOfPieces !== undefined) {
      const st = parseInt(b.stock !== undefined ? b.stock : b.stock_quantity !== undefined ? b.stock_quantity : b.noOfItems !== undefined ? b.noOfItems : b.noOfPieces, 10) || 0;
      addField("stock", st);
      addField("noOfItems", st);
    }
    if (b.stock_status !== undefined || b.stockStatus !== undefined) {
      addField("stock_status", b.stock_status || b.stockStatus);
    }
    if (b.low_stock_threshold !== undefined || b.lowStockThreshold !== undefined) {
      addField("low_stock_threshold", parseInt(b.low_stock_threshold || b.lowStockThreshold, 10));
    }

    if (b.price !== undefined || b.mrp !== undefined || b.mrpPrice !== undefined) {
      addField("price", parseFloat(b.price || b.mrp || b.mrpPrice));
    }
    if (b.offerPrice !== undefined || b.offer_price !== undefined || b.sellingPrice !== undefined) {
      addField("offerPrice", parseFloat(b.offerPrice || b.offer_price || b.sellingPrice));
    }
    if (b.discount_percent !== undefined || b.discountPercent !== undefined || b.discountPercentage !== undefined) {
      addField("discount_percent", parseFloat(b.discount_percent !== undefined ? b.discount_percent : b.discountPercent !== undefined ? b.discountPercent : b.discountPercentage));
    }

    const updateDeliv = b.delivery_charge !== undefined ? b.delivery_charge : b.deliveryCharge;
    if (updateDeliv !== undefined) {
      addField("delivery_charge", updateDeliv === null || updateDeliv === "" ? null : parseFloat(updateDeliv));
    }

    if (b.tax_type !== undefined || b.taxType !== undefined) addField("tax_type", b.tax_type || b.taxType);
    if (b.gst_percentage !== undefined || b.gst !== undefined) addField("gst_percentage", parseFloat(b.gst_percentage || b.gst));

    if (b.size_fit !== undefined || b.sizeFit !== undefined || b.size !== undefined) addField("size_fit", b.size_fit || b.sizeFit || b.size);
    if (b.length !== undefined) addField("length", b.length);
    if (b.Height !== undefined || b.height !== undefined) addField("Height", b.Height || b.height);
    if (b.width !== undefined) addField("width", b.width);
    if (b.depth !== undefined) addField("depth", b.depth);
    if (b.Dimension !== undefined || b.dimension !== undefined) addField("Dimension", b.Dimension || b.dimension);
    if (b.Weight !== undefined || b.weight !== undefined) addField("Weight", b.Weight || b.weight);
    if (b.specification_unit !== undefined || b.unit !== undefined) addField("specification_unit", b.specification_unit || b.unit);

    if (b.short_description !== undefined || b.shortDescription !== undefined) addField("short_description", b.short_description || b.shortDescription);
    if (b.description !== undefined || b.fullDescription !== undefined) addField("description", b.description || b.fullDescription);

    if (b.ProductHighlights !== undefined || b.highlights !== undefined) {
      const hl = b.ProductHighlights || b.highlights;
      addField("ProductHighlights", Array.isArray(hl) ? hl.join("\n") : hl);
    }
    if (b.package_includes !== undefined || b.packageIncludes !== undefined || b.inTheBox !== undefined) {
      const pi = b.package_includes || b.packageIncludes || b.inTheBox;
      addField("package_includes", Array.isArray(pi) ? pi.join("\n") : pi);
    }
    if (b.Benefits !== undefined || b.benefits !== undefined) addField("Benefits", b.Benefits || b.benefits);
    if (b.UsageAndCareInstructions !== undefined || b.careInstructions !== undefined) addField("UsageAndCareInstructions", b.UsageAndCareInstructions || b.careInstructions);
    if (b.disclaimer !== undefined) addField("disclaimer", b.disclaimer);

    if (b.shipping_class !== undefined || b.shippingClass !== undefined) addField("shipping_class", b.shipping_class || b.shippingClass);
    if (b.return_available !== undefined || b.returnAvailable !== undefined) {
      const ret = b.return_available !== undefined ? b.return_available : b.returnAvailable;
      addField("return_available", ret === true || ret === "true" || ret === 1 ? 1 : 0);
    }
    if (b.replacement_available !== undefined || b.replacementAvailable !== undefined) {
      const rep = b.replacement_available !== undefined ? b.replacement_available : b.replacementAvailable;
      addField("replacement_available", rep === true || rep === "true" || rep === 1 ? 1 : 0);
    }
    if (b.replacement_period !== undefined || b.replacementPeriod !== undefined) {
      addField("replacement_period", parseInt(b.replacement_period || b.replacementPeriod, 10));
    }

    if (b.seo_title !== undefined || b.seoTitle !== undefined) addField("seo_title", b.seo_title || b.seoTitle);
    if (b.seo_description !== undefined || b.seoDescription !== undefined) addField("seo_description", b.seo_description || b.seoDescription);
    if (b.url_slug !== undefined || b.urlSlug !== undefined) addField("url_slug", b.url_slug || b.urlSlug);
    if (b.search_keywords !== undefined || b.tags !== undefined || b.product_tags !== undefined) {
      const kw = b.search_keywords || b.tags || b.product_tags;
      addField("search_keywords", Array.isArray(kw) ? kw.join(",") : kw);
      addField("tags", Array.isArray(kw) ? kw.join(",") : kw);
    }

    if (b.occasion !== undefined) addField("occasion", b.occasion);
    if (b.suitable_for !== undefined || b.suitableFor !== undefined) addField("suitable_for", b.suitable_for || b.suitableFor);
    if (b.country_of_origin !== undefined || b.countryOfOrigin !== undefined) addField("country_of_origin", b.country_of_origin || b.countryOfOrigin);
    if (b.ProductCode !== undefined || b.sku !== undefined || b.productCode !== undefined) {
      addField("ProductCode", b.ProductCode || b.sku || b.productCode);
    }

    const rawExisting = b.existingImages !== undefined ? b.existingImages : b.existing_images;
    if (rawExisting !== undefined || uploadedImages.length > 0) {
      let retainedImages = [];
      if (rawExisting !== undefined && rawExisting !== null) {
        if (Array.isArray(rawExisting)) {
          retainedImages = rawExisting;
        } else if (typeof rawExisting === "string") {
          try {
            const parsed = JSON.parse(rawExisting);
            retainedImages = Array.isArray(parsed) ? parsed : [parsed];
          } catch (e) {
            if (rawExisting.includes(",")) {
              retainedImages = rawExisting.split(",").map((s) => s.trim());
            } else if (rawExisting.trim()) {
              retainedImages = [rawExisting.trim()];
            }
          }
        }
      } else {
        retainedImages = currentImages;
      }

      const finalImages = [...retainedImages, ...uploadedImages].slice(0, 15);
      addField("image", JSON.stringify(finalImages));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided for update",
      });
    }

    values.push(id, merchantId);

    await db.query(
      `UPDATE products SET ${updateFields.join(", ")} WHERE id = ? AND merchantId = ?`,
      values
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.deleteByMerchant = async (req, res) => {
  const { id } = req.params;
  const merchantId = req.params.merchantId || (req.user && req.user.id);

  try {
    const [data] = await db.query(
      `SELECT * FROM products WHERE id = ? AND merchantId = ?`,
      [id, merchantId]
    );

    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found or does not belong to this merchant",
      });
    }

    await db.query(`DELETE FROM products WHERE id = ? AND merchantId = ?`, [
      id,
      merchantId,
    ]);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.verifyProduct = async (req, res) => {
  const { productId, merchantId } = req.params;
  if (!productId || !merchantId) {
    return res.status(400).json({
      success: false,
      message: "Product ID and Merchant ID are required",
    });
  }
  try {
    const [data] = await db.query(
      `SELECT * FROM products WHERE id = ? AND merchantId = ?`,
      [productId, merchantId]
    );

    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found or does not belong to this merchant",
      });
    }

    // Verify the product
    await db.query(`UPDATE products SET verified = 1 WHERE id = ?`, [
      productId,
    ]);

    console.log(data[0].productName);

    await sendNotification(
      merchantId,
      `Your Product ${data[0].productName} is Verified. Its now available for sale.`
    );

    return res.status(200).json({
      success: true,
      message: "Product verified successfully",
    });
  } catch (error) {
    console.error("Error verifying product:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.rejectProduct = async (req, res) => {
  const { productId, merchantId } = req.params;

  if (!productId || !merchantId) {
    return res.status(400).json({
      success: false,
      message: "Product ID and Merchant ID are required",
    });
  }
  try {
    const [data] = await db.query(
      `SELECT * FROM products WHERE id = ? AND merchantId = ?`,
      [productId, merchantId]
    );

    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Verify the product
    await db.query(`UPDATE products SET verified = 0 WHERE id = ?`, [
      productId,
    ]);

    await sendNotification(
      merchantId,
      `Your Product ${data[0].productName} is Rejected. Please check the details and reapply.`
    );

    return res.status(200).json({
      success: true,
      message: "Product Rejected successfully",
    });
  } catch (error) {
    console.error("Error Rejected product:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.reletedProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT productName, category, theme, productType FROM products WHERE id = ? AND verified = 1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    const currentProd = rows[0];
    const title = currentProd.productName || "";
    const cat = currentProd.category || currentProd.theme;
    const type = currentProd.productType;

    const keywords = title
      .toLowerCase()
      .split(" ")
      .filter((word) => word.length > 2);

    let query = `
      SELECT p.*,
             IFNULL(r.total_reviews, 0) AS total_reviews,
             IFNULL(r.average_rating, 5.0) AS average_rating
      FROM products p
      LEFT JOIN (
        SELECT productId, COUNT(*) AS total_reviews, AVG(rating) AS average_rating
        FROM product_review
        GROUP BY productId
      ) r ON p.id = r.productId
      WHERE p.id != ? AND p.verified = 1 AND p.isDeleted = 0
    `;
    let queryParams = [id];

    let conditions = [];
    if (keywords.length > 0) {
      const likeClauses = keywords.map(() => `p.productName LIKE ?`).join(" OR ");
      conditions.push(`(${likeClauses})`);
      keywords.forEach((word) => queryParams.push(`%${word}%`));
    }
    if (cat) {
      conditions.push(`p.category = ? OR p.theme = ?`);
      queryParams.push(cat, cat);
    }
    if (type) {
      conditions.push(`p.productType = ?`);
      queryParams.push(type);
    }

    if (conditions.length > 0) {
      query += ` AND (${conditions.join(" OR ")})`;
    }

    query += ` ORDER BY p.id DESC LIMIT 8`;

    const [matchedProducts] = await db.query(query, queryParams);
    const formatted = (matchedProducts || []).map(formatProductResponse);

    return res.status(200).send({
      success: true,
      data: formatted,
      products: formatted,
    });
  } catch (error) {
    console.error("Related product error:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.productReview = async (req, res) => {
  let { userId, productId, merchantId, rating, comment, reason } = req.body;
  const comment_image = req.files
    ? req.files.map((file) => file.location || file.path || file.filename)
    : (req.file ? [req.file.location || req.file.path || req.file.filename] : []);

  try {
    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Product ID are required",
      });
    }

    // Auto-fetch merchantId from product if not provided by frontend
    if (!merchantId) {
      const [prodRows] = await db.query("SELECT merchantId FROM products WHERE id = ?", [productId]);
      merchantId = prodRows && prodRows[0] ? prodRows[0].merchantId : 1;
    }

    const reviewRating = Number(rating) || 5;

    // Check if the user has already reviewed this product
    const [existingReview] = await db.query(
      `SELECT id FROM product_review WHERE userId = ? AND productId = ?`,
      [userId, productId]
    );

    let savedImages = [];
    if (comment_image && comment_image.length > 0) {
      savedImages = comment_image;
    } else if (req.body.reviewImages) {
      try {
        savedImages = typeof req.body.reviewImages === "string" ? JSON.parse(req.body.reviewImages) : req.body.reviewImages;
      } catch (e) {
        savedImages = [req.body.reviewImages];
      }
    }

    let reasonJson = "[]";
    if (reason) {
      if (typeof reason === "object") {
        reasonJson = JSON.stringify(reason);
      } else if (typeof reason === "string") {
        const trimmed = reason.trim();
        if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
          try {
            JSON.parse(trimmed);
            reasonJson = trimmed;
          } catch {
            reasonJson = JSON.stringify([trimmed]);
          }
        } else {
          reasonJson = JSON.stringify(trimmed ? [trimmed] : []);
        }
      }
    }

    const commentImageJson = JSON.stringify(savedImages || []);

    if (existingReview.length > 0) {
      // Update existing review
      await db.query(
        `UPDATE product_review SET rating = ?, comment = ?, comment_image = ?, reason = ? WHERE id = ?`,
        [reviewRating, comment || "", commentImageJson, reasonJson, existingReview[0].id]
      );
    } else {
      // Insert new review
      await db.query(
        `INSERT INTO product_review (userId, productId, merchantId, rating, comment, comment_image, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          productId,
          merchantId,
          reviewRating,
          comment || "",
          commentImageJson,
          reasonJson,
        ]
      );
    }

    // Auto-recalculate average_rating and total_reviews on products table
    try {
      await db.query(
        `UPDATE products 
         SET average_rating = (SELECT COALESCE(AVG(rating), 0) FROM product_review WHERE productId = ?),
             total_reviews = (SELECT COUNT(*) FROM product_review WHERE productId = ?)
         WHERE id = ?`,
        [productId, productId, productId]
      );
    } catch (rErr) {
      console.warn("Product rating recalculation warning:", rErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Product review submitted successfully!",
    });
  } catch (err) {
    console.error("Error in productReview:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

exports.getProductReviews = async (req, res) => {
  const { productId } = req.params;

  try {
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Query to get all reviews for the given productId
    const [reviews] = await db.query(
      `SELECT 
         pr.id,
         pr.userId, 
         u.name AS name, 
         u.lastname AS lastname, 
         u.image AS userImage, 
         pr.rating AS stars, 
         pr.rating,
         pr.comment AS text, 
         pr.comment,
         pr.comment_image AS reviewImages,
         pr.reason,
         pr.created_at AS createdAt,
         pr.created_at
       FROM product_review pr
       LEFT JOIN users u ON pr.userId = u.id
       WHERE pr.productId = ?
       ORDER BY pr.id DESC`,
      [productId]
    );

    const formattedReviews = (reviews || []).map((rev) => {
      let parsedImages = [];
      try {
        if (Array.isArray(rev.reviewImages)) {
          parsedImages = rev.reviewImages;
        } else if (typeof rev.reviewImages === "string" && rev.reviewImages.trim().startsWith("[")) {
          parsedImages = JSON.parse(rev.reviewImages);
        } else if (rev.reviewImages) {
          parsedImages = [rev.reviewImages];
        }
      } catch (e) {
        parsedImages = [];
      }

      let parsedReason = rev.reason;
      try {
        if (typeof rev.reason === "string" && (rev.reason.startsWith("[") || rev.reason.startsWith("{"))) {
          parsedReason = JSON.parse(rev.reason);
        }
      } catch (e) {}

      return {
        id: rev.id,
        userId: rev.userId,
        name: `${rev.name || 'Devotee'} ${rev.lastname || ''}`.trim(),
        userName: `${rev.name || 'Devotee'} ${rev.lastname || ''}`.trim(),
        userImage: rev.userImage || null,
        stars: Number(rev.stars || rev.rating || 5),
        rating: Number(rev.stars || rev.rating || 5),
        text: rev.text || rev.comment || "",
        comment: rev.text || rev.comment || "",
        reviewImages: parsedImages,
        reason: parsedReason,
        createdAt: rev.createdAt || rev.created_at || new Date().toISOString(),
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedReviews,
      totalReviews: formattedReviews.length,
    });
  } catch (err) {
    console.error("Error in getProductReviews:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: [],
    });
  }
};

exports.getAllReview = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        pr.id,
        pr.rating,
        pr.comment,
        pr.comment_image,
        pr.reason,
        pr.created_at,

        u.id AS user_id,
        u.image AS user_image,
        u.name AS user_name,
        u.lastname AS user_lastname,
        u.email AS user_email,
        u.mobile AS user_mobile,

        p.id AS product_id,
        p.image AS product_image,
        p.productName AS product_name,
        p.price,
        p.offerPrice,

        s.id AS merchant_id,
        s.seller_name AS merchant_name,
        s.email AS merchant_email,
        s.number AS merchant_contact

      FROM product_review pr
      LEFT JOIN users u ON pr.userId = u.id
      LEFT JOIN products p ON pr.productId = p.id
      LEFT JOIN sellers s ON pr.merchantId = s.id
      ORDER BY pr.id DESC
    `);

    const result = rows.map((row) => {
      let parsedImages = [];
      try {
        if (typeof row.comment_image === "string" && row.comment_image.trim().startsWith("[")) {
          parsedImages = JSON.parse(row.comment_image);
        } else if (row.comment_image) {
          parsedImages = [row.comment_image];
        }
      } catch (e) {
        parsedImages = [];
      }

      return {
        id: row.id,
        rating: row.rating,
        comment: row.comment,
        reason: row.reason,
        reviewImages: parsedImages,
        created_at: row.created_at,

        user: {
          id: row.user_id,
          userImage: row.user_image,
          name: row.user_name,
          lastname: row.user_lastname,
          email: row.user_email,
          mobile: row.user_mobile,
        },

        product: {
          id: row.product_id,
          productImage: row.product_image,
          name: row.product_name,
          price: row.price,
          offerPrice: row.offerPrice,
        },

        merchant: {
          id: row.merchant_id,
          name: row.merchant_name,
          email: row.merchant_email,
          contact: row.merchant_contact,
        },
      };
    });

    res.status(200).json({
      success: true,
      data: result,
      totalCount: result.length,
    });
  } catch (error) {
    console.error("Error in getAllReview:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review_id = req.params.review_id || req.params.id;

    if (!review_id) {
      return res.status(400).json({
        success: false,
        message: "Review ID is required.",
      });
    }

    // Get productId before deleting to update average_rating afterwards
    const [revRows] = await db.query("SELECT productId FROM product_review WHERE id = ?", [review_id]);
    const productId = revRows && revRows[0] ? revRows[0].productId : null;

    const [result] = await db.query(`DELETE FROM product_review WHERE id = ?`, [
      review_id,
    ]);

    if (result.affectedRows > 0) {
      if (productId) {
        try {
          await db.query(
            `UPDATE products 
             SET average_rating = (SELECT COALESCE(AVG(rating), 0) FROM product_review WHERE productId = ?),
                 total_reviews = (SELECT COUNT(*) FROM product_review WHERE productId = ?)
             WHERE id = ?`,
            [productId, productId, productId]
          );
        } catch (rErr) {
          console.warn("Recalculate rating warning after delete:", rErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Review deleted successfully.",
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Review item not found.",
      });
    }
  } catch (err) {
    console.error("Error in deleteReview:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete review.",
    });
  }
};

exports.wishList = async (req, res) => {
  try {
    const { user_id, product_id } = req.body;
    console.log(user_id, product_id);
    const like = req.body.like !== undefined ? req.body.like : true;
    const result = await db.query(
      "INSERT INTO wishlist (user_id, product_id, `like`) VALUES (?, ?, ?)",
      [user_id, product_id, like]
    );
    res
      .status(200)
      .json({ success: true, message: "Product added to wishlist" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const { user_id } = req.params;
    console.log(user_id);
    const result = await db.query(
      `SELECT p.* 
       FROM wishlist w 
       JOIN products p ON w.product_id = p.id 
       WHERE w.user_id = ? AND w.\`like\` = TRUE`,
      [user_id]
    );

    if (result[0].length === 0) {
      return res.status(404).json({ message: "No data found" }); // If no data found
    }

    res.status(200).json({ wishlist: result[0] }); // If data found
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch wishlist" });
  }
};

exports.getWishlistStatus = async (req, res) => {
  try {
    const { user_id, product_id } = req.params;
    console.log(user_id, product_id, "llklkl");

    if (!user_id || !product_id) {
      return res.status(400).json({
        success: false,
        message: "userid and product id is required.",
      });
    }
    const [rows] = await db.query(
      `SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?`,
      [user_id, product_id]
    );
    console.log(rows, "dfd");
    if (rows.length > 0) {
      return res.status(200).json({ data: rows[0] });
    } else {
      return res.status(200).json({ data: null });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch like status" });
  }
};

exports.deleteWishlistItem = async (req, res) => {
  try {
    const { user_id, product_id } = req.params;

    if (!user_id || !product_id) {
      return res.status(400).json({
        success: false,
        message: "User ID and Product ID are required.",
      });
    }

    const [result] = await db.query(
      `DELETE FROM wishlist WHERE user_id = ? AND product_id = ?`,
      [user_id, product_id]
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({
        success: true,
        message: "Wishlist item deleted successfully.",
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Wishlist item not found.",
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete wishlist item.",
    });
  }
};

exports.getByIdProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const [data] = await db.query(
      `SELECT p.*, 
              IFNULL(r.total_reviews, 0) AS total_reviews,
              IFNULL(r.average_rating, 5.0) AS average_rating
       FROM products p
       LEFT JOIN (
         SELECT productId, COUNT(*) AS total_reviews, AVG(rating) AS average_rating
         FROM product_review
         GROUP BY productId
       ) r ON p.id = r.productId
       WHERE p.id = ?`,
      [id]
    );

    if (!data || !data.length) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    const formattedProduct = formatProductResponse(data[0]);

    return res.status(200).send({
      success: true,
      data: formattedProduct,
      product: formattedProduct,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};
