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
