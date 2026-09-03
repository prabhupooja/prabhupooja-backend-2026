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

    // 3. Ensure newletter table has name and created_at columns
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
