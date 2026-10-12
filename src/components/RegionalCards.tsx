import React from 'react';
import { RegionId, RegionData } from '../types/psi';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RegionalCardsProps {
  regions: Record<RegionId, RegionData>;
  selectedRegion: RegionId | 'all';
  onSelectRegion: (region: RegionId | 'all') => void;
  timestamp: string;
}

export const RegionalCards: React.FC<RegionalCardsProps> = ({
  regions,
  selectedRegion,
  onSelectRegion,
}) => {
  const regionList: RegionId[] = ['north', 'south', 'east', 'west', 'central'];

  const getBorderColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'good': return 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10';
      case 'moderate': return 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10';
      case 'unhealthy': return 'border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-500/10';
      case 'very unhealthy': return 'border-red-500/40 text-red-600 dark:text-red-400 bg-red-500/10';
      case 'hazardous': return 'border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10';
      default: return 'border-slate-500/40 text-slate-600 dark:text-slate-400 bg-slate-500/10';
    }
  };

  const maxRegionalPsi = Math.max(...regionList.map(r => regions[r]?.psi || 0), 100);

  return (
    <section id="regions" className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Regional Observations & Comparison
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time pollutant breakdown across the 5 official sectors. Select a sector to inspect historical trends.
          </p>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Click any card to filter charts
        </div>
      </div>

      {/* 5 Region Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {regionList.map((rId) => {
          const item = regions[rId];
          if (!item) return null;
          const isSelected = selectedRegion === rId;
          const badgeClass = getBorderColor(item.category);

          return (
            <div
              key={rId}
              onClick={() => onSelectRegion(isSelected ? 'all' : rId)}
              className={`rounded-xl border p-5 cursor-pointer transition-all ${
                isSelected
                  ? 'border-slate-900 dark:border-white ring-2 ring-slate-900/10 dark:ring-white/20 bg-slate-50/80 dark:bg-slate-800/80'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {item.displayName}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                  {item.category}
                </span>
              </div>

              {/* Core PSI Value */}
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <div>
                  <div className="text-3xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                    {item.psi}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    24-hr PSI
                  </div>
                </div>

                {/* Trend vs previous reading */}
                <div className="text-right">
                  {item.change !== 0 ? (
                    <div className={`flex items-center justify-end gap-1 text-xs font-semibold tabular-nums ${item.change > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {item.change > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <span>{item.change > 0 ? `+${item.change}` : item.change}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1 text-xs text-slate-400">
                      <Minus className="w-3.5 h-3.5" />
                      <span>0</span>
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400">vs prev hr</div>
                </div>
              </div>

              {/* PM2.5 secondary indicator */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">1-hr PM2.5:</span>
                <span className="font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                  {item.pm25 !== null ? `${item.pm25} µg/m³` : '--'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Regional Comparison Horizontal Bar Chart */}
      <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4 flex items-center justify-between">
          <span>Comparative Regional Index Distribution</span>
          <span className="text-[11px] font-normal">Reference Lines: Good (50) · Moderate (100) · Unhealthy (200)</span>
        </div>

        <div className="space-y-3.5">
          {regionList.map((rId) => {
            const item = regions[rId];
            if (!item) return null;
            const pct = Math.min(100, Math.round((item.psi / Math.max(maxRegionalPsi, 200)) * 100));

            return (
              <div key={rId} className="flex items-center gap-3 text-xs">
                <div className="w-16 font-medium text-slate-700 dark:text-slate-300 capitalize shrink-0">
                  {item.displayName}
                </div>
                <div className="relative flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  {/* Threshold markers */}
                  <div className="absolute top-0 bottom-0 w-[1px] bg-slate-300 dark:bg-slate-700 z-10" style={{ left: `${(50 / Math.max(maxRegionalPsi, 200)) * 100}%` }} title="Good / Moderate boundary (50)" />
                  <div className="absolute top-0 bottom-0 w-[1px] bg-slate-300 dark:bg-slate-700 z-10" style={{ left: `${(100 / Math.max(maxRegionalPsi, 200)) * 100}%` }} title="Moderate / Unhealthy boundary (100)" />
                  
                  {/* Bar fill */}
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: item.hex,
                    }}
                  />
                </div>
                <div className="w-12 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white shrink-0">
                  {item.psi}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
