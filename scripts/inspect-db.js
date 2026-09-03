const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'prabhupooja'
    });

    const [tables] = await conn.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log(`Total Tables Found: ${tableNames.length}\n`);

    const results = [];
    for (const name of tableNames) {
      const [[{ count }]] = await conn.query(`SELECT COUNT(*) as count FROM \`${name}\``);
      results.push({ 'Table Name': name, 'Total Rows': count });
    }

    console.table(results);
    await conn.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
