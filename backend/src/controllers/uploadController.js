const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const { getDbPool, isDbConnected, memoryStore } = require('../config/db');
const { trainAndPredict } = require('../services/mlClient');
const { processPredictionsAndOverrides } = require('../services/overrideEngine');

/**
 * Normalizes an uploaded row object to ensure exact schema fields.
 */
function normalizeMetricRow(rawRow) {
  // Normalize keys to lowercase trimmed
  const row = {};
  for (const key of Object.keys(rawRow)) {
    const cleanKey = key.trim().toLowerCase().replace(/[\s-]+/g, '_');
    row[cleanKey] = rawRow[key];
  }

  // Find timestamp
  const tsRaw = row['timestamp'] || row['time'] || row['date'] || new Date().toISOString();
  const dateObj = new Date(tsRaw);
  const formattedDate = !isNaN(dateObj) ? dateObj.toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ');

  const cpu = parseFloat(row['cpu_percent'] || row['cpu'] || row['cpu_utilization'] || 0.0);
  const netIn = parseFloat(row['network_in'] || row['networkin'] || row['net_in'] || 0.0);
  const netOut = parseFloat(row['network_out'] || row['networkout'] || row['net_out'] || 0.0);
  const instances = parseInt(row['instance_count'] || row['instances'] || Math.max(1, Math.ceil(cpu / 20.0)), 10);
  const cost = parseFloat(row['cost_per_hour'] || row['cost'] || (instances * 0.0832));

  return {
    timestamp: formattedDate,
    cpu_percent: Math.round(cpu * 100) / 100,
    network_in: Math.round(netIn * 100) / 100,
    network_out: Math.round(netOut * 100) / 100,
    instance_count: instances,
    cost_per_hour: Math.round(cost * 10000) / 10000,
    source: 'csv_upload'
  };
}

/**
 * Parses file from disk (CSV or Excel) into array of normalized records.
 */
async function parseUploadedFile(filePath, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  const rows = [];

  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    for (const raw of rawData) {
      rows.push(normalizeMetricRow(raw));
    }
  } else {
    // Default CSV parser
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => rows.push(normalizeMetricRow(data)))
        .on('end', resolve)
        .on('error', reject);
    });
  }

  return rows;
}

/**
 * Upload handler: parses CSV/Excel, persists rows in MySQL, forwards to Python ML microservice,
 * runs override engine, and logs everything to database.
 */
async function handleUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Please upload a .csv or .xlsx file.' });
  }

  const filePath = req.file.path;
  const fileName = req.file.originalname;

  try {
    console.log(`[Upload Controller] Processing uploaded file: ${fileName}...`);
    const parsedRows = await parseUploadedFile(filePath, fileName);

    if (parsedRows.length === 0) {
      return res.status(400).json({ error: 'Uploaded file contains no valid data rows.' });
    }

    console.log(`[Upload Controller] Successfully parsed ${parsedRows.length} rows.`);

    // 1. Store rows in MySQL table `usage_metrics` (or in-memory store)
    const pool = await getDbPool();
    const dbAvailable = isDbConnected() && pool;

    if (dbAvailable) {
      const insertSql = `
        INSERT INTO usage_metrics (timestamp, cpu_percent, network_in, network_out, instance_count, cost_per_hour, source)
        VALUES ?
      `;
      const values = parsedRows.map(r => [
        r.timestamp,
        r.cpu_percent,
        r.network_in,
        r.network_out,
        r.instance_count,
        r.cost_per_hour,
        r.source
      ]);

      await pool.query(insertSql, [values]);
      console.log(`[Upload Controller] Inserted ${parsedRows.length} rows into MySQL 'usage_metrics'.`);
    } else {
      // In-memory fallback
      parsedRows.forEach(r => {
        memoryStore.usage_metrics.push({
          id: memoryStore.nextMetricId++,
          ...r
        });
      });
      console.log(`[Upload Controller] Stored ${parsedRows.length} rows in fallback in-memory metrics store.`);
    }

    // 2. Forward data to Python microservice for RandomForestRegressor training and predictions
    console.log('[Upload Controller] Forwarding dataset to ML microservice...');
    const mlResponse = await trainAndPredict(parsedRows);

    // 3. Run predictions through Override & Cooldown Engine
    console.log('[Upload Controller] Running predictions through Override Layer...');
    const overrideResults = await processPredictionsAndOverrides(mlResponse.predictions);

    // Clean up uploaded temp file
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      // ignore
    }

    return res.json({
      success: true,
      message: `Successfully processed ${parsedRows.length} usage records`,
      rows_processed: parsedRows.length,
      ml_metrics: mlResponse.metrics,
      override_summary: {
        total_predictions: overrideResults.total_predictions,
        override_count: overrideResults.override_count,
        scale_up_count: overrideResults.scale_up_count,
        cooldown_suppression_count: overrideResults.cooldown_suppression_count
      },
      preview_predictions: overrideResults.results.slice(-15) // Recent 15 for quick inspection
    });

  } catch (error) {
    console.error('[Upload Controller Error]:', error);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {}
    return res.status(500).json({ error: `File processing failed: ${error.message}` });
  }
}

module.exports = {
  handleUpload
};
