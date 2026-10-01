const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend or root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

let pool = null;
let isConnected = false;
let connectionAttempted = false;

// In-memory fallback repository if MySQL is temporarily offline
const memoryStore = {
  users: [],
  usage_metrics: [],
  predictions: [],
  override_logs: [],
  nextUserId: 1,
  nextMetricId: 1,
  nextPredictionId: 1,
  nextOverrideId: 1
};

async function getDbPool() {
  if (pool) return pool;
  if (connectionAttempted && !isConnected) return null;
  connectionAttempted = true;

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cloud_cost_optimizer',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 4000
  };

  try {
    // Attempt connecting to MySQL server directly first (to create database if not exists)
    const serverConn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      connectTimeout: 4000
    });

    await serverConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\`;`);
    await serverConn.end();

    // Create pool for the target database
    pool = mysql.createPool(config);
    
    // Test connection
    const testConn = await pool.getConnection();
    testConn.release();
    isConnected = true;
    console.log(`[Database] Connected successfully to MySQL database: ${config.database}`);

    // Auto-create tables if they don't exist
    await initTables();

    return pool;
  } catch (error) {
    console.warn(`[Database Warning] Could not connect to MySQL at ${config.host}:${config.port} (${error.message}).`);
    console.warn(`[Database Warning] Running in In-Memory Mode. Set up MySQL credentials in .env to persist to real MySQL.`);
    isConnected = false;
    pool = null;
    return null;
  }
}

async function initTables() {
  if (!pool) return;
  
  const createUsageMetrics = `
    CREATE TABLE IF NOT EXISTS usage_metrics (
      id INT AUTO_INCREMENT PRIMARY KEY,
      timestamp DATETIME NOT NULL,
      cpu_percent FLOAT NOT NULL,
      network_in FLOAT NOT NULL,
      network_out FLOAT NOT NULL,
      instance_count INT NOT NULL,
      cost_per_hour DECIMAL(10, 4) NOT NULL,
      source VARCHAR(50) DEFAULT 'csv_upload',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_timestamp (timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const createPredictions = `
    CREATE TABLE IF NOT EXISTS predictions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      timestamp DATETIME NOT NULL,
      predicted_capacity FLOAT NOT NULL,
      actual_capacity FLOAT NOT NULL,
      model_confidence FLOAT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pred_time (timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const createOverrideLogs = `
    CREATE TABLE IF NOT EXISTS override_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      timestamp DATETIME NOT NULL,
      prediction_id INT NULL,
      override_triggered BOOLEAN NOT NULL DEFAULT FALSE,
      reason VARCHAR(255) NOT NULL,
      action_taken VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_override_time (timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const createUsers = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'DevOps Engineer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await pool.query(createUsers);
  await pool.query(createUsageMetrics);
  await pool.query(createPredictions);
  await pool.query(createOverrideLogs);
  console.log('[Database] Verified MySQL tables: users, usage_metrics, predictions, override_logs.');
}

module.exports = {
  getDbPool,
  initTables,
  isDbConnected: () => isConnected,
  memoryStore
};
