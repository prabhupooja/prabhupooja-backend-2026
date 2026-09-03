const db = require('../config/db');
const { isRedisConnected, getCache } = require('../config/redis');

exports.getHealth = async (req, res) => {
  const startTime = Date.now();
  let dbStatus = "unknown";
  let dbLatencyMs = null;

  try {
    const t0 = Date.now();
    await db.query("SELECT 1");
    dbLatencyMs = Date.now() - t0;
    dbStatus = "connected";
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  const healthData = {
    status: dbStatus === "connected" ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
    uptimeSeconds,
    environment: process.env.NODE_ENV || "development",
    responseTimeMs: Date.now() - startTime,
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        host: process.env.DbHost || "localhost",
        database: process.env.DbName || "prabhupooja"
      },
      cache: {
        status: isRedisConnected() ? "connected" : "in-memory-fallback",
        driver: isRedisConnected() ? "redis" : "memory"
      }
    },
    system: {
      memory: {
        rssMb: (memoryUsage.rss / 1024 / 1024).toFixed(2),
        heapUsedMb: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMb: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2)
      },
      nodeVersion: process.version,
      platform: process.platform
    }
  };

  const statusCode = dbStatus === "connected" ? 200 : 503;
  return res.status(statusCode).json({
    success: dbStatus === "connected",
    data: healthData
  });
};

exports.getDbStats = async (req, res) => {
  try {
    const tables = [
      'users', 'admin', 'pandit', 'temple', 'puja', 
      'temple_booking', 'puja_booking', 'orders', 'products', 
      'rudraabhishek', 'live_streams', 'cart'
    ];

    const stats = {};
    for (const table of tables) {
      try {
        const [rows] = await db.query(`SELECT COUNT(*) as total FROM \`${table}\``);
        stats[table] = rows[0]?.total || 0;
      } catch (e) {
        stats[table] = "N/A";
      }
    }

    return res.status(200).json({
      success: true,
      message: "Database statistics retrieved successfully",
      data: stats
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
