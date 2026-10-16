const db = require("../config/db");

async function seedDhanYogGanesha() {
  try {
    console.log("Adding / Updating 'Dhan Yog Ganesha Crystal Idol | Natural crystals'...");

    const productName = "Dhan Yog Ganesha Crystal Idol | Natural crystals";
    const urlSlug = "dhan-yog-ganesha-crystal-idol";
    const productType = "Idol/Murti";
    const category = "Home Decor";
    const subcategory = "Spiritual Idol";
    const brand = "PrabhuPooja";
    const occasion = "Ganesh Chaturthi, Housewarming, Business Opening, Festive Gifting";
    const suitableFor = "Home, Office, Mandir, Workspace, Sacred Space";
    
    const shortDescription = "Dhan Yog Ganesha Crystal Idol featuring Pyrite, Tiger Eye, Green Aventurine and Citrine natural crystals, designed for spiritual and contemporary décor and traditionally associated with prosperity, confidence, growth, luck and positive intentions.";
    
    const mrpPrice = 899.00;
    const offerPrice = 699.00;
    const discountPercent = 22;
    const stockQuantity = 50; // Standard initial inventory stock
    const stockStatus = "In Stock";
    const lowStockThreshold = 10;
    const sku = "PP-DHAN-YOG-GANESHA-CRYSTAL-IDOL-001";
    
    const estimatedDeliveryDays = "3 - 5 Days";
    const dispatchTime = "Within 24 - 48 Hours";
    const deliveryCharge = 0; // Free Shipping
    const shippingClass = "Fragile/Sacred Item Care";
    
    const material = "Pyrite, Tiger Eye, Green Aventurine & Citrine Natural Crystals";
    const colour = "Multicolor";
    const style = "Dhan Yog Ganesha Crystal Idol";
    const specialFeature = "Ganesha Crystal Idol Design | Pyrite, Tiger Eye, Green Aventurine & Citrine Crystal Combination | Spiritual and Contemporary Décor | Handcrafted in India | Lab-Certified Genuine Natural Stones | Energised with Vedic Mantras";
    
    const packageIncludes = "1 × Dhan Yog Ganesha Crystal Idol";
    
    const productHighlights = [
      "Dhan Yog Ganesha Crystal Idol",
      "Features Pyrite natural crystal",
      "Features Tiger Eye natural crystal",
      "Features Green Aventurine natural crystal",
      "Features Citrine natural crystal",
      "Traditionally associated with prosperity and abundance",
      "Traditionally associated with confidence and growth",
      "Traditionally associated with luck and positive intentions",
      "Designed for spiritual and contemporary décor",
      "Suitable for home",
      "Suitable for office and workspace",
      "Suitable for mandir and sacred spaces",
      "Suitable for Ganesh Chaturthi",
      "Suitable for housewarming",
      "Suitable for business openings",
      "Suitable for festive gifting",
      "Handcrafted in India",
      "Lab-certified genuine natural stones",
      "Energised with Vedic mantras"
    ].join("\n");
    
    const benefits = "Pyrite is traditionally associated with prosperity, wealth and positive opportunities. Tiger Eye is traditionally associated with confidence, focus and determination. Green Aventurine is traditionally associated with growth, abundance and opportunity. Citrine is traditionally associated with prosperity, abundance and positive intentions. The Dhan Yog Ganesha design combines these traditional gemstone associations with the auspicious symbolism of Lord Ganesha. The idol can be used as a symbolic spiritual and decorative piece in a home, office, mandir or sacred space. Any spiritual or gemstone-related benefits are based on traditional beliefs and should not be considered scientifically proven effects.";
    
    const usageAndCareInstructions = [
      "Place the Ganesha crystal idol securely on a clean and stable surface.",
      "Suitable for placement in a home, office, mandir, workspace or sacred space.",
      "Keep the idol away from excessive water and moisture.",
      "Clean gently with a soft, dry cloth.",
      "Avoid using harsh chemicals or abrasive cleaners.",
      "Handle the crystal idol carefully to prevent chips, scratches or damage.",
      "Keep the idol in a clean and dry place when not in use."
    ].join("\n");
    
    const description = "Dhan Yog Ganesha Crystal Idol beautifully combines the divine symbolism of Lord Ganesha with a carefully selected blend of Pyrite, Tiger Eye, Green Aventurine and Citrine natural crystals. These crystals are traditionally associated with prosperity, confidence, growth, luck and positive intentions, making the idol a meaningful addition to spiritual and contemporary décor.\n\nThe Ganesha crystal idol is suitable for placement in the home, office, mandir, workspace or other sacred spaces. It is also a thoughtful choice for Ganesh Chaturthi, housewarming, business openings and festive gifting.\n\nThe product is handcrafted in India and the stones are lab-certified genuine, carefully selected and verified. It is also energised with Vedic mantras before dispatch.\n\nAs the product is handcrafted using natural crystals, slight variations in colour, texture, size and appearance may occur. These natural variations make each piece unique. Any spiritual, gemstone or prosperity-related associations mentioned for this product are based on traditional beliefs and should not be considered medical, scientific or guaranteed effects.";
    
    const disclaimer = "This product is intended for spiritual, cultural and decorative purposes. Any benefits associated with Lord Ganesha symbolism, Pyrite, Tiger Eye, Green Aventurine, Citrine, prosperity, confidence, growth, luck or positive energy are based on traditional beliefs and should not be considered medical, scientific or guaranteed results. Natural crystals may vary slightly in colour, texture, size and appearance. Since the product is handcrafted, minor variations may occur and are not considered defects.";
    
    const isBestseller = 1;
    const isFeatured = 0;
    const returnAvailable = 1;
    const replacementAvailable = 1;
    const replacementPeriod = 7;
    
    const seoTitle = "Dhan Yog Ganesha Crystal Idol | Natural Crystals | PrabhuPooja";
    const seoDescription = "Shop the Dhan Yog Ganesha Crystal Idol by PrabhuPooja, featuring Pyrite, Tiger Eye, Green Aventurine and Citrine natural crystals for spiritual and contemporary décor.";
    const searchKeywords = "Dhan Yog Ganesha Idol, Ganesha Crystal Idol, Ganesha Idol, Crystal Ganesha Idol, Natural Crystal Ganesha, Dhan Yog Ganesha, Pyrite Ganesha, Tiger Eye Ganesha, Green Aventurine Ganesha, Citrine Ganesha, Crystal Idol, Spiritual Idol, Ganesh Idol, Home Decor, Spiritual Home Decor, Mandir Decor, Office Decor, Ganesha Decor, Ganesh Chaturthi Gift, Housewarming Gift, Business Opening Gift, Spiritual Gift, Natural Crystal Idol, Lab Certified Crystals, PrabhuPooja";
    const tags = searchKeywords;
    const countryOfOrigin = "India";
    
    const images = [
      "https://shop.prabhupooja.com/cdn/shop/files/ChatGPTImageSep10_2026_01_12_47AM.webp?v=1788983617",
      "https://shop.prabhupooja.com/cdn/shop/files/ChatGPTImageSep10_2026_01_12_47AM.webp?v=1788983617"
    ];

    // Check if product exists by url_slug or productName
    const [existing] = await db.query(
      "SELECT id FROM products WHERE url_slug = ? OR productName LIKE ?",
      [urlSlug, "%Dhan Yog Ganesha%"]
    );

    if (existing && existing.length > 0) {
      const id = existing[0].id;
      console.log(`Product found with ID ${id}. Updating record...`);
      await db.query(
        `UPDATE products SET 
          productName = ?, theme = ?, category = ?, subcategory = ?, productType = ?, brand = ?, colour = ?, 
          style = ?, material = ?, specialFeature = ?, noOfItems = ?, stock = ?, stock_status = ?,
          low_stock_threshold = ?, price = ?, offerPrice = ?, discount_percent = ?, delivery_charge = ?,
          short_description = ?, description = ?, ProductHighlights = ?, package_includes = ?, 
          Benefits = ?, UsageAndCareInstructions = ?, disclaimer = ?, shipping_class = ?, 
          estimated_delivery_days = ?, dispatch_time = ?, return_available = ?, replacement_available = ?, 
          replacement_period = ?, seo_title = ?, seo_description = ?, url_slug = ?, search_keywords = ?, 
          tags = ?, is_featured = ?, is_bestseller = ?, occasion = ?, suitable_for = ?, country_of_origin = ?,
          ProductCode = ?, image = ?, isDeleted = 0
         WHERE id = ?`,
        [
          productName, category, category, subcategory, productType, brand, colour,
          style, material, specialFeature, stockQuantity, stockQuantity, stockStatus,
          lowStockThreshold, mrpPrice, offerPrice, discountPercent, deliveryCharge,
          shortDescription, description, productHighlights, packageIncludes,
          benefits, usageAndCareInstructions, disclaimer, shippingClass,
          estimatedDeliveryDays, dispatchTime, returnAvailable, replacementAvailable,
          replacementPeriod, seoTitle, seoDescription, urlSlug, searchKeywords,
          tags, isFeatured, isBestseller, occasion, suitableFor, countryOfOrigin,
          sku, JSON.stringify(images), id
        ]
      );
      console.log(`Product ID ${id} updated successfully!`);
    } else {
      console.log("Inserting new product record...");
      const [insertResult] = await db.query(
        `INSERT INTO products (
          productName, theme, category, subcategory, productType, brand, colour, style, material, 
          specialFeature, noOfItems, stock, stock_status, low_stock_threshold, price, offerPrice, 
          discount_percent, delivery_charge, short_description, description, 
          ProductHighlights, package_includes, Benefits, UsageAndCareInstructions, disclaimer, 
          shipping_class, estimated_delivery_days, dispatch_time, return_available, replacement_available, 
          replacement_period, seo_title, seo_description, url_slug, search_keywords, tags, is_featured, 
          is_bestseller, occasion, suitable_for, country_of_origin, ProductCode, image, merchantId, 
          verified, isDeleted, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, NOW()
        )`,
        [
          productName, category, category, subcategory, productType, brand, colour, style, material,
          specialFeature, stockQuantity, stockQuantity, stockStatus, lowStockThreshold, mrpPrice, offerPrice,
          discountPercent, deliveryCharge, shortDescription, description,
          productHighlights, packageIncludes, benefits, usageAndCareInstructions, disclaimer,
          shippingClass, estimatedDeliveryDays, dispatchTime, returnAvailable, replacementAvailable,
          replacementPeriod, seoTitle, seoDescription, urlSlug, searchKeywords, tags, isFeatured,
          isBestseller, occasion, suitableFor, countryOfOrigin, sku, JSON.stringify(images)
        ]
      );
      console.log(`Product created successfully with ID ${insertResult.insertId}!`);
    }
  } catch (err) {
    console.error("Error seeding Dhan Yog Ganesha:", err);
  } finally {
    process.exit(0);
  }
}

seedDhanYogGanesha();
