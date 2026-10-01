const { fetchCloudWatchMetrics, calculateCostAndDryRunScaling, ON_DEMAND_PRICING } = require('../services/awsService');

/**
 * Pulls read-only CloudWatch metrics for EC2 instance.
 */
async function getCloudWatchMetrics(req, res) {
  try {
    const instanceId = req.query.instanceId || process.env.AWS_EC2_INSTANCE_ID;
    const hours = parseInt(req.query.hours || '6', 10);

    const data = await fetchCloudWatchMetrics(instanceId, hours);
    return res.json({
      success: true,
      ...data
    });
  } catch (error) {
    console.error('getCloudWatchMetrics error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Computes dry-run scaling decisions and cost savings comparison without calling AWS write APIs.
 */
async function evaluateDryRun(req, res) {
  try {
    const { metrics, instanceType = 't3.large', baselineInstances = 4 } = req.body;

    let targetMetrics = metrics;

    // If metrics not provided in request body, pull recent CloudWatch metrics
    if (!targetMetrics || !Array.isArray(targetMetrics) || targetMetrics.length === 0) {
      const cwData = await fetchCloudWatchMetrics(req.body.instanceId, 6);
      targetMetrics = cwData.metrics || [];
    }

    const analysis = calculateCostAndDryRunScaling(targetMetrics, instanceType, parseInt(baselineInstances, 10));

    return res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('evaluateDryRun error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Returns supported instance types and on-demand pricing rates.
 */
function getPricingCatalog(req, res) {
  return res.json({
    success: true,
    currency: 'USD',
    pricing: ON_DEMAND_PRICING
  });
}

module.exports = {
  getCloudWatchMetrics,
  evaluateDryRun,
  getPricingCatalog
};
