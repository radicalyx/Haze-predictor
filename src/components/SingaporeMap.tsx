import React from 'react';
import { RegionId, RegionData } from '../types/psi';

interface SingaporeMapProps {
  regions: Record<RegionId, RegionData>;
  selectedRegion: RegionId | 'all';
  onSelectRegion: (region: RegionId | 'all') => void;
}

export const SingaporeMap: React.FC<SingaporeMapProps> = ({
  regions,
  selectedRegion,
  onSelectRegion,
}) => {
  // Region centroids on SVG viewport (0, 0, 800, 480)
  const regionPins: Record<RegionId, { x: number; y: number; labelX: number; labelY: number }> = {
    north: { x: 400, y: 130, labelX: 400, labelY: 85 },
    west: { x: 210, y: 250, labelX: 180, labelY: 200 },
    central: { x: 410, y: 240, labelX: 410, labelY: 205 },
    east: { x: 620, y: 230, labelX: 630, labelY: 180 },
    south: { x: 410, y: 350, labelX: 410, labelY: 395 },
  };

  const getFillColor = (regionId: RegionId) => {
    const psi = regions[regionId]?.psi ?? 0;
    const isSelected = selectedRegion === regionId;
    if (psi <= 50) return isSelected ? '#059669' : '#10B981'; // Good (Emerald)
    if (psi <= 100) return isSelected ? '#D97706' : '#F59E0B'; // Moderate (Amber)
    if (psi <= 200) return isSelected ? '#EA580C' : '#F97316'; // Unhealthy (Orange)
    if (psi <= 300) return isSelected ? '#DC2626' : '#EF4444'; // Very Unhealthy (Red)
    return isSelected ? '#7C3AED' : '#8B5CF6'; // Hazardous (Purple)
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Singapore Regional Ambient Air Map
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Interactive schematic view of NEA's five air quality monitoring sectors.
          </p>
        </div>

        {/* Quick selector buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
          <button
            onClick={() => onSelectRegion('all')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              selectedRegion === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Regions
          </button>
          {(['north', 'south', 'east', 'west', 'central'] as RegionId[]).map((r) => (
            <button
              key={r}
              onClick={() => onSelectRegion(r)}
              className={`px-2 py-1 capitalize rounded-md transition-colors cursor-pointer ${
                selectedRegion === r
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Map Container */}
      <div className="relative w-full aspect-16/9 bg-slate-50 dark:bg-slate-950/60 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800/80 p-2 sm:p-4">
        <svg
          viewBox="0 0 800 480"
          className="w-full h-full select-none"
          role="img"
          aria-label="Schematic Map of Singapore Air Quality Regions"
        >
          {/* Subtle water grid lines */}
          <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" className="text-slate-200/50 dark:text-slate-800/40" strokeWidth="0.5" />
          </pattern>
          <rect width="800" height="480" fill="url(#mapGrid)" />

          {/* Regional Polygons (Stylised Singapore Geography) */}
          {/* WEST REGION */}
          <path
            d="M 120 230 C 130 180, 200 160, 280 180 L 290 280 L 250 340 L 160 360 C 120 330, 90 280, 120 230 Z"
            fill={getFillColor('west')}
            fillOpacity={selectedRegion === 'west' || selectedRegion === 'all' ? 0.35 : 0.12}
            stroke={getFillColor('west')}
            strokeWidth={selectedRegion === 'west' ? 3 : 1.5}
            className="cursor-pointer transition-all hover:fill-opacity-50"
            onClick={() => onSelectRegion('west')}
          />

          {/* NORTH REGION */}
          <path
            d="M 280 180 C 330 120, 430 100, 520 140 L 510 200 L 390 200 L 290 220 Z"
            fill={getFillColor('north')}
            fillOpacity={selectedRegion === 'north' || selectedRegion === 'all' ? 0.35 : 0.12}
            stroke={getFillColor('north')}
            strokeWidth={selectedRegion === 'north' ? 3 : 1.5}
            className="cursor-pointer transition-all hover:fill-opacity-50"
            onClick={() => onSelectRegion('north')}
          />

          {/* CENTRAL REGION */}
          <path
            d="M 290 220 L 390 200 L 510 200 L 490 280 L 360 290 L 290 280 Z"
            fill={getFillColor('central')}
            fillOpacity={selectedRegion === 'central' || selectedRegion === 'all' ? 0.4 : 0.15}
            stroke={getFillColor('central')}
            strokeWidth={selectedRegion === 'central' ? 3 : 1.5}
            className="cursor-pointer transition-all hover:fill-opacity-50"
            onClick={() => onSelectRegion('central')}
          />

          {/* EAST REGION */}
          <path
            d="M 510 200 C 560 160, 680 170, 720 220 C 730 260, 680 290, 570 290 L 490 280 L 510 200 Z"
            fill={getFillColor('east')}
            fillOpacity={selectedRegion === 'east' || selectedRegion === 'all' ? 0.35 : 0.12}
            stroke={getFillColor('east')}
            strokeWidth={selectedRegion === 'east' ? 3 : 1.5}
            className="cursor-pointer transition-all hover:fill-opacity-50"
            onClick={() => onSelectRegion('east')}
          />

          {/* SOUTH REGION */}
          <path
            d="M 330 290 L 490 280 L 530 340 C 470 380, 380 390, 310 350 L 330 290 Z"
            fill={getFillColor('south')}
            fillOpacity={selectedRegion === 'south' || selectedRegion === 'all' ? 0.35 : 0.12}
            stroke={getFillColor('south')}
            strokeWidth={selectedRegion === 'south' ? 3 : 1.5}
            className="cursor-pointer transition-all hover:fill-opacity-50"
            onClick={() => onSelectRegion('south')}
          />

          {/* Sentosa / Southern Islands */}
          <ellipse cx="380" cy="385" rx="35" ry="14" fill={getFillColor('south')} fillOpacity={0.4} stroke={getFillColor('south')} strokeWidth="1" />
          {/* Pulau Ubin / Pulau Tekong in Northeast */}
          <ellipse cx="660" cy="165" rx="30" ry="12" fill={getFillColor('east')} fillOpacity={0.3} stroke={getFillColor('east')} strokeWidth="1" />
          <ellipse cx="720" cy="155" rx="25" ry="18" fill={getFillColor('east')} fillOpacity={0.3} stroke={getFillColor('east')} strokeWidth="1" />

          {/* Interactive Badges & Pins for each region */}
          {(['north', 'south', 'east', 'west', 'central'] as RegionId[]).map((r) => {
            const pin = regionPins[r];
            const data = regions[r];
            if (!data) return null;
            const isSelected = selectedRegion === r;

            return (
              <g
                key={r}
                transform={`translate(${pin.x}, ${pin.y})`}
                className="cursor-pointer group"
                onClick={() => onSelectRegion(r)}
              >
                {/* Ping ring */}
                <circle
                  r={isSelected ? 18 : 12}
                  fill="none"
                  stroke={data.hex}
                  strokeWidth="2"
                  className={isSelected ? 'animate-ping opacity-30' : 'opacity-20'}
                />

                {/* Base circle */}
                <circle
                  r={isSelected ? 22 : 18}
                  fill="#0F172A"
                  stroke={data.hex}
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-all"
                />

                {/* PSI Number */}
                <text
                  textAnchor="middle"
                  dy="5"
                  fill="#FFFFFF"
                  className="font-mono text-xs font-bold tabular-nums pointer-events-none"
                >
                  {data.psi}
                </text>

                {/* Label pill beneath/above */}
                <g transform="translate(0, 34)">
                  <rect
                    x="-45"
                    y="-12"
                    width="90"
                    height="24"
                    rx="6"
                    fill="rgba(15, 23, 42, 0.9)"
                    stroke={data.hex}
                    strokeWidth="1"
                  />
                  <text
                    textAnchor="middle"
                    dy="4"
                    fill="#F8FAFC"
                    className="text-[11px] font-semibold uppercase tracking-wider pointer-events-none"
                  >
                    {data.displayName} · {data.psi}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Disclaimer watermark */}
        <div className="absolute bottom-2 left-3 text-[10px] text-slate-400 dark:text-slate-500">
          Schematic regional boundaries for air quality reporting only. Does not reflect street-level variations.
        </div>
      </div>
    </div>
  );
};
