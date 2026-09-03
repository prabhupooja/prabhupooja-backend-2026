const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

const mysqlpool = mysql.createPool({
  host: process.env.DbHost || "localhost",
  user: process.env.DbUser || "root",
  password: process.env.DbPassword || "",
  database: process.env.DbName || "prabhupooja",
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

