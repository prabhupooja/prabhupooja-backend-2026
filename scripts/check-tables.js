const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function checkCodeVsDb() {
  const controllersDir = path.join(__dirname, '..', 'Controllers');
  const files = fs.readdirSync(controllersDir);

  const tableRegex = /(?:FROM|INTO|UPDATE|JOIN|TABLE)\s+[`]?([a-zA-Z0-9_]+)[`]?/gi;
  const usedTables = new Set();

  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    const content = fs.readFileSync(path.join(controllersDir, file), 'utf8');
    let match;
    while ((match = tableRegex.exec(content)) !== null) {
      const tbl = match[1].toLowerCase();
      // Filter out SQL keywords
      if (!['select', 'where', 'set', 'values', 'if', 'not', 'exists', 'null', 'default'].includes(tbl)) {
        usedTables.add(tbl);
      }
    }
  }

  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'prabhupooja'
  });

  const [dbTablesRows] = await conn.query('SHOW TABLES');
  const dbTables = new Set(dbTablesRows.map(r => Object.values(r)[0].toLowerCase()));

  console.log('--- DATABASE VS CODE COMPARISON ---');
  const missingInDb = [];
  const presentInBoth = [];

  for (const tbl of Array.from(usedTables).sort()) {
    if (dbTables.has(tbl)) {
      presentInBoth.push(tbl);
    } else {
      missingInDb.push(tbl);
    }
  }

  console.log('\n✅ Tables present in Code AND Database:', presentInBoth);
  console.log('\n⚠️ Tables referenced in Code but MISSING in Database:', missingInDb);

  await conn.end();
}

checkCodeVsDb().catch(console.error);
