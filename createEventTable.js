const db = require('./config/db');

async function createEventTable() {
    try {
        console.log("Creating/updating latest_events table...");
        const tableQuery = `
            CREATE TABLE IF NOT EXISTS latest_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tag VARCHAR(255) DEFAULT NULL,
                title VARCHAR(255) NOT NULL,
                description LONGTEXT DEFAULT NULL,
                short_description TEXT DEFAULT NULL,
                date_info VARCHAR(255) DEFAULT NULL,
                start_date VARCHAR(255) DEFAULT NULL,
                end_date VARCHAR(255) DEFAULT NULL,
                event_time VARCHAR(255) DEFAULT NULL,
                location VARCHAR(255) DEFAULT NULL,
                venue VARCHAR(255) DEFAULT NULL,
                special_pooja VARCHAR(255) DEFAULT NULL,
                service_type VARCHAR(255) DEFAULT NULL,
                website VARCHAR(500) DEFAULT NULL,
                registration_link VARCHAR(500) DEFAULT NULL,
                image VARCHAR(500) DEFAULT NULL,
                video_url VARCHAR(500) DEFAULT NULL,
                highlights TEXT DEFAULT NULL,
                event_type VARCHAR(50) DEFAULT 'latest',
                is_past TINYINT(1) DEFAULT 0,
                status VARCHAR(50) DEFAULT 'active',
                is_featured TINYINT(1) DEFAULT 0,
                view_count INT DEFAULT 0,
                attendees_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_event_type (event_type),
                INDEX idx_is_past (is_past),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await db.query(tableQuery);
        console.log("✓ latest_events table ready");

        // Safely check & add any missing columns if table already existed previously
        const columnsToAdd = [
            { name: "short_description", definition: "TEXT DEFAULT NULL" },
            { name: "event_time", definition: "VARCHAR(255) DEFAULT NULL" },
            { name: "location", definition: "VARCHAR(255) DEFAULT NULL" },
            { name: "venue", definition: "VARCHAR(255) DEFAULT NULL" },
            { name: "registration_link", definition: "VARCHAR(500) DEFAULT NULL" },
            { name: "website", definition: "VARCHAR(500) DEFAULT NULL" },
            { name: "video_url", definition: "VARCHAR(500) DEFAULT NULL" },
            { name: "highlights", definition: "TEXT DEFAULT NULL" },
            { name: "event_type", definition: "VARCHAR(50) DEFAULT 'latest'" },
            { name: "is_past", definition: "TINYINT(1) DEFAULT 0" },
            { name: "status", definition: "VARCHAR(50) DEFAULT 'active'" },
            { name: "is_featured", definition: "TINYINT(1) DEFAULT 0" },
            { name: "view_count", definition: "INT DEFAULT 0" },
            { name: "attendees_count", definition: "INT DEFAULT 0" },
            { name: "updated_at", definition: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" }
        ];

        const [existingCols] = await db.query("SHOW COLUMNS FROM latest_events");
        const existingColNames = existingCols.map(c => c.Field.toLowerCase());

        for (const col of columnsToAdd) {
            if (!existingColNames.includes(col.name.toLowerCase())) {
                try {
                    await db.query(`ALTER TABLE latest_events ADD COLUMN ${col.name} ${col.definition}`);
                    console.log(`✓ Added missing column: ${col.name}`);
                } catch (colErr) {
                    console.warn(`Note on adding column ${col.name}:`, colErr.message);
                }
            }
        }

        // Create or update VIEW events for maximum flexibility
        try {
            await db.query(`CREATE OR REPLACE VIEW events AS SELECT * FROM latest_events`);
            console.log("✓ events view synced with latest_events");
        } catch (vErr) {
            console.warn("View creation note:", vErr.message);
        }

        // Check if table has any events, if empty seed 2 sample events (1 latest, 1 past)
        const [rows] = await db.query("SELECT COUNT(*) as count FROM latest_events");
        if (rows[0].count === 0) {
            console.log("Seeding initial starter events...");
            await db.query(`
                INSERT INTO latest_events 
                (tag, title, description, short_description, date_info, start_date, end_date, location, event_type, is_past, status, image)
                VALUES 
                (
                    'Maha Utsav',
                    'Grand Maha Shivratri Rudrabhishek & Bhajan Sandhya',
                    'Join us for the divine celebration of Maha Shivratri with continuous Rudrabhishek, Vedic chanting, special aarti, and spiritual discourses by revered pandits.',
                    'Annual divine celebration of Maha Shivratri with 24-hour Akhand Rudrabhishek.',
                    '18th - 19th September 2026',
                    '2026-09-18',
                    '2026-09-19',
                    'Kashi Vishwanath Complex, Varanasi & Live Online',
                    'latest',
                    0,
                    'active',
                    'https://images.unsplash.com/photo-1609358905581-e5382c473950?auto=format&fit=crop&w=800&q=80'
                ),
                (
                    'Special Puja',
                    'Shravan Somwar Akhand Mahapuja 2025',
                    'A grand gathering of devotees witnessed the sacred Somwar Mahapuja with over 10,000 online and offline participants.',
                    'Sacred Shravan Somwar Mahapuja concluded with grand bhandara.',
                    '14th August 2025',
                    '2025-08-14',
                    '2025-08-14',
                    'Prabhu Pooja Dham, Haridwar',
                    'past',
                    1,
                    'completed',
                    'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80'
                )
            `);
            console.log("✓ Seeded sample latest and past events");
        }

        console.log("Database table latest_events setup completed successfully!");
    } catch (err) {
        console.error("Error setting up latest_events table:", err);
        throw err;
    }
}

if (require.main === module) {
    createEventTable()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = createEventTable;
