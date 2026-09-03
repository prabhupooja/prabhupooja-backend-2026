const db = require('../config/db');

exports.create = async (req, res) => {
    const { user_id, productId, quantity } = req.body;
    console.log(user_id, productId, quantity);

    if (!user_id || !productId || quantity == null) {
        return res.status(400).send({
            success: false,
            message: "All fields are required",
        });
    }

    try {
        // Check if product already exists in the cart
        const [existingCartItem] = await db.query(
            `SELECT quantity FROM cart WHERE user_id = ? AND productId = ?`,
            [user_id, productId]
        );

        if (existingCartItem.length > 0) {
            // If product exists, update the quantity
            await db.query(
                `UPDATE cart SET quantity = quantity + ?, created_at = NOW() WHERE user_id = ? AND productId = ?`,
                [quantity, user_id, productId]
            );

            return res.status(200).send({
                success: true,
                message: "Cart updated successfully",
            });
        } else {
            // If product does not exist, insert a new row
            await db.query(
                `INSERT INTO cart (user_id, productId, quantity, created_at) VALUES (?, ?, ?, NOW())`,
                [user_id, productId, quantity]
            );

            return res.status(201).send({
                success: true,
                message: "New product added to cart successfully",
            });
        }
    } catch (error) {
        console.error("Database Error:", error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
        });
    }
};



