import React, { useState, useEffect } from 'react';
import { HealthResponse } from '../types/psi';
import { Activity, CheckCircle, AlertTriangle, RefreshCw, X, Server, Database, Cpu } from 'lucide-react';

interface HealthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HealthModal: React.FC<HealthModalProps> = ({ isOpen, onClose }) => {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: HealthResponse = await res.json();
      setHealthData(data);
    } catch (err: any) {
      setError(err.message || 'Health check failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              System Health & Data Source Diagnostics
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-sm text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
            <span>Probing official upstream endpoints and forecasting services...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Failed to probe health endpoint: {error}</span>
          </div>
        ) : healthData ? (
          <div className="space-y-4 text-xs">
            {/* Overall Status Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              healthData.status === 'healthy'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}>
              <div className="flex items-center gap-2.5">
                {healthData.status === 'healthy' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                )}
                <div>
                  <div className="font-bold text-sm capitalize">
                    System State: {healthData.status}
                  </div>
                  <div className="text-[11px] opacity-80">
                    Round-trip diagnostic probe completed in {healthData.latencyMs}ms
                  </div>
                </div>
              </div>
              <button
                onClick={fetchHealth}
                className="p-1.5 rounded-lg bg-white/60 dark:bg-black/30 hover:bg-white dark:hover:bg-black/50 transition-colors cursor-pointer"
                title="Re-run health probe"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Diagnostic Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Upstream NEA API */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 mb-2 font-semibold text-slate-900 dark:text-white">
                  <Server className="w-4 h-4 text-blue-500" />
                  <span>Upstream NEA</span>
                </div>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <div>Status: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{healthData.upstreamDataSource.reachable ? 'Reachable (200)' : 'Unreachable'}</span></div>
                  <div>Portal: {healthData.upstreamDataSource.portal}</div>
                  <div className="truncate">Source: NEA Official</div>
                </div>
              </div>

              {/* Historical Archive */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 mb-2 font-semibold text-slate-900 dark:text-white">
                  <Database className="w-4 h-4 text-purple-500" />
                  <span>History Archive</span>
                </div>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <div>Records: <span className="font-semibold font-mono tabular-nums">{healthData.historicalDatabase.totalDailyRecords} days</span></div>
                  <div>Loaded: {healthData.historicalDatabase.loaded ? 'Active' : 'Missing'}</div>
                  <div className="truncate">Span: 5+ Years</div>
                </div>
              </div>

              {/* Forecasting Engine */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 mb-2 font-semibold text-slate-900 dark:text-white">
                  <Cpu className="w-4 h-4 text-teal-500" />
                  <span>Forecast Engine</span>
                </div>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <div>State: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{healthData.forecastingEngine.operational ? 'Operational' : 'Inactive'}</span></div>
                  <div>Horizon: 30 Calendar Days</div>
                  <div className="truncate">ETS-7 Model</div>
                </div>
              </div>
            </div>

            {/* Runtime Info */}
            <div className="pt-2 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
              <div>Runtime: {healthData.environment.runtime} · Node {healthData.environment.nodeVersion}</div>
              <div>Checked: {new Date(healthData.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        ) : null}

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
