import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const dbName = process.env.DB_NAME || "safe_drive";

const baseConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const adminPool = mysql.createPool(baseConfig);
await adminPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
await adminPool.end();

const pool = mysql.createPool({
  ...baseConfig,
  database: dbName,
});

export { dbName };
export default pool;
