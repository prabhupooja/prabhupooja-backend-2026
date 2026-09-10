const db = require('../config/db');

async function runMigrations() {
  console.log("=== RUNNING DATABASE MIGRATIONS ===");

  try {
    // 1. Create order_return table if not exists
    const createOrderReturnTable = `
      CREATE TABLE IF NOT EXISTS order_return (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        user_id INT DEFAULT NULL,
        merchant_id VARCHAR(255) DEFAULT NULL,
        product_id VARCHAR(255) DEFAULT NULL,
        amount DECIMAL(10,2) DEFAULT 0.00,
        refund_status VARCHAR(50) DEFAULT 'pending',
        reason TEXT DEFAULT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order_id (order_id),
        INDEX idx_user_id (user_id),
        INDEX idx_refund_status (refund_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await db.query(createOrderReturnTable);
    console.log("✅ Table 'order_return' checked/created successfully.");

    // Add missing columns to order_return if not exists
    const orderReturnCols = [
      { name: "request_type", def: "VARCHAR(50) DEFAULT 'refund'" },
      { name: "upi_id", def: "VARCHAR(255) DEFAULT NULL" },
      { name: "account_holder_name", def: "VARCHAR(255) DEFAULT NULL" },
      { name: "bank_name", def: "VARCHAR(255) DEFAULT NULL" },
      { name: "account_number", def: "VARCHAR(255) DEFAULT NULL" },
      { name: "ifsc_code", def: "VARCHAR(50) DEFAULT NULL" },
      { name: "admin_status", def: "VARCHAR(50) DEFAULT 'pending'" },
      { name: "admin_remarks", def: "TEXT DEFAULT NULL" },
      { name: "payment_receipt", def: "VARCHAR(500) DEFAULT NULL" },
      { name: "transaction_reference", def: "VARCHAR(255) DEFAULT NULL" },
      { name: "replacement_tracking_id", def: "VARCHAR(255) DEFAULT NULL" },
      { name: "replacement_courier", def: "VARCHAR(255) DEFAULT NULL" },
      { name: "replacement_status", def: "VARCHAR(100) DEFAULT NULL" },
      { name: "proof_images", def: "TEXT DEFAULT NULL" },
      { name: "wallet_deducted", def: "TINYINT(1) DEFAULT 0" }
    ];

    const [existingRetCols] = await db.query("SHOW COLUMNS FROM order_return");
    const existingRetColNames = existingRetCols.map(c => c.Field.toLowerCase());

    for (const col of orderReturnCols) {
      if (!existingRetColNames.includes(col.name.toLowerCase())) {
        try {
          await db.query(`ALTER TABLE order_return ADD COLUMN ${col.name} ${col.def}`);
          console.log(`✓ Added column ${col.name} to order_return`);
        } catch (colErr) {
          console.warn(`Note on adding column ${col.name}:`, colErr.message);
        }
      }
    }

    // Ensure orders table has cancelled_by, tracking_number, courier_name
    try {
      const [orderCols] = await db.query("SHOW COLUMNS FROM orders");
      const orderColNames = orderCols.map(c => c.Field.toLowerCase());
      if (!orderColNames.includes("cancelled_by")) {
        await db.query("ALTER TABLE orders ADD COLUMN cancelled_by VARCHAR(50) DEFAULT NULL");
        console.log("✅ Added 'cancelled_by' column to 'orders' table.");
      }
      if (!orderColNames.includes("tracking_number")) {
        await db.query("ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(255) DEFAULT NULL");
        console.log("✅ Added 'tracking_number' column to 'orders' table.");
      }
      if (!orderColNames.includes("courier_name")) {
        await db.query("ALTER TABLE orders ADD COLUMN courier_name VARCHAR(255) DEFAULT NULL");
        console.log("✅ Added 'courier_name' column to 'orders' table.");
      }
    } catch (oErr) {
      console.warn("Note on orders table columns:", oErr.message);
    }

    // 2. Create event_bookings table if not exists
    const createEventBookingsTable = `
      CREATE TABLE IF NOT EXISTS event_bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT DEFAULT NULL,
        event_title VARCHAR(255) DEFAULT NULL,
        user_id INT DEFAULT NULL,
        fullName VARCHAR(255) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        email VARCHAR(255) DEFAULT NULL,
        service VARCHAR(255) NOT NULL,
        poojaDate VARCHAR(100) DEFAULT NULL,
        poojaTime VARCHAR(100) DEFAULT NULL,
        poojaLocation VARCHAR(255) DEFAULT NULL,
        message TEXT DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        adminRemark TEXT DEFAULT NULL,
        adminAssigned VARCHAR(255) DEFAULT NULL,
        panditName VARCHAR(255) DEFAULT NULL,
        paymentStatus VARCHAR(50) DEFAULT 'unpaid',
        paymentId VARCHAR(255) DEFAULT NULL,
        amount DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_event_id (event_id),
        INDEX idx_user_id (user_id),
        INDEX idx_mobile (mobile),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await db.query(createEventBookingsTable);
    console.log("✅ Table 'event_bookings' checked/created successfully.");

    // 3. Create wallet_transactions table if not exists
    const createWalletTransactionsTable = `
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        type ENUM('credit', 'debit') NOT NULL DEFAULT 'credit',
        purpose VARCHAR(255) DEFAULT 'Wallet Recharge',
        payment_id VARCHAR(255) DEFAULT NULL,
        order_id VARCHAR(255) DEFAULT NULL,
        balance_after DECIMAL(10,2) DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'success',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_wallet_user_id (user_id),
        INDEX idx_wallet_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await db.query(createWalletTransactionsTable);
    console.log("✅ Table 'wallet_transactions' checked/created successfully.");

    // 4. Create user_support_ticket table if not exists
    const createSupportTicketsTable = `
      CREATE TABLE IF NOT EXISTS user_support_ticket (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id VARCHAR(100) DEFAULT NULL,
        user_id INT DEFAULT NULL,
        email VARCHAR(255) DEFAULT NULL,
        phone VARCHAR(20) DEFAULT NULL,
        issue_type VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        response TEXT DEFAULT NULL,
        submitted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        response_date DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ticket_user_id (user_id),
        INDEX idx_ticket_id (ticket_id),
        INDEX idx_ticket_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await db.query(createSupportTicketsTable);
    console.log("✅ Table 'user_support_ticket' checked/created successfully.");

    // 5. Ensure prasad_booking has tracking columns
    try {
      const [prasadCols] = await db.query("SHOW COLUMNS FROM prasad_booking");
      const colNames = prasadCols.map(c => c.Field.toLowerCase());
      if (!colNames.includes('status')) {
        await db.query("ALTER TABLE prasad_booking ADD COLUMN status VARCHAR(50) DEFAULT 'confirmed'");
        console.log("✅ Added 'status' column to 'prasad_booking' table.");
      }
      if (!colNames.includes('tracking_carrier')) {
        await db.query("ALTER TABLE prasad_booking ADD COLUMN tracking_carrier VARCHAR(255) DEFAULT NULL");
        console.log("✅ Added 'tracking_carrier' column to 'prasad_booking' table.");
      }
      if (!colNames.includes('tracking_number')) {
        await db.query("ALTER TABLE prasad_booking ADD COLUMN tracking_number VARCHAR(255) DEFAULT NULL");
        console.log("✅ Added 'tracking_number' column to 'prasad_booking' table.");
      }
    } catch (prasadErr) {
      console.warn("Note on prasad_booking table migration:", prasadErr.message);
    }

    // 6. Ensure temple_booking has slot, devotees_count, status, qr_pass_code
    try {
      const [templeCols] = await db.query("SHOW COLUMNS FROM temple_booking");
      const tColNames = templeCols.map(c => c.Field.toLowerCase());
      if (!tColNames.includes('devotees_count')) {
        await db.query("ALTER TABLE temple_booking ADD COLUMN devotees_count INT DEFAULT 1");
      }
      if (!tColNames.includes('slot')) {
        await db.query("ALTER TABLE temple_booking ADD COLUMN slot VARCHAR(100) DEFAULT 'General Darshan'");
      }
      if (!tColNames.includes('status')) {
        await db.query("ALTER TABLE temple_booking ADD COLUMN status VARCHAR(50) DEFAULT 'confirmed'");
      }
      if (!tColNames.includes('qr_pass_code')) {
        await db.query("ALTER TABLE temple_booking ADD COLUMN qr_pass_code VARCHAR(100) DEFAULT NULL");
      }
      console.log("✅ Checked/Updated columns on 'temple_booking' table.");
    } catch (templeErr) {
      console.warn("Note on temple_booking table migration:", templeErr.message);
    }

    // 7. Ensure newletter table has name and created_at columns
    try {
      const [nlCols] = await db.query("SHOW COLUMNS FROM newletter");
      const nlColNames = nlCols.map(c => c.Field.toLowerCase());
      if (!nlColNames.includes('name')) {
        await db.query("ALTER TABLE newletter ADD COLUMN name VARCHAR(255) DEFAULT NULL AFTER id");
        console.log("✅ Added 'name' column to 'newletter' table.");
      }
      if (!nlColNames.includes('created_at')) {
        await db.query("ALTER TABLE newletter ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        console.log("✅ Added 'created_at' column to 'newletter' table.");
      }
    } catch (nlErr) {
      console.warn("Note on newletter table migration:", nlErr.message);
    }

    // 8. Ensure pandit table has speciality, status, rejection_reason
    try {
      const [pCols] = await db.query("SHOW COLUMNS FROM pandit");
      const pColNames = pCols.map(c => c.Field.toLowerCase());
      if (!pColNames.includes('speciality')) {
        await db.query("ALTER TABLE pandit ADD COLUMN speciality VARCHAR(255) DEFAULT NULL");
      }
      if (!pColNames.includes('status')) {
        await db.query("ALTER TABLE pandit ADD COLUMN status VARCHAR(50) DEFAULT 'pending'");
      }
      if (!pColNames.includes('rejection_reason')) {
        await db.query("ALTER TABLE pandit ADD COLUMN rejection_reason TEXT DEFAULT NULL");
      }
      console.log("✅ Checked/Updated columns on 'pandit' table.");
    } catch (pErr) {
      console.warn("Note on pandit table migration:", pErr.message);
    }

    // 9. Ensure yoga_users table has status, time_slot, notes, assigned_pandit_id
    try {
      const [ygCols] = await db.query("SHOW COLUMNS FROM yoga_users");
      const ygColNames = ygCols.map(c => c.Field.toLowerCase());
      if (!ygColNames.includes('status')) {
        await db.query("ALTER TABLE yoga_users ADD COLUMN status VARCHAR(50) DEFAULT 'active'");
      }
      if (!ygColNames.includes('time_slot')) {
        await db.query("ALTER TABLE yoga_users ADD COLUMN time_slot VARCHAR(100) DEFAULT '06:30 AM - 07:30 AM'");
      }
      if (!ygColNames.includes('notes')) {
        await db.query("ALTER TABLE yoga_users ADD COLUMN notes VARCHAR(255) DEFAULT 'Vedic Pranayama & Chakra Healing'");
      }
      if (!ygColNames.includes('assigned_pandit_id')) {
        await db.query("ALTER TABLE yoga_users ADD COLUMN assigned_pandit_id INT DEFAULT NULL");
      }
      console.log("✅ Checked/Updated columns on 'yoga_users' table.");
    } catch (ygErr) {
      console.warn("Note on yoga_users table migration:", ygErr.message);
    }

    // 10. Ensure enquiry table has pandit_id, pandit_name, user_id, status, created_at
    try {
      const [eqCols] = await db.query("SHOW COLUMNS FROM enquiry");
      const eqColNames = eqCols.map(c => c.Field.toLowerCase());
      if (!eqColNames.includes('pandit_id')) {
        await db.query("ALTER TABLE enquiry ADD COLUMN pandit_id INT DEFAULT NULL");
      }
      if (!eqColNames.includes('pandit_name')) {
        await db.query("ALTER TABLE enquiry ADD COLUMN pandit_name VARCHAR(255) DEFAULT NULL");
      }
      if (!eqColNames.includes('user_id')) {
        await db.query("ALTER TABLE enquiry ADD COLUMN user_id INT DEFAULT NULL");
      }
      if (!eqColNames.includes('status')) {
        await db.query("ALTER TABLE enquiry ADD COLUMN status VARCHAR(50) DEFAULT 'Pending'");
      }
      if (!eqColNames.includes('created_at')) {
        await db.query("ALTER TABLE enquiry ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
      }
      console.log("✅ Checked/Updated columns on 'enquiry' table.");
    } catch (eqErr) {
      console.warn("Note on enquiry table migration:", eqErr.message);
    }

    // 11. Ensure ecommerce_banner table and dynamic columns exist
    try {
      const createEcommerceBannerTable = `
        CREATE TABLE IF NOT EXISTS ecommerce_banner (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NULL,
          small_heading VARCHAR(255) NULL,
          subtitle TEXT NULL,
          image VARCHAR(500) NOT NULL,
          background_image VARCHAR(500) NULL,
          offer_title VARCHAR(255) NULL,
          offer_prefix VARCHAR(100) NULL,
          offer_value VARCHAR(100) NULL,
          offer_suffix VARCHAR(100) NULL,
          button_text VARCHAR(100) NULL,
          redirect_url VARCHAR(500) NULL,
          theme TEXT NULL,
          features TEXT NULL,
          badge_enabled TINYINT(1) DEFAULT 1,
          sort_order INT DEFAULT 1,
          status TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;
      await db.query(createEcommerceBannerTable);

      const [ecomCols] = await db.query("SHOW COLUMNS FROM ecommerce_banner");
      const ecomColNames = ecomCols.map(c => c.Field.toLowerCase());

      if (!ecomColNames.includes('title')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN title VARCHAR(255) NULL AFTER id");
        console.log("✅ Added 'title' column to 'ecommerce_banner' table.");
      }
      if (!ecomColNames.includes('small_heading')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN small_heading VARCHAR(255) NULL AFTER title");
        console.log("✅ Added 'small_heading' column to 'ecommerce_banner' table.");
      }
      if (!ecomColNames.includes('subtitle')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN subtitle TEXT NULL AFTER small_heading");
        console.log("✅ Added 'subtitle' column to 'ecommerce_banner' table.");
      }
      if (!ecomColNames.includes('image')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN image VARCHAR(500) NOT NULL AFTER subtitle");
        console.log("✅ Added 'image' column to 'ecommerce_banner' table.");
      }
      if (!ecomColNames.includes('background_image')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN background_image VARCHAR(500) NULL AFTER image");
        console.log("✅ Added 'background_image' column to 'ecommerce_banner' table.");
      }
      if (!ecomColNames.includes('offer_title')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN offer_title VARCHAR(255) NULL AFTER background_image");
        console.log("✅ Added 'offer_title' column to 'ecommerce_banner' table.");
      }
      if (!ecomColNames.includes('offer_prefix')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN offer_prefix VARCHAR(100) NULL AFTER offer_title");
        console.log("✅ Added 'offer_prefix' column to 'ecommerce_banner' table.");
      }
      if (!ecomColNames.includes('offer_value')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN offer_value VARCHAR(100) NULL AFTER offer_prefix");
        console.log("✅ Added 'offer_value' column to 'ecommerce_banner' table.");
      }
      if (!ecomColNames.includes('offer_suffix')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN offer_suffix VARCHAR(100) NULL AFTER offer_value");
        console.log("✅ Added 'offer_suffix' column to 'ecommerce_banner' table.");
      }
      if (!ecomColNames.includes('button_text')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN button_text VARCHAR(100) NULL AFTER offer_suffix");
        console.log("✅ Added 'button_text' column to 'ecommerce_banner' table.");
      }
      if (!ecomColNames.includes('redirect_url')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN redirect_url VARCHAR(500) NULL AFTER button_text");
        console.log("✅ Added 'redirect_url' column to 'ecommerce_banner' table.");
      }
      if (!ecomColNames.includes('theme')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN theme TEXT NULL AFTER redirect_url");
        console.log("✅ Added 'theme' column to 'ecommerce_banner' table.");
      }
      if (!ecomColNames.includes('features')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN features TEXT NULL AFTER theme");
        console.log("✅ Added 'features' column to 'ecommerce_banner' table.");
      }
      if (!ecomColNames.includes('badge_enabled')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN badge_enabled TINYINT(1) DEFAULT 1 AFTER features");
        console.log("✅ Added 'badge_enabled' column to 'ecommerce_banner' table.");
      }
      if (!ecomColNames.includes('sort_order')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN sort_order INT DEFAULT 1 AFTER badge_enabled");
        console.log("✅ Added 'sort_order' column to 'ecommerce_banner' table.");
      }
      if (!ecomColNames.includes('status')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN status TINYINT(1) DEFAULT 1 AFTER sort_order");
        console.log("✅ Added 'status' column to 'ecommerce_banner' table.");
      }
      if (!ecomColNames.includes('created_at')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        console.log("✅ Added 'created_at' column to 'ecommerce_banner' table.");
      }
      if (!ecomColNames.includes('updated_at')) {
        await db.query("ALTER TABLE ecommerce_banner ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        console.log("✅ Added 'updated_at' column to 'ecommerce_banner' table.");
      }

      console.log("✅ Table 'ecommerce_banner' verified/created/updated successfully.");
    } catch (ecomErr) {
      console.warn("Note on ecommerce_banner table migration:", ecomErr.message);
    }

    // 6. Ensure sellers table has all required columns for registration, documents, and dashboard
    try {
      const [sellerCols] = await db.query("SHOW COLUMNS FROM sellers");
      const sellerColNames = sellerCols.map(c => c.Field);

      if (!sellerColNames.includes('city')) {
        await db.query("ALTER TABLE sellers ADD COLUMN city VARCHAR(100) NULL AFTER address");
        console.log("✅ Added 'city' column to 'sellers' table.");
      }
      if (!sellerColNames.includes('state')) {
        await db.query("ALTER TABLE sellers ADD COLUMN state VARCHAR(100) NULL AFTER city");
        console.log("✅ Added 'state' column to 'sellers' table.");
      }
      if (!sellerColNames.includes('pincode')) {
        await db.query("ALTER TABLE sellers ADD COLUMN pincode VARCHAR(20) NULL AFTER state");
        console.log("✅ Added 'pincode' column to 'sellers' table.");
      }
      if (!sellerColNames.includes('business_type')) {
        await db.query("ALTER TABLE sellers ADD COLUMN business_type VARCHAR(100) NULL AFTER pincode");
        console.log("✅ Added 'business_type' column to 'sellers' table.");
      }
      if (!sellerColNames.includes('category')) {
        await db.query("ALTER TABLE sellers ADD COLUMN category VARCHAR(255) NULL AFTER business_type");
        console.log("✅ Added 'category' column to 'sellers' table.");
      }
      if (!sellerColNames.includes('gst_certificate')) {
        await db.query("ALTER TABLE sellers ADD COLUMN gst_certificate VARCHAR(500) NULL AFTER gst");
        console.log("✅ Added 'gst_certificate' column to 'sellers' table.");
      }
      if (!sellerColNames.includes('bank_name')) {
        await db.query("ALTER TABLE sellers ADD COLUMN bank_name VARCHAR(255) NULL AFTER address_proof_status");
        console.log("✅ Added 'bank_name' column to 'sellers' table.");
      }
      if (!sellerColNames.includes('account_holder_name')) {
        await db.query("ALTER TABLE sellers ADD COLUMN account_holder_name VARCHAR(255) NULL AFTER bank_name");
        console.log("✅ Added 'account_holder_name' column to 'sellers' table.");
      }
      if (!sellerColNames.includes('account_number')) {
        await db.query("ALTER TABLE sellers ADD COLUMN account_number VARCHAR(100) NULL AFTER account_holder_name");
        console.log("✅ Added 'account_number' column to 'sellers' table.");
      }
      if (!sellerColNames.includes('ifsc_number')) {
        await db.query("ALTER TABLE sellers ADD COLUMN ifsc_number VARCHAR(50) NULL AFTER account_number");
        console.log("✅ Added 'ifsc_number' column to 'sellers' table.");
      }
      if (!sellerColNames.includes('cancelled_cheque')) {
        await db.query("ALTER TABLE sellers ADD COLUMN cancelled_cheque VARCHAR(500) NULL AFTER ifsc_number");
        console.log("✅ Added 'cancelled_cheque' column to 'sellers' table.");
      }
      if (!sellerColNames.includes('bank_status')) {
        await db.query("ALTER TABLE sellers ADD COLUMN bank_status ENUM('initially', 'pending', 'approved', 'rejected') DEFAULT 'initially' AFTER cancelled_cheque");
        console.log("✅ Added 'bank_status' column to 'sellers' table.");
      }
      if (!sellerColNames.includes('verified')) {
        await db.query("ALTER TABLE sellers ADD COLUMN verified TINYINT(1) DEFAULT 0");
        console.log("✅ Added 'verified' column to 'sellers' table.");
      }
      if (!sellerColNames.includes('status')) {
        await db.query("ALTER TABLE sellers ADD COLUMN status ENUM('pending', 'active', 'suspended', 'rejected') DEFAULT 'pending'");
        console.log("✅ Added 'status' column to 'sellers' table.");
      }
      if (!sellerColNames.includes('updated_at')) {
        await db.query("ALTER TABLE sellers ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        console.log("✅ Added 'updated_at' column to 'sellers' table.");
      }

      console.log("✅ Table 'sellers' verified and updated with all KYC & document columns.");
    } catch (sellerErr) {
      console.warn("Note on sellers table migration:", sellerErr.message);
    }

    // Ensure all active products have verified = 1 so they are live on website
    try {
      await db.query("UPDATE products SET verified = 1 WHERE verified = 0 OR verified IS NULL");
      console.log("✅ Verified all active products in 'products' table (verified = 1).");
    } catch (prodVerErr) {
      console.warn("Note on products verified update:", prodVerErr.message);
    }

    console.log("=== MIGRATIONS COMPLETE ===");
    return true;
  } catch (err) {
    console.error("Migration failed:", err.message);
    throw err;
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigrations;
