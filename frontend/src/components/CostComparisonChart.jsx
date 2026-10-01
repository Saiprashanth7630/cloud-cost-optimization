import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export default function CostComparisonChart({ data }) {
  if (!data || data.length === 0) return null;

  const sample = data.slice(-36); // Show last 36 points for high clarity

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
          <span>Cost Comparison: Baseline Always-On vs Dynamic ML Optimization</span>
        </h3>
        <p className="text-xs text-slate-400">
          Comparing constant peak over-provisioning vs dynamic right-sized instance allocation ($/hr)
        </p>
      </div>

      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sample} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="baselineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="optimizedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="time_label" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
              label={{ value: 'USD / Hr', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip content={<CostTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

            <Area
              type="monotone"
              dataKey="baseline_cost"
              name="Baseline (Always-On Fixed)"
              stroke="#f43f5e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#baselineGradient)"
            />
            <Area
              type="monotone"
              dataKey="optimized_cost"
              name="Dynamic ML Optimized"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#optimizedGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CostTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const baseline = payload.find(p => p.dataKey === 'baseline_cost')?.value || 0;
    const optimized = payload.find(p => p.dataKey === 'optimized_cost')?.value || 0;
    const saved = Math.round((baseline - optimized) * 1000) / 1000;
    const savedPct = baseline > 0 ? Math.round((saved / baseline) * 100) : 0;

    return (
      <div className="glass-panel p-3 rounded-xl border border-slate-700 text-xs shadow-xl space-y-1">
        <p className="font-semibold text-slate-300 border-b border-slate-700/60 pb-1">{label}</p>
        <div className="flex justify-between space-x-4 text-rose-400">
          <span>Baseline Cost:</span>
          <span className="font-bold">${baseline.toFixed(3)}/hr</span>
        </div>
        <div className="flex justify-between space-x-4 text-emerald-400">
          <span>Optimized Cost:</span>
          <span className="font-bold">${optimized.toFixed(3)}/hr</span>
        </div>
        <div className="flex justify-between space-x-4 text-sky-400 pt-1 border-t border-slate-800 font-bold">
          <span>Savings:</span>
          <span>+${saved.toFixed(3)}/hr ({savedPct}%)</span>
        </div>
      </div>
    );
  }
  return null;
}
