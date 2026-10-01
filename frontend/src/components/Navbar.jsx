import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Cloud, LogOut, UploadCloud, BarChart3, Radio, ShieldCheck } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, dbMode }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
      {/* Left: Branding */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Cloud className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg text-white tracking-tight">CloudCost AI</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
              POC v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400">ML EC2 Capacity & Cost Optimizer</p>
        </div>
      </div>

      {/* Center: Navigation Tabs */}
      <nav className="flex items-center space-x-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'dashboard'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'upload'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Data Ingestion</span>
        </button>

        <button
          onClick={() => setActiveTab('aws')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'aws'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>AWS CloudWatch</span>
        </button>
      </nav>

      {/* Right: User info & Logout */}
      <div className="flex items-center space-x-4">
        {dbMode && (
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{dbMode.includes('MySQL') ? 'MySQL Connected' : 'Demo DB Mode'}</span>
          </div>
        )}

        <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-slate-200">{user?.name || 'DevOps Engineer'}</p>
            <p className="text-[11px] text-slate-400">{user?.email || 'admin@cloudopt.io'}</p>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 border border-slate-700/50 hover:border-rose-800/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
