import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import AwsCloudWatchSection from './components/AwsCloudWatchSection';
import Navbar from './components/Navbar';

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dbMode, setDbMode] = useState('MySQL (Active)');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
          <p className="text-xs">Initializing CloudCost AI...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-sky-500 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dbMode={dbMode}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'dashboard' && (
          <DashboardPage onNavigateToUpload={() => setActiveTab('upload')} />
        )}

        {activeTab === 'upload' && (
          <UploadPage onUploadComplete={() => setActiveTab('dashboard')} />
        )}

        {activeTab === 'aws' && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight">AWS EC2 Telemetry & Dry-Run Engine</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Direct CloudWatch GetMetricData integration with simulated on-demand pricing arbitrage
              </p>
            </div>
            <AwsCloudWatchSection />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-900 px-6 py-4 text-center text-xs text-slate-500">
        CloudCost AI POC &bull; College Capstone Project &bull; Built with React, Express, Flask, MySQL & AWS CloudWatch
      </footer>
    </div>
  );
}
