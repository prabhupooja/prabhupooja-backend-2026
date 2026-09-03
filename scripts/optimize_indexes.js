const db = require('../config/db');

async function optimizeIndexes() {
  console.log("⚡ Starting Database Index Optimization...");

  const indexes = [
    { table: 'temple_booking', indexName: 'idx_tb_user_temple', columns: '(user_id, temple_id)' },
    { table: 'temple_booking', indexName: 'idx_tb_puja_date', columns: '(puja_date)' },
    { table: 'puja_booking', indexName: 'idx_pb_user_puja', columns: '(userid, pujaid)' },
    { table: 'puja_booking', indexName: 'idx_pb_bookingdate', columns: '(bookingdate)' },
    { table: 'orders', indexName: 'idx_orders_user_id', columns: '(user_id)' },
    { table: 'orders', indexName: 'idx_orders_order_id', columns: '(order_id)' },
    { table: 'pandit', indexName: 'idx_pandit_role_verified', columns: '(role, verified)' },
    { table: 'pandit', indexName: 'idx_pandit_mobile', columns: '(mobile)' },
    { table: 'users', indexName: 'idx_users_mobile', columns: '(mobile)' },
    { table: 'users', indexName: 'idx_users_email', columns: '(email)' },
    { table: 'cart', indexName: 'idx_cart_user_id', columns: '(user_id)' },
    { table: 'temple', indexName: 'idx_temple_status', columns: '(status)' },
    { table: 'prasad_booking', indexName: 'idx_prasad_user', columns: '(user_id)' }
  ];

  for (const item of indexes) {
    try {
      // Check if table exists
      const [tableCheck] = await db.query(`SHOW TABLES LIKE ?`, [item.table]);
      if (tableCheck.length === 0) {
        console.log(`Table ${item.table} does not exist, skipping.`);
        continue;
      }

      // Check if index already exists
      const [indexCheck] = await db.query(`SHOW INDEX FROM \`${item.table}\` WHERE Key_name = ?`, [item.indexName]);
      if (indexCheck.length > 0) {
        console.log(`Index ${item.indexName} on ${item.table} already exists.`);
        continue;
      }

      console.log(`Creating index ${item.indexName} on ${item.table} ${item.columns}...`);
      await db.query(`ALTER TABLE \`${item.table}\` ADD INDEX \`${item.indexName}\` ${item.columns}`);
      console.log(`✅ Index ${item.indexName} created successfully.`);
    } catch (err) {
      console.log(`ℹ️ Notice on ${item.table} (${item.indexName}):`, err.message);
    }
  }

  console.log("🎉 Database indexing optimization completed!");
  process.exit(0);
}

optimizeIndexes().catch(err => {
  console.error("Index optimization error:", err);
  process.exit(1);
});
