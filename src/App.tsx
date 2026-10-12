import React, { useState, useEffect } from 'react';
import { PsiCurrentResponse, RegionId } from './types/psi';
import { Header } from './components/Header';
import { CurrentPsiOverview } from './components/CurrentPsiOverview';
import { RegionalCards } from './components/RegionalCards';
import { SingaporeMap } from './components/SingaporeMap';
import { HistoricalTracker } from './components/HistoricalTracker';
import { ForecastSection } from './components/ForecastSection';
import { HealthModal } from './components/HealthModal';
import { Footer } from './components/Footer';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [psiData, setPsiData] = useState<PsiCurrentResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionId | 'all'>('all');
  const [healthModalOpen, setHealthModalOpen] = useState<boolean>(false);

  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sg_psi_dark_mode');
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sg_psi_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sg_psi_dark_mode', 'false');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(prev => !prev);

  // Fetch real-time PSI from /api/psi
  const fetchPsiData = async (force = false) => {
    if (force) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/psi${force ? '?refresh=true' : ''}`);
      if (!res.ok) {
        throw new Error(`Failed to load air quality feed (HTTP ${res.status})`);
      }
      const json: PsiCurrentResponse = await res.json();
      setPsiData(json);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching PSI data:', err);
      if (!psiData) {
        setError(err.message || 'Unable to reach official NEA air quality feed.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPsiData();

    // Auto-refresh every 5 minutes (300,000 ms) as specified
    const interval = setInterval(() => {
      fetchPsiData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col">
      {/* 3-Zone Navigation Header */}
      <Header
        isRefreshing={isRefreshing}
        onRefresh={() => fetchPsiData(true)}
        onOpenHealth={() => setHealthModalOpen(true)}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 dark:text-emerald-400" />
            <p className="font-medium">Connecting to Singapore National Environment Agency (data.gov.sg)...</p>
          </div>
        ) : error && !psiData ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Official Air Quality Service Temporarily Unavailable
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
              {error}
            </p>
            <button
              onClick={() => fetchPsiData(true)}
              className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : psiData ? (
          <>
            {/* Top Section: Live PSI Hero + PM2.5 Panel */}
            <CurrentPsiOverview
              data={psiData}
              onRefresh={() => fetchPsiData(true)}
              isRefreshing={isRefreshing}
            />

            {/* Regional Section: 5-Region Cards & Schematic Singapore Map */}
            <div className="space-y-6">
              <RegionalCards
                regions={psiData.regions}
                selectedRegion={selectedRegion}
                onSelectRegion={setSelectedRegion}
                timestamp={psiData.timestamp}
              />

              <SingaporeMap
                regions={psiData.regions}
                selectedRegion={selectedRegion}
                onSelectRegion={setSelectedRegion}
              />
            </div>

            {/* Middle Section: Historical PSI Tracker */}
            <HistoricalTracker initialRegion={selectedRegion} />

            {/* Bottom Section: 30-Day PSI Forecast */}
            <ForecastSection initialRegion={selectedRegion} />
          </>
        ) : null}
      </main>

      {/* Diagnostics Modal */}
      <HealthModal
        isOpen={healthModalOpen}
        onClose={() => setHealthModalOpen(false)}
      />

      {/* Legal Attribution & Disclaimers Footer */}
      <Footer
        onOpenHealth={() => setHealthModalOpen(true)}
        lastUpdated={psiData?.updatedTimestamp || psiData?.timestamp}
      />
    </div>
  );
}
