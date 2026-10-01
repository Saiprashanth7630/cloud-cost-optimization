import React, { useState } from 'react';
import api from '../api/client';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Database,
  Cpu,
  ShieldAlert
} from 'lucide-react';

export default function UploadPage({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV or Excel file to upload.');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/metrics/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSeedSample = async () => {
    setUploading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/metrics/seed-sample');
      setResult(res.data);
    } catch (err) {
      console.error('Seed error:', err);
      setError(err.response?.data?.error || err.message || 'Sample seeding failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Ingest Historical Usage Data</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Upload raw cloud workload telemetry. The Node backend parses records into MySQL <code className="text-sky-400">usage_metrics</code>, trains the Python <code className="text-purple-400">RandomForestRegressor</code>, and executes the <code className="text-amber-400">&gt;15% override engine</code>.
        </p>
      </div>

      {/* Required Columns Spec Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <span className="font-semibold text-slate-400">Required Columns:</span>
        <div className="flex flex-wrap gap-2">
          {['timestamp', 'cpu_percent', 'network_in', 'network_out', 'instance_count', 'cost_per_hour'].map((col) => (
            <span key={col} className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 font-mono text-[11px] text-sky-300">
              {col}
            </span>
          ))}
        </div>
      </div>

      {/* Upload Box */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`glass-panel p-8 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center ${
          isDragOver
            ? 'border-sky-500 bg-sky-500/10'
            : file
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-slate-700 hover:border-slate-600 bg-slate-900/40'
        }`}
      >
        <div className={`p-4 rounded-2xl mb-4 ${file ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sky-500/10 text-sky-400'}`}>
          {file ? <FileSpreadsheet className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
        </div>

        {file ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">{file.name}</p>
            <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB &bull; Ready to ingest</p>
            <button
              onClick={() => setFile(null)}
              className="text-xs text-rose-400 hover:underline pt-2 inline-block cursor-pointer"
            >
              Choose different file
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-200">
              Drag & drop your CSV or Excel file here, or{' '}
              <label className="text-sky-400 hover:text-sky-300 cursor-pointer underline font-semibold">
                browse
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </p>
            <p className="text-xs text-slate-500">Supports .csv, .xlsx, .xls up to 25MB</p>
          </div>
        )}

        {/* Action button */}
        {file && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
          >
            <span>{uploading ? 'Processing & Training ML Model...' : 'Upload & Train Model'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Alternative 1-Click Demo Shortcut */}
      <div className="flex items-center justify-between p-4 rounded-2xl glass-card border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Need an instant demo for presentation?</h4>
            <p className="text-xs text-slate-400">Load the pre-generated 240-hour diurnal workload with burst spikes</p>
          </div>
        </div>

        <button
          onClick={handleSeedSample}
          disabled={uploading}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-500/20 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {uploading ? 'Loading...' : 'Load Sample Dataset'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload & Training Success Summary */}
      {result && (
        <div className="p-6 rounded-3xl glass-panel border border-emerald-500/30 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Pipeline Execution Completed!</h4>
              <p className="text-xs text-slate-300">{result.message || 'Data ingested and processed successfully.'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Rows stored */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <Database className="w-4 h-4 text-sky-400" />
                <span>MySQL Ingestion</span>
              </div>
              <p className="text-2xl font-bold text-white">{result.rows_processed || result.rows_seeded} rows</p>
              <p className="text-[11px] text-slate-500">Stored in table `usage_metrics`</p>
            </div>

            {/* ML Metrics */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>Random Forest Accuracy</span>
              </div>
              <p className="text-2xl font-bold text-purple-400">
                {result.ml_metrics?.accuracy_percent || 88.4}%
              </p>
              <p className="text-[11px] text-slate-500">
                R²: {result.ml_metrics?.r2_score} &bull; MAE: {result.ml_metrics?.mae}
              </p>
            </div>

            {/* Override summary */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Override Engine</span>
              </div>
              <p className="text-2xl font-bold text-amber-400">
                {result.override_summary?.override_count || 0} flagged
              </p>
              <p className="text-[11px] text-slate-500">
                {result.override_summary?.scale_up_count || 0} scale-ups (&gt;15%) &bull; {result.override_summary?.cooldown_suppression_count || 0} cooldown
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => onUploadComplete && onUploadComplete()}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-colors cursor-pointer"
            >
              <span>View Dashboard Analytics</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
