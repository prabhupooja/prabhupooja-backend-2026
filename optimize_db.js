const db = require("./config/db");

const targetIndexes = [
  // Table, IndexName, Column(s)
  { table: "users", name: "idx_users_mobile", columns: "(mobile)" },
  { table: "users", name: "idx_users_email", columns: "(email)" },
  { table: "pandit", name: "idx_pandit_mobile", columns: "(mobile)" },
  { table: "prasad", name: "idx_prasad_temple_id", columns: "(temple_id)" },
  { table: "prasad_booking", name: "idx_prasad_booking_userid", columns: "(userid)" },
  { table: "prasad_booking", name: "idx_prasad_booking_date", columns: "(booking_date DESC)" },
  { table: "prasad_booking", name: "idx_prasad_booking_status", columns: "(status)" },
  { table: "pooja_booking", name: "idx_pooja_booking_user", columns: "(user_id)" },
  { table: "pooja_booking", name: "idx_pooja_booking_pandit", columns: "(pandit_id)" },
  { table: "pooja_booking", name: "idx_pooja_booking_date", columns: "(booking_date DESC)" },
  { table: "products", name: "idx_products_merchant", columns: "(merchantId)" },
  { table: "products", name: "idx_products_deleted", columns: "(isDeleted)" },
  { table: "products", name: "idx_products_created", columns: "(created_at DESC)" },
  { table: "cart", name: "idx_cart_userid", columns: "(user_id)" },
  { table: "cart", name: "idx_cart_productid", columns: "(productId)" },
  { table: "orders", name: "idx_orders_user", columns: "(userId)" },
  { table: "orders", name: "idx_orders_status", columns: "(status)" },
  { table: "orders", name: "idx_orders_created", columns: "(createdAt DESC)" },
  { table: "category", name: "idx_category_name", columns: "(name)" },
];


async function applyIndexes() {
  console.log("🚀 Starting database index optimization...");
  let createdCount = 0;
  let skippedCount = 0;

  for (const item of targetIndexes) {
    try {
      // Check if table exists
      const [tableCheck] = await db.query(
        `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [item.table]
      );

      if (!tableCheck || tableCheck.length === 0) {
        // Table doesn't exist in this db instance, skip
        continue;
      }

      // Check if index already exists
      const [indexCheck] = await db.query(
        `SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
        [item.table, item.name]
      );

      if (indexCheck && indexCheck.length > 0) {
        skippedCount++;
        continue;
      }

      // Create index
      await db.query(`CREATE INDEX ${item.name} ON ${item.table} ${item.columns}`);
      console.log(`✅ Created index: ${item.name} on table ${item.table}`);
      createdCount++;
    } catch (err) {
      // Table column might not exist or slightly different schema; log warning and continue
      console.warn(`⚠️ Note on ${item.table} (${item.name}): ${err.message}`);
    }
  }

  console.log(`🎉 Index Optimization Finished: ${createdCount} created, ${skippedCount} already existed.`);
  process.exit(0);
}

applyIndexes().catch((err) => {
  console.error("Index script error:", err);
  process.exit(1);
});
