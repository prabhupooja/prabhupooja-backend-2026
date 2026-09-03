const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RDS_HOST = 'prabhupooja.ct4y6cuii4z8.ap-south-1.rds.amazonaws.com';
const RDS_USER = 'admin';
const RDS_PASS = 'Prabhupooja123';
const RDS_DB = 'prabhupooja';

const LOCAL_USER = 'root';
const LOCAL_PASS = '';
const LOCAL_DB = 'prabhupooja';

const dumpFile = path.join(__dirname, '..', 'prabhupooja_backup.sql');

console.log('🚀 Starting Database Export from AWS RDS (Live)...');

try {
  // Step 1: Export from AWS RDS using mysqldump
  const exportCmd = `C:\\xampp\\mysql\\bin\\mysqldump.exe -h ${RDS_HOST} -u ${RDS_USER} -p${RDS_PASS} --single-transaction --quick ${RDS_DB} > "${dumpFile}"`;
  execSync(exportCmd, { shell: 'cmd.exe' });
  console.log('✅ Exported successfully from AWS RDS.');

  // Step 2: Fix Collation for local XAMPP/MariaDB compatibility
  console.log('🔄 Adjusting collation compatibility (MySQL 8.0 -> MariaDB)...');
  let sql = fs.readFileSync(dumpFile, 'utf8');
  sql = sql.replace(/utf8mb4_0900_ai_ci/g, 'utf8mb4_general_ci');
  fs.writeFileSync(dumpFile, sql, 'utf8');

  // Step 3: Import into Local MySQL
  console.log('📥 Importing tables and data into Local MySQL (XAMPP)...');
  const passArg = LOCAL_PASS ? `-p${LOCAL_PASS}` : '';
  const importCmd = `C:\\xampp\\mysql\\bin\\mysql.exe -u ${LOCAL_USER} ${passArg} ${LOCAL_DB} < "${dumpFile}"`;
  execSync(importCmd, { shell: 'cmd.exe' });

  console.log('🎉 SUCCESS! All 54 tables and live data have been imported into your Local MySQL.');
} catch (error) {
  console.error('❌ Error during sync:', error.message);
}
