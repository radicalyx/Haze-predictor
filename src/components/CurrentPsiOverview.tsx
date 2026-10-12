import React from 'react';
import { PsiCurrentResponse } from '../types/psi';
import { TrendingUp, TrendingDown, Minus, Wind, Thermometer, Droplets, AlertTriangle } from 'lucide-react';

interface CurrentPsiOverviewProps {
  data: PsiCurrentResponse;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const CurrentPsiOverview: React.FC<CurrentPsiOverviewProps> = ({
  data,
}) => {
  const { summary, regions, weather, timestamp, isStale, staleReason } = data;

  // Format Singapore timestamp (SGT is UTC+8)
  const formatSgt = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-SG', {
        timeZone: 'Asia/Singapore',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const getCategoryStyles = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'good':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40',
          border: 'border-emerald-200 dark:border-emerald-800',
          text: 'text-emerald-700 dark:text-emerald-300',
          badge: 'bg-emerald-500',
        };
      case 'moderate':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40',
          border: 'border-amber-200 dark:border-amber-800',
          text: 'text-amber-700 dark:text-amber-300',
          badge: 'bg-amber-500',
        };
      case 'unhealthy':
        return {
          bg: 'bg-orange-50 dark:bg-orange-950/40',
          border: 'border-orange-200 dark:border-orange-800',
          text: 'text-orange-700 dark:text-orange-300',
          badge: 'bg-orange-500',
        };
      case 'very unhealthy':
        return {
          bg: 'bg-red-50 dark:bg-red-950/40',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-300',
          badge: 'bg-red-500',
        };
      case 'hazardous':
        return {
          bg: 'bg-purple-50 dark:bg-purple-950/40',
          border: 'border-purple-200 dark:border-purple-800',
          text: 'text-purple-700 dark:text-purple-300',
          badge: 'bg-purple-500',
        };
      default:
        return {
          bg: 'bg-slate-50 dark:bg-slate-800',
          border: 'border-slate-200 dark:border-slate-700',
          text: 'text-slate-700 dark:text-slate-300',
          badge: 'bg-slate-500',
        };
    }
  };

  const catStyle = getCategoryStyles(summary.overallCategory);

  // Highest PM2.5 calculation
  const pm25Values = Object.values(regions).map(r => r.pm25).filter((v): v is number => v !== null);
  const highestPm25 = pm25Values.length ? Math.max(...pm25Values) : null;
  const avgPm25 = pm25Values.length ? Math.round(pm25Values.reduce((a, b) => a + b, 0) / pm25Values.length) : null;

  return (
    <section id="overview" className="w-full">
      {/* Staleness Banner if applicable */}
      {isStale && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 dark:text-amber-200">
            <span className="font-semibold">Notice:</span> {staleReason || 'Displaying last known official observation while upstream service updates.'}
          </div>
        </div>
      )}

      {/* Main Grid: PSI Hero + PM2.5 & Weather Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Dominant 24-hr PSI Focal Anchor (7 cols) */}
        <div className={`lg:col-span-7 rounded-2xl border ${catStyle.border} ${catStyle.bg} p-6 sm:p-8 flex flex-col justify-between transition-all`}>
          <div>
            {/* Top metadata strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">National 24-Hour PSI</span>
                <span aria-hidden="true">·</span>
                <span>Observation: {formatSgt(timestamp)} SGT</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Official Feed</span>
              </div>
            </div>

            {/* Core numbers */}
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-4 sm:gap-8 my-3">
              <div>
                <div className="text-6xl sm:text-7xl font-extrabold tracking-tight font-mono tabular-nums text-slate-900 dark:text-white">
                  {summary.highest.psi}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  Highest Regional Index ({summary.highest.displayName})
                </div>
              </div>

              <div className="sm:border-l sm:border-slate-200 dark:sm:border-slate-800 sm:pl-8">
                <div className="text-3xl sm:text-4xl font-bold tracking-tight font-mono tabular-nums text-slate-700 dark:text-slate-200">
                  {summary.nationalAverage}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  National 5-Region Average
                </div>
              </div>
            </div>

            {/* Classification Banner */}
            <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${catStyle.badge}`} />
                <h3 className={`text-xl font-bold tracking-tight ${catStyle.text}`}>
                  {summary.overallCategory}
                </h3>
                {summary.changeFromPrevious !== 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {summary.changeFromPrevious > 0 ? (
                      <>
                        <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
                        <span className="tabular-nums">+{summary.changeFromPrevious} pts</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="tabular-nums">{summary.changeFromPrevious} pts</span>
                      </>
                    )}
                    <span className="text-slate-400 font-normal">vs prev hr</span>
                  </span>
                )}
                {summary.changeFromPrevious === 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                    <Minus className="w-3 h-3" /> Unchanged
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {summary.overallDescription}
              </p>
            </div>
          </div>

          {/* Quick Regional Footprint */}
          <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Lowest PSI</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 font-mono tabular-nums">
                {summary.lowest.psi} ({summary.lowest.displayName})
              </div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Regional Spread</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 font-mono tabular-nums">
                {summary.highest.psi - summary.lowest.psi} pts
              </div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Advisory Index</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                24-Hour PSI
              </div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Dataset Source</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                NEA data.gov.sg
              </div>
            </div>
          </div>
        </div>

        {/* Right: Dedicated PM2.5 Panel & Ambient Meteorology (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* PM2.5 Panel */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex-1 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
                <span className="font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  1-Hour PM2.5 Concentration
                </span>
                <span className="font-mono">µg/m³</span>
              </div>

              <div className="flex items-baseline gap-4 my-2">
                <div className="text-5xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                  {highestPm25 !== null ? highestPm25 : '--'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Peak Regional Reading
                  </span>
                  {avgPm25 !== null && (
                    <div className="font-mono tabular-nums mt-0.5">
                      Avg: {avgPm25} µg/m³
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                <div className="flex items-center justify-between font-medium">
                  <span>NEA 1-Hour Band:</span>
                  <span className={highestPm25 && highestPm25 > 55 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                    {highestPm25 && highestPm25 > 55 ? (highestPm25 > 150 ? 'High' : 'Elevated') : 'Normal (≤55 µg/m³)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  NEA recommends using 1-hr PM2.5 to guide immediate activity decisions (e.g. outdoor exercise), and 24-hr PSI for whole-day health planning.
                </p>
              </div>
            </div>

            {/* PM2.5 Scale reference bar */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-4 gap-1 text-[10px] text-center text-slate-500 dark:text-slate-400">
                <div className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 py-1 rounded font-medium">
                  0–55 Normal
                </div>
                <div className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 py-1 rounded font-medium">
                  56–150 Elev.
                </div>
                <div className="bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 py-1 rounded font-medium">
                  151–250 High
                </div>
                <div className="bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 py-1 rounded font-medium">
                  &gt;250 V.High
                </div>
              </div>
            </div>
          </div>

          {/* Meteorology Strip */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4.5 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
              <span>Ambient Weather Conditions</span>
              <span className="text-[11px] font-normal">Singapore NEA Stations</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Thermometer className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {weather?.temperature ? `${weather.temperature}°C` : '--'}
                  </div>
                  <div className="text-[11px] text-slate-500">Air Temp</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Droplets className="w-4 h-4 text-sky-500" />
                </div>
                <div>
                  <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {weather?.relativeHumidity ? `${weather.relativeHumidity}%` : '--'}
                  </div>
                  <div className="text-[11px] text-slate-500">Humidity</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Wind className="w-4 h-4 text-teal-500" />
                </div>
                <div>
                  <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {weather?.windSpeed ? `${weather.windSpeed} km/h` : '--'}
                  </div>
                  <div className="text-[11px] text-slate-500">Wind</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
