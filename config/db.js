const mysql = require("mysql2/promise");
const config = require("./env");

const mysqlpool = mysql.createPool({
  host: config.DB.host,
  user: config.DB.user,
  password: config.DB.password,
  database: config.DB.database,
  port: config.DB.port,
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 30,
  maxIdle: 15,
  idleTimeout: 60000,
  queueLimit: 0,
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

module.exports = mysqlpool;
