const { CloudWatchClient, GetMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

// Standard AWS On-Demand hourly pricing table (us-east-1 reference)
const ON_DEMAND_PRICING = {
  't2.micro': 0.0116,
  't2.small': 0.023,
  't2.medium': 0.0464,
  't3.nano': 0.0052,
  't3.micro': 0.0104,
  't3.small': 0.0208,
  't3.medium': 0.0416,
  't3.large': 0.0832,
  't3.xlarge': 0.1664,
  'c5.large': 0.085,
  'c5.xlarge': 0.17,
  'm5.large': 0.096,
  'm5.xlarge': 0.192,
  'r5.large': 0.126
};

function getHourlyRate(instanceType = 't3.large') {
  return ON_DEMAND_PRICING[instanceType] || 0.0832;
}

/**
 * Creates CloudWatch client using environment variables only.
 * Never hardcode credentials.
 */
function createCloudWatchClient() {
  const region = process.env.AWS_REGION || 'us-east-1';
  
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return new CloudWatchClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  }

  // Fallback to default SDK chain (e.g. ~/.aws/credentials, IAM role, or env)
  return new CloudWatchClient({ region });
}

/**
 * Pull real CPU and Network metrics for an EC2 instance via CloudWatch GetMetricData API (READ-ONLY).
 */
async function fetchCloudWatchMetrics(instanceIdParam, hours = 6) {
  const instanceId = instanceIdParam || process.env.AWS_EC2_INSTANCE_ID;

  // If no credentials or instance ID configured, return simulated CloudWatch stream with clear flag
  if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_EC2_INSTANCE_ID && !instanceId) {
    console.log('[AWS Service] No AWS credentials or Instance ID found in environment. Generating preview CloudWatch stream.');
    return generateSimulatedCloudWatchData(hours);
  }

  try {
    const client = createCloudWatchClient();
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    const params = {
      StartTime: startTime,
      EndTime: endTime,
      MetricDataQueries: [
        {
          Id: 'm_cpu',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'CPUUtilization',
              Dimensions: [{ Name: 'InstanceId', Value: instanceId }]
            },
            Period: 300, // 5-minute intervals
            Stat: 'Average'
          },
          ReturnData: true
        },
        {
          Id: 'm_netin',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'NetworkIn',
              Dimensions: [{ Name: 'InstanceId', Value: instanceId }]
            },
            Period: 300,
            Stat: 'Average'
          },
          ReturnData: true
        },
        {
          Id: 'm_netout',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'NetworkOut',
              Dimensions: [{ Name: 'InstanceId', Value: instanceId }]
            },
            Period: 300,
            Stat: 'Average'
          },
          ReturnData: true
        }
      ]
    };

    const command = new GetMetricDataCommand(params);
    const response = await client.send(command);

    const cpuQuery = response.MetricDataResults.find(r => r.Id === 'm_cpu');
    const netInQuery = response.MetricDataResults.find(r => r.Id === 'm_netin');
    const netOutQuery = response.MetricDataResults.find(r => r.Id === 'm_netout');

    const dataPoints = [];
    if (cpuQuery && cpuQuery.Timestamps) {
      for (let i = 0; i < cpuQuery.Timestamps.length; i++) {
        const ts = cpuQuery.Timestamps[i];
        const cpu = Math.round((cpuQuery.Values[i] || 0) * 100) / 100;
        const netIn = Math.round(((netInQuery?.Values[i] || 0) / (1024 * 1024)) * 100) / 100; // Convert bytes to MB
        const netOut = Math.round(((netOutQuery?.Values[i] || 0) / (1024 * 1024)) * 100) / 100;

        dataPoints.push({
          timestamp: ts.toISOString(),
          cpu_percent: cpu,
          network_in_mb: netIn,
          network_out_mb: netOut
        });
      }
    }

    return {
      source: 'aws_cloudwatch_live',
      instance_id: instanceId,
      region: process.env.AWS_REGION || 'us-east-1',
      total_points: dataPoints.length,
      metrics: dataPoints.reverse()
    };
  } catch (err) {
    console.warn(`[AWS Service Warning] CloudWatch GetMetricData failed (${err.message}). Using simulated stream for demo.`);
    const simulated = generateSimulatedCloudWatchData(hours);
    simulated.error_notice = `Live CloudWatch connection notice: ${err.message}. Showing simulated EC2 data.`;
    return simulated;
  }
}

