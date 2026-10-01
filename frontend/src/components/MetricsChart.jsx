import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

export default function MetricsChart({ data }) {
  const [filter, setFilter] = useState('all');

  if (!data || data.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-slate-400">
        No timeseries data available. Ingest a dataset to render the capacity chart.
      </div>
    );
  }

  // Filter display range
  const filteredData = filter === '24h'
    ? data.slice(-24)
    : filter === '48h'
    ? data.slice(-48)
    : data;

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Predicted vs Actual Instance Capacity</span>
            <span className="text-xs font-normal text-slate-400">({filteredData.length} data points)</span>
          </h3>
          <p className="text-xs text-slate-400">
            RandomForestRegressor capacity forecasting vs real observed cloud workload over time
          </p>
        </div>

        {/* Time filters */}
        <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filter === 'all' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setFilter('48h')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filter === '48h' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Last 48h
          </button>
          <button
            onClick={() => setFilter('24h')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filter === '24h' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Last 24h
          </button>
        </div>
      </div>

      {/* Recharts LineChart */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="time_label"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              label={{ value: 'Instances', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

            <Line
              type="monotone"
              dataKey="actual_capacity"
              name="Actual Workload Capacity"
              stroke="#38bdf8"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#38bdf8' }}
            />
            <Line
              type="monotone"
              dataKey="predicted_capacity"
              name="ML Predicted Capacity"
              stroke="#a855f7"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 5, fill: '#a855f7' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const actual = payload.find(p => p.dataKey === 'actual_capacity')?.value;
    const predicted = payload.find(p => p.dataKey === 'predicted_capacity')?.value;
    const confidence = payload[0]?.payload?.model_confidence;
    const diff = Math.round((actual - predicted) * 100) / 100;
    const pctDiff = predicted > 0 ? Math.round(((actual - predicted) / predicted) * 100) : 0;
    const isOverride = actual > predicted * 1.15;

    return (
      <div className="glass-panel p-3.5 rounded-xl border border-slate-700 text-xs shadow-2xl space-y-1.5 min-w-[200px]">
        <p className="font-semibold text-slate-300 border-b border-slate-700/60 pb-1">{label}</p>
        <div className="flex justify-between items-center text-sky-400">
          <span>Actual Capacity:</span>
          <span className="font-bold">{actual} instances</span>
        </div>
        <div className="flex justify-between items-center text-purple-400">
          <span>ML Predicted:</span>
          <span className="font-bold">{predicted} instances</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Deviation:</span>
          <span className={isOverride ? 'text-rose-400 font-bold' : 'text-slate-300'}>
            {diff > 0 ? `+${diff}` : diff} ({pctDiff > 0 ? `+${pctDiff}%` : `${pctDiff}%`})
          </span>
        </div>
        {confidence && (
          <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800">
            <span>Model Confidence:</span>
            <span className="text-emerald-400 font-medium">{confidence}%</span>
          </div>
        )}
        {isOverride && (
          <div className="mt-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold text-center border border-rose-500/30">
            Override Triggered (&gt;15% threshold)
          </div>
        )}
      </div>
    );
  }
  return null;
}
