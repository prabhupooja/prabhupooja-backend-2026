const db = require('../config/db');

async function createActivityLogsTable() {
  console.log("=== CREATING USER ACTIVITY LOGS TABLE ===");

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS \`user_activity_logs\` (
      \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
      \`user_id\` INT NULL,
      \`user_type\` ENUM('customer', 'pandit', 'agent', 'admin', 'guest') DEFAULT 'guest',
      \`session_id\` VARCHAR(100) NOT NULL,
      \`event_type\` VARCHAR(50) NOT NULL,
      \`page_url\` VARCHAR(500) NOT NULL,
      \`page_title\` VARCHAR(255) NULL,
      \`page_image\` VARCHAR(500) NULL,
      \`action_name\` VARCHAR(100) NULL,
      \`target_id\` VARCHAR(100) NULL,
      \`scroll_depth\` SMALLINT DEFAULT 0,
      \`time_spent_seconds\` INT DEFAULT 0,
      \`referrer_url\` VARCHAR(500) NULL,
      \`device_type\` VARCHAR(50) NULL,
      \`browser\` VARCHAR(100) NULL,
      \`ip_address\` VARCHAR(50) NULL,
      \`user_agent\` VARCHAR(500) NULL,
      \`metadata\` JSON NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_user_created\` (\`user_id\`, \`created_at\`),
      INDEX \`idx_session_created\` (\`session_id\`, \`created_at\`),
      INDEX \`idx_event_type\` (\`event_type\`),
      INDEX \`idx_created_at\` (\`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await db.query(createTableQuery);
    console.log("✅ Table 'user_activity_logs' created/verified successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating table:", error);
    process.exit(1);
  }
}

createActivityLogsTable();
