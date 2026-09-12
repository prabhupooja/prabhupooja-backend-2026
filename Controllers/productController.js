const db = require("../config/db");
const { sendNotification } = require("./notificationController");

exports.create = async (req, res) => {
  let {
    productId,
    productName,
    theme,
    brand,
    colour,
    style,
    offerPrice,
    material,
    specialFeature,
    noOfItems,
    price,
    description,
    merchantId,
    Height,
    Dimension,
    Weight,
    ProductCode,
    ProductHighlights,
    Benefits,
    UsageAndCareInstructions,
    verified,
  } = req.body;

  merchantId = merchantId || (req.user && req.user.id) || 1;
  const isVerified = (verified !== undefined && verified !== null) ? Number(verified) : 1;

  const images = req.files ? req.files.map((file) => file.location) : (req.file ? [req.file.location] : []);

  try {
    if (
      !productName ||
      !colour ||
      !offerPrice ||
      !material ||
      !noOfItems ||
      !price ||
      !description ||
      !merchantId
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided.",
      });
    }

    // If productId is provided, try to update existing product
    if (productId) {
      const [result] = await db.query("SELECT image FROM products WHERE id = ?", [
        productId,
      ]);

      if (!result || result.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found." });
      }

      let existingImages = [];
      if (result[0].image) {
        try {
          existingImages = typeof result[0].image === 'string' ? JSON.parse(result[0].image) : result[0].image;
          if (!Array.isArray(existingImages)) existingImages = [existingImages];
        } catch (e) {
          existingImages = [result[0].image];
        }
      }

      // Add new images to existing ones
      const updatedImages = images.length > 0 ? [...existingImages, ...images] : existingImages;

      await db.query(
        `UPDATE products SET 
          productName = ?, theme = ?, brand = ?, colour = ?, style = ?, material = ?, 
          specialFeature = ?, noOfItems = ?, price = ?, image = ?, offerPrice = ?, 
          description = ?, merchantId = ?, Height = ?, Dimension = ?, Weight = ?, 
          ProductCode = ?, ProductHighlights = ?, Benefits = ?, UsageAndCareInstructions = ?,
          verified = COALESCE(?, verified, 1)
         WHERE id = ?`,
        [
          productName,
          theme,
          brand,
          colour,
          style,
          material,
          specialFeature,
          noOfItems,
          price,
          JSON.stringify(updatedImages),
          offerPrice,
          description,
          merchantId,
          Height,
          Dimension,
          Weight,
          ProductCode,
          ProductHighlights,
          Benefits,
          UsageAndCareInstructions,
          isVerified,
          productId,
        ]
      );

      return res.status(200).json({
        success: true,
        message: "Product updated successfully",
        images: updatedImages,
      });
    }

    // Else, create a new product (Default verified = 1 so it appears live on website immediately)
    const create = await db.query(
      `INSERT INTO products (
        productName, theme, brand, colour, style, material, specialFeature, 
        noOfItems, price, image, offerPrice, description, merchantId,
        Height, Dimension, Weight, ProductCode, ProductHighlights, Benefits, UsageAndCareInstructions,
        verified, isDeleted, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
      [
        productName,
        theme,
        brand || "PrabhuPooja",
        colour,
        style,
        material,
        specialFeature,
        noOfItems,
        price,
        JSON.stringify(images),
        offerPrice,
        description,
        merchantId,
        Height,
        Dimension,
        Weight,
        ProductCode,
        ProductHighlights,
        Benefits,
        UsageAndCareInstructions,
        isVerified,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Product created & published successfully",
      id: create[0]?.insertId,
      productId: create[0]?.insertId,
      data: {
        id: create[0]?.insertId,
        insertId: create[0]?.insertId,
        images: images,
      },
    });
  } catch (error) {
    console.error("Error in product create/update:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const [data] = await db.query(
      `SELECT * FROM products
WHERE isDeleted = 0 AND verified = 1
ORDER BY created_at DESC`
    );

    if (!data || !data.length) {
      return res.status(200).send({
        success: true,
        message: "No products found",
        data: [],
      });
    }

    return res.status(200).send({
      success: true,
      data: data,
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
      `SELECT * FROM products ORDER BY created_at DESC`
    );

    if (!data || !data.length) {
      return res.status(200).send({
        success: true,
        message: "No products found",
        data: [],
      });
    }

    return res.status(200).send({
      success: true,
      data: data,
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
    const { page = 1, limit = 10, search = "", material = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let baseQuery = `SELECT * FROM products WHERE isDeleted = 0 AND verified = 1`;
    let countQuery = `SELECT COUNT(*) AS total FROM products WHERE isDeleted = 0 AND verified = 1`;
    let queryParams = [];

    if (search) {
      baseQuery += ` AND (productName LIKE ? OR description LIKE ?)`;
      countQuery += ` AND (productName LIKE ? OR description LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (material) {
      baseQuery += ` AND colour LIKE ?`;
      countQuery += ` AND colour LIKE ?`;
      queryParams.push(`%${material}%`);
    }

    baseQuery += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), offset);

    const bestSellerQuery = `
  SELECT * FROM products
  WHERE isDeleted = 0 AND verified = 1
  ORDER BY id DESC
  LIMIT 3
`;

    const [dataRows, countRows, bestSellerRows] = await Promise.all([
      db.query(baseQuery, queryParams),
      db.query(countQuery, queryParams.slice(0, -2)),
      db.query(bestSellerQuery),
    ]);

    const productData = dataRows[0] || [];
    const total = countRows[0]?.[0]?.total || 0;
    const bestSellerProducts = bestSellerRows[0] || [];

    return res.status(200).send({
      success: true,
      productData,
      data: productData,
      bestSellerProducts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)) || 1
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
              (SELECT AVG(r.rating) 
               FROM product_review r 
               WHERE r.productId = p.id) AS average_rating
       FROM products p
       WHERE p.id = ? `,
      [id]
    );

    if (!data || !data.length) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).send({
      success: true,
      data: data[0],
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
  const {
    productName,
    theme,
    brand,
    colour,
    style,
    material,
    specialFeature,
    noOfItems,
    price,
    offerPrice,
    description,
    Height,
    Dimension,
    Weight,
    ProductCode,
    ProductHighlights,
    Benefits,
    UsageAndCareInstructions,
    newImages,
    existingImages,
    existing_images,
    verified,
  } = req.body;
  const uploadedImages = req.files
    ? req.files.map((file) => file.location || file.originalname)
    : (req.file ? [req.file.location || req.file.originalname] : []);

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

    if (productName !== undefined) {
      updateFields.push("productName = ?");
      values.push(productName);
    }
    if (theme !== undefined) {
      updateFields.push("theme = ?");
      values.push(theme);
    }
    if (brand !== undefined) {
      updateFields.push("brand = ?");
      values.push(brand);
    }
    if (colour !== undefined) {
      updateFields.push("colour = ?");
      values.push(colour);
    }
    if (style !== undefined) {
      updateFields.push("style = ?");
      values.push(style);
    }
    if (material !== undefined) {
      updateFields.push("material = ?");
      values.push(material);
    }
    if (specialFeature !== undefined) {
      updateFields.push("specialFeature = ?");
      values.push(specialFeature);
    }
    if (noOfItems !== undefined) {
      updateFields.push("noOfItems = ?");
      values.push(noOfItems);
    }
    if (price !== undefined) {
      updateFields.push("price = ?");
      values.push(price);
    }
    if (offerPrice !== undefined) {
      updateFields.push("offerPrice = ?");
      values.push(offerPrice);
    }
    if (description !== undefined) {
      updateFields.push("description = ?");
      values.push(description);
    }
    if (Height !== undefined) {
      updateFields.push("Height = ?");
      values.push(Height);
    }
    if (Dimension !== undefined) {
      updateFields.push("Dimension = ?");
      values.push(Dimension);
    }
    if (Weight !== undefined) {
      updateFields.push("Weight = ?");
      values.push(Weight);
    }
    if (ProductCode !== undefined) {
      updateFields.push("ProductCode = ?");
      values.push(ProductCode);
    }
    if (ProductHighlights !== undefined) {
      updateFields.push("ProductHighlights = ?");
      values.push(ProductHighlights);
    }
    if (Benefits !== undefined) {
      updateFields.push("Benefits = ?");
      values.push(Benefits);
    }
    if (UsageAndCareInstructions !== undefined) {
      updateFields.push("UsageAndCareInstructions = ?");
      values.push(UsageAndCareInstructions);
    }
    if (verified !== undefined) {
      updateFields.push("verified = ?");
      values.push(Number(verified));
    }

    const rawExisting = existingImages !== undefined ? existingImages : existing_images;
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

      const finalImages = [...retainedImages, ...uploadedImages].slice(0, 5);
      updateFields.push("image = ?");
      values.push(JSON.stringify(finalImages));
    } else if (newImages) {
      let parsedNewImages;
      try {
        parsedNewImages = typeof newImages === "string" ? JSON.parse(newImages) : newImages;
      } catch (err) {
        return res.status(400).send({
          success: false,
          message: "Invalid newImages format. Must be JSON array.",
        });
      }

      if (Array.isArray(parsedNewImages)) {
        const updatedImages = [...currentImages];
        let fileIndex = 0;

        parsedNewImages.forEach((val, idx) => {
          if (val && uploadedImages[fileIndex]) {
            updatedImages[idx] = uploadedImages[fileIndex];
            fileIndex++;
          }
        });

        updateFields.push("image = ?");
        values.push(JSON.stringify(updatedImages));
      }
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
      "SELECT * FROM products WHERE productName LIKE ? OR price LIKE ? OR offerPrice LIKE ?",
      [searchQuery, searchQuery, searchQuery]
    );

    return res.status(200).json({
      success: true,
      data: products,
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

    merchantId = parseInt(merchantId);
    let queryCondition = "";
    let queryParams = [merchantId];

    if (search) {
      queryCondition = `AND (
                productName LIKE ? OR
                brand LIKE ? OR
                price LIKE ? OR
                offerPrice LIKE ? OR
                theme LIKE ? OR
                noOfItems LIKE ? OR
                colour LIKE ? OR
                style LIKE ? OR
                isDeleted LIKE ? OR
                material LIKE ? OR
                specialFeature LIKE ?
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
        likeSearch
      );
    }

    const dataQuery = `
      SELECT 
        p.*,
        IFNULL(r.total_reviews, 0) AS totalReviews,
        IFNULL(r.average_rating, 0) AS averageRating
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
    `;

    const [products] = await db.query(dataQuery, queryParams);

    if (!products.length) {
      return res.status(200).send({
        success: false,
        message: "No products found",
        products: [],
      });
    }

    return res.status(200).send({
      success: true,
      products,
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
  const {
    productName,
    theme,
    brand,
    colour,
    style,
    material,
    specialFeature,
    noOfPieces,
    noOfItems,
    price,
    offerPrice,
    description,
    Height,
    Dimension,
    Weight,
    ProductCode,
    ProductHighlights,
    Benefits,
    UsageAndCareInstructions,
    newImages,
    existingImages,
    existing_images,
  } = req.body;

  const uploadedImages = req.files
    ? req.files.map((file) => file.location || file.originalname)
    : (req.file ? [req.file.location || req.file.originalname] : []);

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

    if (productName !== undefined) {
      updateFields.push("productName = ?");
      values.push(productName);
    }
    if (theme !== undefined) {
      updateFields.push("theme = ?");
      values.push(theme);
    }
    if (brand !== undefined) {
      updateFields.push("brand = ?");
      values.push(brand);
    }
    if (colour !== undefined) {
      updateFields.push("colour = ?");
      values.push(colour);
    }
    if (style !== undefined) {
      updateFields.push("style = ?");
      values.push(style);
    }
    if (material !== undefined) {
      updateFields.push("material = ?");
      values.push(material);
    }
    if (specialFeature !== undefined) {
      updateFields.push("specialFeature = ?");
      values.push(specialFeature);
    }
    if (noOfPieces !== undefined || noOfItems !== undefined) {
      updateFields.push("noOfItems = ?");
      values.push(noOfItems || noOfPieces);
    }
    if (price !== undefined) {
      updateFields.push("price = ?");
      values.push(price);
    }
    if (offerPrice !== undefined) {
      updateFields.push("offerPrice = ?");
      values.push(offerPrice);
    }
    if (description !== undefined) {
      updateFields.push("description = ?");
      values.push(description);
    }
    if (Height !== undefined) {
      updateFields.push("Height = ?");
      values.push(Height);
    }
    if (Dimension !== undefined) {
      updateFields.push("Dimension = ?");
      values.push(Dimension);
    }
    if (Weight !== undefined) {
      updateFields.push("Weight = ?");
      values.push(Weight);
    }
    if (ProductCode !== undefined) {
      updateFields.push("ProductCode = ?");
      values.push(ProductCode);
    }
    if (ProductHighlights !== undefined) {
      updateFields.push("ProductHighlights = ?");
      values.push(ProductHighlights);
    }
    if (Benefits !== undefined) {
      updateFields.push("Benefits = ?");
      values.push(Benefits);
    }
    if (UsageAndCareInstructions !== undefined) {
      updateFields.push("UsageAndCareInstructions = ?");
      values.push(UsageAndCareInstructions);
    }

    const rawExisting = existingImages !== undefined ? existingImages : existing_images;
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

      const finalImages = [...retainedImages, ...uploadedImages].slice(0, 5);
      updateFields.push("image = ?");
      values.push(JSON.stringify(finalImages));
    } else if (newImages) {
      let parsedNewImages;
      try {
        parsedNewImages = typeof newImages === "string" ? JSON.parse(newImages) : newImages;
      } catch (err) {
        parsedNewImages = null;
      }

      if (Array.isArray(parsedNewImages)) {
        const updatedImages = [...currentImages];
        let fileIndex = 0;

        parsedNewImages.forEach((val, idx) => {
          if (val && uploadedImages[fileIndex]) {
            updatedImages[idx] = uploadedImages[fileIndex];
            fileIndex++;
          }
        });

        updateFields.push("image = ?");
        values.push(JSON.stringify(updatedImages));
      }
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
      `SELECT productName FROM products WHERE id = ? AND verified = 1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    const title = rows[0].productName;

    const keywords = title
      .toLowerCase()
      .split(" ")
      .filter((word) => word.length > 2);

    let relatedProducts = [];

    if (keywords.length > 0) {
      const likeClauses = keywords.map(() => `productName LIKE ?`).join(" OR ");
      const likeValues = keywords.map((word) => `%${word}%`);

      const [matchedProducts] = await db.query(
        `SELECT * FROM products WHERE id != ? AND verified = 1 AND (${likeClauses})`,
        [id, ...likeValues]
      );

      relatedProducts = matchedProducts;
    }

    return res.status(200).send({
      success: true,
      data: relatedProducts,
    });
  } catch (error) {
    console.error(error);
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
    const data = await db.query(
      `SELECT p.*, 
              (SELECT AVG(r.rating) 
               FROM product_review r 
               WHERE r.productId = p.id) AS average_rating
       FROM products p
       WHERE p.id =?`,
      [id]
    );

    if (!data.length) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).send({
      success: true,
      data: data[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};
