const { getDbPool, isDbConnected, memoryStore } = require('../config/db');

const OVERRIDE_THRESHOLD = 0.15; // 15%
const COOLDOWN_STEPS = 3; // Minimum steps/hours between scale-up and scale-down

/**
 * Evaluates predictions against actual usage, applies the >15% scale-up rule
 * and cooldown safety logic, and persists records to MySQL (or fallback memory store).
 * 
 * @param {Array} predictions - Array of prediction objects from Python ML microservice
 * @returns {Promise<Object>} Aggregated results and logged override events
 */
async function processPredictionsAndOverrides(predictions) {
  const pool = await getDbPool();
  const dbAvailable = isDbConnected() && pool;

  let lastScaleUpIndex = -999;
  const processedResults = [];
  const overrideLogsToInsert = [];
  const predictionRecordsToInsert = [];

  let overrideCount = 0;
  let scaleUpCount = 0;
  let cooldownSuppressionCount = 0;

  for (let i = 0; i < predictions.length; i++) {
    const item = predictions[i];
    const timestamp = item.timestamp;
    const predicted = parseFloat(item.predicted_capacity);
    const actual = parseFloat(item.actual_capacity);
    const confidence = parseFloat(item.model_confidence || 85.0);

    let overrideTriggered = false;
    let reason = "Normal operation - within ±15% prediction tolerance";
    let actionTaken = "no action (steady)";

    const thresholdValue = predicted * (1 + OVERRIDE_THRESHOLD);

    // Rule 1: Actual usage exceeds prediction by > 15%
    if (actual > thresholdValue) {
      overrideTriggered = true;
      const pctOver = Math.round(((actual - predicted) / predicted) * 100);
      reason = `Actual capacity (${actual}) exceeded ML prediction (${predicted}) by ${pctOver}% (>15% safety limit)`;
      actionTaken = "override — scaled up";
      lastScaleUpIndex = i;
      overrideCount++;
      scaleUpCount++;
    } 
    // Rule 2: Potential scale-down check with Cooldown rule
    else if (predicted < actual * 0.85) {
      const stepsSinceScaleUp = i - lastScaleUpIndex;
      if (stepsSinceScaleUp < COOLDOWN_STEPS) {
        // Cooldown active: prevent premature scale-down flapping
        overrideTriggered = true;
        reason = `Scale-down requested but suppressed: safety cooldown active (${stepsSinceScaleUp}/${COOLDOWN_STEPS} steps)`;
        actionTaken = "scale-down suppressed (cooldown active)";
        overrideCount++;
        cooldownSuppressionCount++;
      } else {
        reason = "Scale-down evaluated and safe - cooldown satisfied";
        actionTaken = "scale-down permitted";
      }
    }

    predictionRecordsToInsert.push({
      timestamp,
      predicted_capacity: predicted,
      actual_capacity: actual,
      model_confidence: confidence
    });

    overrideLogsToInsert.push({
      timestamp,
      prediction_index: i,
      override_triggered: overrideTriggered,
      reason,
      action_taken: actionTaken
    });

    processedResults.push({
      timestamp,
      predicted_capacity: predicted,
      actual_capacity: actual,
      model_confidence: confidence,
      override_triggered: overrideTriggered,
      reason,
      action_taken: actionTaken
    });
  }

  // Persist to database
  if (dbAvailable) {
    try {
      // 1. Insert predictions
      for (let i = 0; i < predictionRecordsToInsert.length; i++) {
        const p = predictionRecordsToInsert[i];
        const [predRes] = await pool.query(
          `INSERT INTO predictions (timestamp, predicted_capacity, actual_capacity, model_confidence)
           VALUES (?, ?, ?, ?)`,
          [p.timestamp, p.predicted_capacity, p.actual_capacity, p.model_confidence]
        );
        const predictionId = predRes.insertId;

        // 2. Insert corresponding override log
        const log = overrideLogsToInsert[i];
        await pool.query(
          `INSERT INTO override_logs (timestamp, prediction_id, override_triggered, reason, action_taken)
           VALUES (?, ?, ?, ?, ?)`,
          [log.timestamp, predictionId, log.override_triggered ? 1 : 0, log.reason, log.action_taken]
        );
      }
      console.log(`[Override Engine] Successfully logged ${predictionRecordsToInsert.length} predictions and overrides to MySQL.`);
    } catch (err) {
      console.error('[Override Engine] Database insertion error:', err.message);
    }
  } else {
    // Save to in-memory fallback
    for (let i = 0; i < predictionRecordsToInsert.length; i++) {
      const predId = memoryStore.nextPredictionId++;
      const p = predictionRecordsToInsert[i];
      memoryStore.predictions.push({ id: predId, ...p });

      const log = overrideLogsToInsert[i];
      const logId = memoryStore.nextOverrideId++;
      memoryStore.override_logs.push({
        id: logId,
        timestamp: log.timestamp,
        prediction_id: predId,
        override_triggered: log.override_triggered,
        reason: log.reason,
        action_taken: log.action_taken
      });
    }
    console.log(`[Override Engine] Logged ${predictionRecordsToInsert.length} records to in-memory store.`);
  }

  return {
    total_predictions: predictions.length,
    override_count: overrideCount,
    scale_up_count: scaleUpCount,
    cooldown_suppression_count: cooldownSuppressionCount,
    results: processedResults
  };
}

module.exports = {
  processPredictionsAndOverrides,
  OVERRIDE_THRESHOLD,
  COOLDOWN_STEPS
};
