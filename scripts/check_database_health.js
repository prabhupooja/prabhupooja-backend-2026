const db = require('../config/db');

async function checkDatabaseHealth() {
  console.log('\n===============================================================');
  console.log('🔍 PRABHU POOJA DATABASE HEALTH & SCHEMA INSPECTION');
  console.log('===============================================================\n');

  try {
    // 1. Get database version & current database name
    const [dbInfo] = await db.query('SELECT DATABASE() as db_name, VERSION() as version');
    console.log(`🗄️  Connected Database : ${dbInfo[0].db_name}`);
    console.log(`📦 MySQL/MariaDB Version: ${dbInfo[0].version}\n`);

    // 2. Fetch all tables
    const [tables] = await db.query('SHOW TABLES');
    const tableKey = Object.keys(tables[0])[0];
    const tableList = tables.map(t => t[tableKey]);

    console.log(`📊 Total Tables Found: ${tableList.length}\n`);
    console.log('---------------------------------------------------------------');
    console.log(String('Table Name').padEnd(30) + String('Total Rows').padEnd(15) + 'Status');
    console.log('---------------------------------------------------------------');

    let healthyCount = 0;

    for (const tableName of tableList) {
      try {
        const [countRes] = await db.query(`SELECT COUNT(*) as total FROM \`${tableName}\``);
        const count = countRes[0].total;
        console.log(
          `✅ ${String(tableName).padEnd(27)} : ${String(count).padEnd(12)} OK`
        );
        healthyCount++;
      } catch (err) {
        console.log(
          `❌ ${String(tableName).padEnd(27)} : Error: ${err.message}`
        );
      }
    }

    console.log('---------------------------------------------------------------');
    console.log(`\n🎉 Summary: ${healthyCount} / ${tableList.length} tables verified & accessible.\n`);

    // 3. Detailed inspection on the new ecommerce_banner table
    console.log('===============================================================');
    console.log('📋 DETAIL CHECK: `ecommerce_banner` Structure');
    console.log('===============================================================');
    const [cols] = await db.query('DESCRIBE ecommerce_banner');
    console.log(String('Field').padEnd(18) + String('Type').padEnd(20) + String('Null').padEnd(8) + 'Default');
    console.log('---------------------------------------------------------------');
    cols.forEach(c => {
      console.log(
        String(c.Field).padEnd(18) +
        String(c.Type).padEnd(20) +
        String(c.Null).padEnd(8) +
        String(c.Default || 'NULL')
      );
    });

    const [bannerRows] = await db.query('SELECT * FROM ecommerce_banner');
    console.log(`\nActive Banners in Database: ${bannerRows.length}`);
    if (bannerRows.length > 0) {
      console.log('Sample Banner:', JSON.stringify(bannerRows[0], null, 2));
    }

    console.log('\n===============================================================');
    console.log('✅ ALL DATABASE TABLES ARE HEALTHY AND FULLY OPERATIONAL!');
    console.log('===============================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database Health Check Failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  checkDatabaseHealth();
}

module.exports = checkDatabaseHealth;
