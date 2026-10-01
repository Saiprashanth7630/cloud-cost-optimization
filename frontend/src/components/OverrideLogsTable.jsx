import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Clock, Filter } from 'lucide-react';

export default function OverrideLogsTable({ logs }) {
  const [filterType, setFilterType] = useState('all');

  if (!logs || logs.length === 0) {
    return (
      <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center text-slate-400">
        No override logs recorded yet. Upload a dataset to view override layer decisions.
      </div>
    );
  }

  const filteredLogs = logs.filter(log => {
    if (filterType === 'overrides_only') return log.override_triggered;
    if (filterType === 'scale_up') return log.action_taken?.includes('scaled up');
    if (filterType === 'cooldown') return log.action_taken?.includes('cooldown');
    return true;
  });

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span>Override Layer & Safety Cooldown Logs (MySQL)</span>
          </h3>
          <p className="text-xs text-slate-400">
            Audit trail of ML predictions compared against &gt;15% surge thresholds and cooldown rules
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filterType === 'all' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Logs ({logs.length})
          </button>
          <button
            onClick={() => setFilterType('overrides_only')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filterType === 'overrides_only' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active Overrides
          </button>
          <button
            onClick={() => setFilterType('scale_up')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filterType === 'scale_up' ? 'bg-rose-500 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Scale-Ups (&gt;15%)
          </button>
          <button
            onClick={() => setFilterType('cooldown')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filterType === 'cooldown' ? 'bg-indigo-500 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cooldown Active
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Action Taken</th>
              <th className="py-3 px-4">Evaluation Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
            {filteredLogs.slice(0, 30).map((log, idx) => {
              const isScaleUp = log.action_taken?.includes('scaled up');
              const isCooldown = log.action_taken?.includes('cooldown');
              const isTriggered = log.override_triggered;

              return (
                <tr key={log.id || idx} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 text-slate-300 font-mono flex items-center space-x-1.5 whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{log.timestamp?.replace('T', ' ').slice(0, 19)}</span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    {isTriggered ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        <AlertTriangle className="w-3 h-3" />
                        <span>OVERRIDE</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>NORMAL</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    {isScaleUp ? (
                      <span className="px-2.5 py-1 rounded-lg font-bold bg-rose-950/80 text-rose-300 border border-rose-700/60">
                        override — scaled up
                      </span>
                    ) : isCooldown ? (
                      <span className="px-2.5 py-1 rounded-lg font-medium bg-amber-950/70 text-amber-300 border border-amber-700/50">
                        scale-down suppressed (cooldown)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-slate-300 bg-slate-800/60 border border-slate-700/40">
                        {log.action_taken || 'steady'}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-slate-300 max-w-md">
                    {log.reason}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredLogs.length > 30 && (
        <p className="text-right text-[11px] text-slate-500">
          Showing top 30 of {filteredLogs.length} logged decisions
        </p>
      )}
    </div>
  );
}