/**
 * Computes cost analysis and dry-run scaling decisions without modifying AWS infrastructure.
 */
function calculateCostAndDryRunScaling(metricsList, instanceType = 't3.large', baselineInstances = 4) {
  const hourlyRate = getHourlyRate(instanceType);

  let totalBaselineCost = 0;
  let totalOptimizedCost = 0;
  const decisions = [];

  metricsList.forEach(item => {
    const cpu = item.cpu_percent || 20;
    
    // ML dynamic recommended instance capacity
    const recommendedInstances = Math.max(1, Math.ceil(cpu / 20.0));
    
    // Baseline cost (Always-on peak provisioned capacity)
    const baselineCost = baselineInstances * hourlyRate;
    
    // Optimized dynamic cost
    const optimizedCost = recommendedInstances * hourlyRate;

    totalBaselineCost += baselineCost;
    totalOptimizedCost += optimizedCost;

    let dryRunAction = 'MAINTAIN';
    if (recommendedInstances < baselineInstances) {
      dryRunAction = `SCALE_DOWN: Reduce from ${baselineInstances} to ${recommendedInstances} instances (Saving $${(baselineCost - optimizedCost).toFixed(4)}/hr)`;
    } else if (recommendedInstances > baselineInstances) {
      dryRunAction = `SCALE_UP: Increase from ${baselineInstances} to ${recommendedInstances} instances for high load`;
    }

    decisions.push({
      timestamp: item.timestamp,
      cpu_percent: cpu,
      baseline_instances: baselineInstances,
      recommended_instances: recommendedInstances,
      baseline_cost: Math.round(baselineCost * 10000) / 10000,
      optimized_cost: Math.round(optimizedCost * 10000) / 10000,
      savings: Math.round((baselineCost - optimizedCost) * 10000) / 10000,
      dry_run_action: dryRunAction
    });
  });

  const totalSaved = Math.max(0, totalBaselineCost - totalOptimizedCost);
  const savingsPct = totalBaselineCost > 0 ? ((totalSaved / totalBaselineCost) * 100).toFixed(1) : 0;
  
  // Projected 30-day monthly savings
  const avgHourlySaved = metricsList.length > 0 ? totalSaved / metricsList.length : 0;
  const monthlyProjectedSaved = (avgHourlySaved * 24 * 30).toFixed(2);

  return {
    instance_type: instanceType,
    hourly_rate_per_instance: hourlyRate,
    baseline_fixed_instances: baselineInstances,
    total_baseline_cost: Math.round(totalBaselineCost * 100) / 100,
    total_optimized_cost: Math.round(totalOptimizedCost * 100) / 100,
    total_saved: Math.round(totalSaved * 100) / 100,
    savings_percentage: parseFloat(savingsPct),
    monthly_projected_savings: parseFloat(monthlyProjectedSaved),
    dry_run_mode: true,
    scaling_decisions: decisions
  };
}

function generateSimulatedCloudWatchData(hours = 6) {
  const points = [];
  const now = new Date();
  const totalPoints = hours * 12; // 5-minute points

  for (let i = totalPoints; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60 * 1000);
    const hour = time.getHours();
    const cycle = (Math.sin((hour - 9) / 24 * 2 * Math.PI) + 1) / 2;
    const cpu = Math.round((20 + cycle * 45 + (Math.random() * 8 - 4)) * 10) / 10;
    const netIn = Math.round((cpu * 8.5 + Math.random() * 50) * 10) / 10;
    const netOut = Math.round((cpu * 14.2 + Math.random() * 80) * 10) / 10;

    points.push({
      timestamp: time.toISOString(),
      cpu_percent: Math.min(99.0, Math.max(5.0, cpu)),
      network_in_mb: netIn,
      network_out_mb: netOut
    });
  }

  return {
    source: 'simulated_cloudwatch_stream',
    instance_id: process.env.AWS_EC2_INSTANCE_ID || 'i-0a817b8f9e123demo',
    region: process.env.AWS_REGION || 'us-east-1',
    total_points: points.length,
    metrics: points
  };
}

module.exports = {
  fetchCloudWatchMetrics,
  calculateCostAndDryRunScaling,
  ON_DEMAND_PRICING
};
