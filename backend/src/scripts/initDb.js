const { getDbPool, initTables } = require('../config/db');

async function run() {
  console.log('--- Initializing MySQL Database Schema ---');
  console.log(`Connecting to MySQL host: ${process.env.DB_HOST || 'localhost'}, database: ${process.env.DB_NAME || 'cloud_cost_optimizer'}`);
  
  const pool = await getDbPool();
  if (!pool) {
    console.error('FAILED: Unable to connect to MySQL. Please verify your .env settings and that MySQL service is running.');
    process.exit(1);
  }

  await initTables();
  console.log('SUCCESS: All required tables (usage_metrics, predictions, override_logs) are ready!');
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error during DB initialization:', err);
  process.exit(1);
});
