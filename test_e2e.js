const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function runE2ETest() {
  console.log('=====================================================');
  console.log('  STARTING END-TO-END VERIFICATION OF CLOUD COST POC');
  console.log('=====================================================');

  try {
    // 1. Test Login
    console.log('\n[1] Testing JWT Login...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@cloudopt.io',
      password: 'admin123'
    });
    console.log('✔ Login successful! User:', loginRes.data.user.email);
    const token = loginRes.data.token;

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Test Ingestion & ML Pipeline
    console.log('\n[2] Testing Dataset Ingestion & ML Model Training...');
    const seedRes = await axios.post(`${API_BASE}/metrics/seed-sample`, {}, { headers });
    console.log('✔ Seed response:', seedRes.data.message);
    console.log('✔ ML Model Metrics:', seedRes.data.ml_metrics);
    console.log('✔ Override Summary:', seedRes.data.override_summary);

    // 3. Test Dashboard Summary Stats
    console.log('\n[3] Testing Dashboard Summary Stats...');
    const summaryRes = await axios.get(`${API_BASE}/metrics/summary`, { headers });
    console.log('✔ Total Predictions:', summaryRes.data.total_predictions);
    console.log('✔ Total Overrides:', summaryRes.data.total_overrides);
    console.log('✔ Scale-up Overrides (>15% surge):', summaryRes.data.scale_up_overrides);
    console.log('✔ Cost Saved vs Baseline:', `$${summaryRes.data.cost_saved} (${summaryRes.data.savings_percentage}%)`);
    console.log('✔ Model Accuracy:', `${summaryRes.data.accuracy_percent}% (MAE: ${summaryRes.data.mae})`);

    // 4. Test Chart Data
    console.log('\n[4] Testing Timeseries Chart Data...');
    const chartRes = await axios.get(`${API_BASE}/metrics/chart`, { headers });
    console.log(`✔ Chart Data Points: ${chartRes.data.total_points}`);
    console.log('✔ Sample Point:', chartRes.data.chart_data[0]);

    // 5. Test Override Logs
    console.log('\n[5] Testing Override Logs Audit...');
    const logsRes = await axios.get(`${API_BASE}/metrics/override-logs?limit=5`, { headers });
    console.log(`✔ Retrieved ${logsRes.data.logs.length} recent override logs.`);
    console.log('✔ Top Log:', logsRes.data.logs[0]);

    // 6. Test AWS CloudWatch & Dry-Run Scaling
    console.log('\n[6] Testing AWS CloudWatch Read-Only Dry-Run...');
    const cwRes = await axios.get(`${API_BASE}/aws/cloudwatch-metrics?hours=6`, { headers });
    console.log(`✔ CloudWatch source: ${cwRes.data.source}, Points: ${cwRes.data.total_points}`);

    const dryRunRes = await axios.post(`${API_BASE}/aws/dry-run-scaling`, {
      metrics: cwRes.data.metrics,
      instanceType: 't3.large',
      baselineInstances: 4
    }, { headers });
    console.log('✔ Dry-Run Cost Analysis:');
    console.log(`    Baseline Cost: $${dryRunRes.data.data.total_baseline_cost}`);
    console.log(`    Optimized Cost: $${dryRunRes.data.data.total_optimized_cost}`);
    console.log(`    Total Saved: $${dryRunRes.data.data.total_saved} (${dryRunRes.data.data.savings_percentage}%)`);
    console.log(`    Projected 30-Day Savings: $${dryRunRes.data.data.monthly_projected_savings}`);
    console.log(`    Dry-Run Scaling Action Sample: ${dryRunRes.data.data.scaling_decisions[0].dry_run_action}`);

    console.log('\n=====================================================');
    console.log('  ALL END-TO-END VERIFICATION CHECKS PASSED! ✔✔✔');
    console.log('=====================================================');
  } catch (err) {
    console.error('❌ Verification failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

runE2ETest();
