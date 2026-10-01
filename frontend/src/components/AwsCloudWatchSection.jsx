import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  Radio,
  Server,
  DollarSign,
  TrendingDown,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Activity,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export default function AwsCloudWatchSection() {
  const [instanceId, setInstanceId] = useState('');
  const [instanceType, setInstanceType] = useState('t3.large');
  const [baselineInstances, setBaselineInstances] = useState(4);
  const [hours, setHours] = useState(6);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [pricingCatalog, setPricingCatalog] = useState({});
  const [errorNotice, setErrorNotice] = useState('');

  useEffect(() => {
    // Load pricing catalog
    api.get('/aws/pricing')
      .then(res => {
        if (res.data.pricing) setPricingCatalog(res.data.pricing);
      })
      .catch(() => {});

    // Initial fetch
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    setErrorNotice('');
    try {
      // 1. Fetch CloudWatch read-only metrics
      const cwRes = await api.get(`/aws/cloudwatch-metrics?instanceId=${instanceId}&hours=${hours}`);
      
      if (cwRes.data.error_notice) {
        setErrorNotice(cwRes.data.error_notice);
      }

      // 2. Evaluate dry-run scaling against pricing table
      const dryRunRes = await api.post('/aws/dry-run-scaling', {
        instanceId: instanceId || cwRes.data.instance_id,
        metrics: cwRes.data.metrics,
        instanceType,
        baselineInstances
      });

      setData({
        cloudwatch: cwRes.data,
        dryRun: dryRunRes.data.data
      });
    } catch (err) {
      console.error('AWS Fetch Error:', err);
      setErrorNotice(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const cwMetrics = data?.cloudwatch?.metrics || [];
  const dryRun = data?.dryRun;

  return (
    <div className="space-y-6">
      {/* Top Banner: Dry Run Mode Indicator */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-amber-300">AWS CloudWatch Read-Only Integration</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Dry-Run Protected
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Pulls read-only CloudWatch GetMetricData metrics. No AWS Auto Scaling write APIs are invoked.
            </p>
          </div>
        </div>

        <div className="text-right hidden md:block">
          <p className="text-xs font-mono text-slate-400">Target Region: {data?.cloudwatch?.region || 'us-east-1'}</p>
          <p className="text-xs font-mono text-slate-400">Stream: {data?.cloudwatch?.source || 'Detecting...'}</p>
        </div>
      </div>

      {errorNotice && (
        <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-800/40 text-xs text-sky-200 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Control Configuration Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* EC2 Instance ID */}
          <div className="space-y-1">
            <label className="text-slate-400 font-medium">EC2 Instance ID (Optional)</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                placeholder="e.g. i-0a817b8f9e123demo"
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-sky-500 w-48 font-mono"
              />
            </div>
          </div>

          {/* Instance Type */}
          <div className="space-y-1">
            <label className="text-slate-400 font-medium">EC2 Instance Type</label>
            <select
              value={instanceType}
              onChange={(e) => setInstanceType(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
            >
              {Object.keys(pricingCatalog).length > 0 ? (
                Object.entries(pricingCatalog).map(([type, price]) => (
                  <option key={type} value={type}>
                    {type} (${price}/hr)
                  </option>
                ))
              ) : (
                <>
                  <option value="t3.large">t3.large ($0.0832/hr)</option>
                  <option value="t3.medium">t3.medium ($0.0416/hr)</option>
                  <option value="c5.large">c5.large ($0.085/hr)</option>
                  <option value="m5.large">m5.large ($0.096/hr)</option>
                </>
              )}
            </select>
          </div>

          {/* Baseline Instances */}
          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Baseline Fixed Peak Instances</label>
            <input
              type="number"
              min="1"
              max="20"
              value={baselineInstances}
              onChange={(e) => setBaselineInstances(parseInt(e.target.value, 10) || 1)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-sky-500 w-24"
            />
          </div>

          {/* Time Window */}
          <div className="space-y-1">
            <label className="text-slate-400 font-medium">CloudWatch Window</label>
            <select
              value={hours}
              onChange={(e) => setHours(parseInt(e.target.value, 10))}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
            >
              <option value="1">Last 1 Hour</option>
              <option value="6">Last 6 Hours</option>
              <option value="12">Last 12 Hours</option>
              <option value="24">Last 24 Hours</option>
            </select>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Pulling CloudWatch...' : 'Pull CloudWatch Metrics'}</span>
        </button>
      </div>

      {/* Dry Run KPI Cards */}
      {dryRun && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <p className="text-xs font-semibold uppercase text-slate-400">Baseline Always-On</p>
            <h4 className="text-2xl font-bold text-rose-400 mt-1">${dryRun.total_baseline_cost}</h4>
            <p className="text-xs text-slate-400 mt-2">{dryRun.baseline_fixed_instances} x {dryRun.instance_type} fixed 24/7</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <p className="text-xs font-semibold uppercase text-slate-400">Dynamic ML Optimized</p>
            <h4 className="text-2xl font-bold text-emerald-400 mt-1">${dryRun.total_optimized_cost}</h4>
            <p className="text-xs text-slate-400 mt-2">Right-sized to demand</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <p className="text-xs font-semibold uppercase text-slate-400">Cost Saved</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <h4 className="text-2xl font-bold text-sky-400">${dryRun.total_saved}</h4>
              <span className="text-xs font-bold text-emerald-400">({dryRun.savings_percentage}%)</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">In current monitoring window</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <p className="text-xs font-semibold uppercase text-slate-400">Projected 30-Day Savings</p>
            <h4 className="text-2xl font-bold text-indigo-400 mt-1">${dryRun.monthly_projected_savings}</h4>
            <p className="text-xs text-slate-400 mt-2">Estimated monthly runway benefit</p>
          </div>
        </div>
      )}

      {/* Live CloudWatch Line Chart */}
      {cwMetrics.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <Activity className="w-5 h-5 text-sky-400" />
                <span>CloudWatch Live Metrics (CPU Utilization %)</span>
              </h3>
              <p className="text-xs text-slate-400">Read-only timeseries metrics from AWS CloudWatch GetMetricData</p>
            </div>
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300">
              {cwMetrics.length} intervals recorded
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cwMetrics} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(t) => {
                    const d = new Date(t);
                    return isNaN(d) ? t : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
                  }}
                />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="%" />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="glass-panel p-3 rounded-xl border border-slate-700 text-xs shadow-xl space-y-1">
                          <p className="font-semibold text-slate-300">{new Date(label).toLocaleTimeString()}</p>
                          <p className="text-sky-400 font-bold">CPU: {payload[0]?.value}%</p>
                          {payload[0]?.payload?.network_in_mb && (
                            <p className="text-slate-400">Net In: {payload[0]?.payload?.network_in_mb} MB</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cpu_percent"
                  name="EC2 CPU Utilization"
                  stroke="#0ea5e9"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Dry Run Scaling Log Table */}
      {dryRun && dryRun.scaling_decisions && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Dry-Run Scaling Action Audit</h3>
              <p className="text-xs text-slate-400">
                Calculated actions simulating what an Auto-Scaler would do without calling any AWS write endpoints
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/40">
              WRITE APIs BLOCKED (Safe POC)
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800/80 max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Time</th>
                  <th className="py-2.5 px-4">CPU %</th>
                  <th className="py-2.5 px-4">Baseline Cap.</th>
                  <th className="py-2.5 px-4">Recommended Cap.</th>
                  <th className="py-2.5 px-4">Simulated Scaling Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 bg-slate-950/40">
                {dryRun.scaling_decisions.slice(-20).reverse().map((d, i) => (
                  <tr key={i} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-4 font-mono text-slate-400">
                      {new Date(d.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-200">
                      {d.cpu_percent}%
                    </td>
                    <td className="py-2.5 px-4 text-rose-400 font-medium">
                      {d.baseline_instances} instances
                    </td>
                    <td className="py-2.5 px-4 text-emerald-400 font-bold">
                      {d.recommended_instances} instances
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                        d.dry_run_action.includes('SCALE_DOWN')
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                          : d.dry_run_action.includes('SCALE_UP')
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-700/50'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {d.dry_run_action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
