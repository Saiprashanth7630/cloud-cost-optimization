const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { getDbPool } = require('./config/db');
const { authenticateToken } = require('./middleware/authMiddleware');
const authController = require('./controllers/authController');
const uploadController = require('./controllers/uploadController');
const metricsController = require('./controllers/metricsController');
const awsController = require('./controllers/awsController');

const app = express();
const PORT = process.env.PORT || 5000;

// Setup Multer for CSV/Excel file uploads
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Only .csv, .xlsx, and .xls files are supported!'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Cloud Cost Optimization Backend API',
    timestamp: new Date().toISOString()
  });
});

// --- Auth Routes ---
app.post('/api/auth/login', authController.login);
app.post('/api/auth/register', authController.register);
app.get('/api/auth/me', authenticateToken, authController.getProfile);

// --- Metrics & Upload Routes ---
app.post('/api/metrics/upload', authenticateToken, upload.single('file'), uploadController.handleUpload);
app.get('/api/metrics/summary', authenticateToken, metricsController.getSummaryStats);
app.get('/api/metrics/chart', authenticateToken, metricsController.getChartData);
app.get('/api/metrics/override-logs', authenticateToken, metricsController.getOverrideLogs);
app.post('/api/metrics/seed-sample', authenticateToken, metricsController.seedSampleData);

// --- AWS CloudWatch & Dry-Run Routes ---
app.get('/api/aws/cloudwatch-metrics', authenticateToken, awsController.getCloudWatchMetrics);
app.post('/api/aws/dry-run-scaling', authenticateToken, awsController.evaluateDryRun);
app.get('/api/aws/pricing', authenticateToken, awsController.getPricingCatalog);

// Start server and initialize DB connection
async function startServer() {
  await getDbPool(); // Attempt DB connect & table auto-creation

  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  Cloud Cost Optimization Backend API is running!`);
    console.log(`  URL: http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`====================================================`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
