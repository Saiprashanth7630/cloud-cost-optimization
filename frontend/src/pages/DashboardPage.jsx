import React, { useState, useEffect } from 'react';
import api from '../api/client';
import StatCard from '../components/StatCard';
import MetricsChart from '../components/MetricsChart';
import CostComparisonChart from '../components/CostComparisonChart';
import OverrideLogsTable from '../components/OverrideLogsTable';
import {
  DollarSign,
  TrendingUp,
  Percent,
  ShieldAlert,
  RefreshCw,
  UploadCloud,
  Layers,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export default function DashboardPage({ onNavigateToUpload }) {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      setError('');

      const [summaryRes, chartRes, logsRes] = await Promise.all([
        api.get('/metrics/summary'),
        api.get('/metrics/chart'),
        api.get('/metrics/override-logs?limit=100')
      ]);

      setStats(summaryRes.data);
      setChartData(chartRes.data.chart_data || []);
      setLogs(logsRes.data.logs || []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400">Loading Cloud Cost Metrics & Analytics...</p>
      </div>
    );
  }

  const hasData = stats && stats.has_data;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Cloud Cost Optimization Dashboard</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Machine learning capacity forecasting, real-time override safety enforcement, and cost arbitrage
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          {!hasData && (
            <button
              onClick={onNavigateToUpload}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-semibold shadow-lg shadow-sky-500/25 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Ingest Dataset</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Empty State Banner if no data ingested yet */}
      {!hasData && (
        <div className="glass-panel p-8 rounded-3xl border border-dashed border-slate-700 text-center space-y-4">
          <div className="inline-flex p-4 rounded-2xl bg-sky-500/10 text-sky-400">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-white">No Telemetry Ingested Yet</h3>
            <p className="text-xs text-slate-400">
              Upload historical cloud metrics (CSV/Excel) to train the RandomForestRegressor model and compute cost savings vs always-on baseline.
            </p>
          </div>
          <button
            onClick={onNavigateToUpload}
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 transition-all cursor-pointer"
          >
            Go to Data Ingestion Page
          </button>
        </div>
      )}

      {/* 4 Main KPI Cards */}
      {hasData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Cost Saved"
            value={`$${stats.cost_saved}`}
            subtext={`Saved ${stats.savings_percentage}% vs always-on`}
            badge={`-${stats.savings_percentage}%`}
            color="emerald"
            icon={DollarSign}
          />

          <StatCard
            title="Optimized vs Baseline"
            value={`$${stats.optimized_cost}`}
            subtext={`Baseline peak: $${stats.baseline_cost}`}
            badge={`${stats.baseline_peak_instances}x instances peak`}
            color="sky"
            icon={Layers}
          />

          <StatCard
            title="Model Accuracy (R²)"
            value={`${stats.accuracy_percent}%`}
            subtext={`Mean Absolute Error: ${stats.mae} cap.`}
            badge="RandomForest"
            color="indigo"
            icon={Percent}
          />

          <StatCard
            title="Overrides Triggered"
            value={`${stats.total_overrides}`}
            subtext={`${stats.scale_up_overrides} scale-ups (>15% spike)`}
            badge="Safety Layer"
            color="amber"
            icon={ShieldAlert}
          />
        </div>
      )}

      {/* Primary Charts */}
      {hasData && (
        <div className="grid grid-cols-1 gap-6">
          {/* Predicted vs Actual Instance Capacity Over Time */}
          <MetricsChart data={chartData} />

          {/* Cost Comparison: Baseline Always-On vs Dynamic Optimized */}
          <CostComparisonChart data={chartData} />

          {/* Override Logs from MySQL Table override_logs */}
          <OverrideLogsTable logs={logs} />
        </div>
      )}
    </div>
  );
}