exports.getAll = async (req, res) => {
    try {
        // Fetch all carts that are not deleted
        const [carts] = await db.query(`SELECT * FROM cart `);

        if (!carts || !carts.length) {
            return res.status(200).send({
                success: true,
                message: "No carts found",
                data: []
            });
        }

        // Process each cart to populate product details
        const cartDetails = await Promise.all(
            carts.map(async (cart) => {
                let products = [];

                // Check if the products field is valid JSON
                try {
                    products = cart.products ? JSON.parse(cart.products) : [];
                } catch (err) {
                    products = []; // Fallback to an empty array
                }

                // Fetch product details for each productId in the cart
                const detailedProducts = await Promise.all(
                    products.map(async (product) => {
                        const [productDetails] = await db.query(
                            `SELECT productName, image, price 
                             FROM products 
                             WHERE id = ?`,
                            [product.productId]
                        );

                        return {
                            ...product,
                            ...(productDetails && productDetails[0] ? productDetails[0] : {})
                        };
                    })
                );

                return {
                    ...cart,
                    products: detailedProducts
                };
            })
        );

        return res.status(200).send({
            success: true,
            data: cartDetails
        });
    } catch (error) {
        console.error("Cart getAll Error:", error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};

exports.getCartItemsByUserId = async (req, res) => {
    const { user_id } = req.params;

    if (!user_id) {
        return res.status(400).send({
            success: false,
            message: "User ID is required",
        });
    }

    try {
        const [data] = await db.query(
            `SELECT 
                c.id,
                c.productId, 
                c.quantity, 
                p.productName, 
                p.image,
                p.merchantId, 
                p.offerPrice 
            FROM cart c
            INNER JOIN products p ON c.productId = p.id
            WHERE c.user_id = ?`,
            [user_id]
        );

        if (!data || data.length === 0) {
            return res.status(200).send({
                success: true,
                message: "No cart items found for this user",
                data: [],
            });
        }

        return res.status(200).send({
            success: true,
            data: data,
        });
    } catch (error) {
        console.error("Database Error:", error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
        });
    }
};

exports.getById = async (req, res) => {
    const { id } = req.params;

    try {
        const [data] = await db.query(`SELECT * FROM cart WHERE id = ?`, [id]);

        if (!data || !data.length) {
            return res.status(404).send({
                success: false,
                message: "Cart not found"
            });
        }

        return res.status(200).send({
            success: true,
            data: data[0]
        });
    } catch (error) {
        console.error("Cart getById Error:", error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { user_id, products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).send({
            success: false,
            message: "A non-empty array of products is required."
        });
    }

    try {

        const data = await db.query(`SELECT * FROM cart WHERE id = ? `, [id]);

        if (!data.length) {
            return res.status(404).send({
                success: false,
                message: "Cart not found"
            });
        }

        const productsJSON = JSON.stringify(products);


        await db.query(
            `UPDATE cart SET user_id = ?, products = ?, updated_at = NOW() WHERE id = ?`,
            [user_id || data[0].user_id, productsJSON, id]
        );

        return res.status(200).send({
            success: true,
            message: "Cart updated successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    console.log("Deleting cart id:", id);

    try {
        const [rows] = await db.query(`SELECT * FROM cart WHERE productId = ?`, [id]);
        if (!rows.length) {
            return res.status(404).send({
                success: false,
                message: "Cart not found"
            });
        }

        const [result] = await db.query(`DELETE FROM cart WHERE productId = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(400).send({
                success: false,
                message: "Failed to delete cart"
            });
        }

        return res.status(200).send({
            success: true,
            message: "Cart deleted successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};
exports.createOrUpdateCart = async (req, res) => {
    const { user_id, products } = req.body;
    if (!user_id || !products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).send({
            success: false,
            message: "User ID and a non-empty array of products are required."
        });
    }

    try {

        const existingCart = await db.query(`SELECT * FROM cart WHERE user_id = ? AND isDeleted = 0`, [user_id]);
        console.log("Existing Cart:", existingCart);
        let currentProducts = [];

        if (existingCart.length > 0) {

            const existingProducts = existingCart[0].products;

            if (existingProducts) {

                try {
                    currentProducts = JSON.parse(existingProducts);
                } catch (error) {
                    console.error("Error parsing existing cart products:", error);
                    return res.status(500).send({
                        success: false,
                        message: "Error processing the existing cart data."
                    });
                }
            } else {

                console.warn("Existing cart products are undefined, initializing as empty array.");
                currentProducts = [];
            }
        }


        products.forEach((newProduct) => {
            const index = currentProducts.findIndex(p => p.productId === newProduct.productId);
            if (index !== -1) {
                currentProducts[index].quantity += newProduct.quantity;
            } else {

                currentProducts.push(newProduct);
            }
        });

        await db.query(
            `INSERT INTO cart (user_id, products, created_at) 
             VALUES (?, ?, NOW()) 
             ON DUPLICATE KEY UPDATE products = ?, updated_at = NOW()`,
            [user_id, JSON.stringify(currentProducts), JSON.stringify(currentProducts)]
        );

        return res.status(200).send({
            success: true,
            message: existingCart.length > 0 ? "Cart updated successfully" : "Cart created successfully"
        });
    } catch (error) {
        console.error("Error in createOrUpdateCart:", error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};

exports.updateQuantity = async (req, res) => {
    const { user_id, productId, action } = req.body;

    if (!user_id || !productId || !action) {
        return res.status(400).send({
            success: false,
            message: "All fields are required",
        });
    }

    try {
        // Check if the product exists in the cart
        const [existingCartItem] = await db.query(
            `SELECT quantity FROM cart WHERE user_id = ? AND productId = ?`,
            [user_id, productId]
        );

        if (existingCartItem.length === 0) {
            return res.status(404).send({
                success: false,
                message: "Product not found in cart",
            });
        }

        let newQuantity = existingCartItem[0].quantity;

        if (action === "increment") {
            newQuantity += 1;
        } else if (action === "decrement") {
            newQuantity -= 1;
            if (newQuantity <= 0) {
                // If quantity becomes 0, remove the item from cart
                await db.query(
                    `DELETE FROM cart WHERE user_id = ? AND productId = ?`,
                    [user_id, productId]
                );
                return res.status(200).send({
                    success: true,
                    message: "Product removed from cart",
                });
            }
        } else {
            return res.status(400).send({
                success: false,
                message: "Invalid action, use 'increment' or 'decrement'",
            });
        }

        // Update quantity in the cart
        await db.query(
            `UPDATE cart SET quantity = ?, created_at = NOW() WHERE user_id = ? AND productId = ?`,
            [newQuantity, user_id, productId]
        );

        return res.status(200).send({
            success: true,
            message: "Cart updated successfully",
            quantity: newQuantity,
        });
    } catch (error) {
        console.error("Database Error:", error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
        });
    }
};
