import React from 'react';

export default function StatCard({ title, value, subtext, icon: Icon, badge, color = 'sky' }) {
  const colorMap = {
    sky: 'from-sky-500/10 to-transparent border-sky-500/20 text-sky-400 shadow-sky-500/5',
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-400 shadow-emerald-500/5',
    amber: 'from-amber-500/10 to-transparent border-amber-500/20 text-amber-400 shadow-amber-500/5',
    indigo: 'from-indigo-500/10 to-transparent border-indigo-500/20 text-indigo-400 shadow-indigo-500/5',
    rose: 'from-rose-500/10 to-transparent border-rose-500/20 text-rose-400 shadow-rose-500/5'
  };

  const iconBgMap = {
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
  };

  return (
    <div className={`glass-card bg-gradient-to-b ${colorMap[color] || colorMap.sky} p-5 rounded-2xl border shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-slate-600 transition-all`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{value}</h3>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${iconBgMap[color] || iconBgMap.sky}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-slate-400">{subtext}</span>
        {badge && (
          <span className="font-semibold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
