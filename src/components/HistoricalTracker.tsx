import React, { useState, useEffect, useMemo } from 'react';
import { RegionId, HistoricalResponse, HistoricalObservation } from '../types/psi';
import { Download, AlertCircle, Filter, Calendar } from 'lucide-react';

interface HistoricalTrackerProps {
  initialRegion?: RegionId | 'all';
}

export const HistoricalTracker: React.FC<HistoricalTrackerProps> = ({
  initialRegion = 'all',
}) => {
  const [range, setRange] = useState<'24h' | '7d' | '30d' | '90d' | '1y' | '5y' | 'custom'>('30d');
  const [selectedRegion, setSelectedRegion] = useState<RegionId | 'all' | 'national'>(initialRegion);
  const [aggregation, setAggregation] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [customStart, setCustomStart] = useState<string>('2026-08-01');
  const [customEnd, setCustomEnd] = useState<string>('2026-10-12');
  
  const [dataState, setDataState] = useState<{
    loading: boolean;
    error: string | null;
    history: HistoricalResponse | null;
  }>({
    loading: true,
    error: null,
    history: null,
  });

  // Sync external region change if provided
  useEffect(() => {
    if (initialRegion) {
      setSelectedRegion(initialRegion);
    }
  }, [initialRegion]);

  // Fetch history when filters change
  const fetchHistory = async () => {
    setDataState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const params = new URLSearchParams({
        region: selectedRegion,
        range,
        aggregation: (range === '24h' || range === '7d') && aggregation === 'hourly' ? 'hourly' : aggregation,
      });

      if (range === 'custom') {
        params.set('startDate', customStart);
        params.set('endDate', customEnd);
      }

      const res = await fetch(`/api/history?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const json: HistoricalResponse = await res.json();
      setDataState({ loading: false, error: null, history: json });
    } catch (err: any) {
      setDataState(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to fetch historical observations',
      }));
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [range, selectedRegion, aggregation, customStart, customEnd]);

  // Adjust aggregation default based on range
  const handleRangeChange = (newRange: typeof range) => {
    setRange(newRange);
    if (newRange === '24h') {
      setAggregation('hourly');
    } else if (newRange === '7d') {
      setAggregation('daily');
    } else if (newRange === '1y' || newRange === '5y') {
      if (aggregation === 'hourly') setAggregation('daily');
    }
  };

  const handleDownloadCsv = () => {
    const params = new URLSearchParams({
      region: selectedRegion,
      range,
      aggregation,
      format: 'csv',
    });
    if (range === 'custom') {
      params.set('startDate', customStart);
      params.set('endDate', customEnd);
    }
    window.location.href = `/api/history?${params.toString()}`;
  };

  // SVG Chart Geometry calculations
  const chartObservations = dataState.history?.data || [];
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { points, yMin, yMax, svgPath, multiPaths } = useMemo(() => {
    if (!chartObservations.length) {
      return { points: [], yMin: 0, yMax: 200, svgPath: '', multiPaths: {} };
    }

    const values = chartObservations.map(o => {
      if (selectedRegion === 'all' || selectedRegion === 'national') return o.national;
      return (o as any)[selectedRegion] ?? o.national;
    });

    const calculatedMin = Math.max(0, Math.min(...values, 20) - 10);
    const calculatedMax = Math.max(120, Math.max(...values) + 15);

    const width = 800;
    const height = 300;
    const padding = { top: 20, right: 30, bottom: 40, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const count = chartObservations.length;
    const getX = (idx: number) => padding.left + (count === 1 ? chartW / 2 : (idx / (count - 1)) * chartW);
    const getY = (val: number) => padding.top + chartH - ((val - calculatedMin) / (calculatedMax - calculatedMin)) * chartH;

    const pts = chartObservations.map((obs, idx) => ({
      x: getX(idx),
      y: getY(values[idx]),
      obs,
      value: values[idx],
    }));

    // SVG path string
    const pathD = pts.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');

    // If "All Regions" is chosen, build line paths for each region
    const regionKeys: RegionId[] = ['north', 'south', 'east', 'west', 'central'];
    const regionColors: Record<RegionId, string> = {
      north: '#3B82F6',   // blue
      south: '#10B981',   // emerald
      east: '#8B5CF6',    // purple
      west: '#F97316',    // orange
      central: '#EC4899', // pink
    };

    const mPaths: Record<string, string> = {};
    if (selectedRegion === 'all') {
      for (const rk of regionKeys) {
        mPaths[rk] = chartObservations.reduce((acc, obs, idx) => {
          const val = (obs as any)[rk] ?? obs.national;
          const px = getX(idx);
          const py = getY(val);
          return `${acc} ${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
        }, '');
      }
    }

    return {
      points: pts,
      yMin: calculatedMin,
      yMax: calculatedMax,
      svgPath: pathD,
      multiPaths: mPaths,
    };
  }, [chartObservations, selectedRegion]);

  const stats = dataState.history?.statistics;

  return (
    <section id="historical" className="w-full">
      {/* Section Header & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Historical PSI Trends & Archive
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verified Singapore NEA observations from 2021 to {dataState.history?.endDate || 'present'}.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* CSV Download */}
          <button
            onClick={handleDownloadCsv}
            disabled={dataState.loading || !chartObservations.length}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Ribbon: Range, Region, Aggregation */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs mb-6 space-y-4">
        {/* Row 1: Time Horizon Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300 mr-2">Range:</span>
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {(['24h', '7d', '30d', '90d', '1y', '5y', 'custom'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRangeChange(r)}
                  className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer capitalize ${
                    range === r
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {r === '24h' ? '24 Hours' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : r === '1y' ? '1 Year' : r === '5y' ? '5 Years' : 'Custom'}
                </button>
              ))}
            </div>
          </div>

          {/* Aggregation Control */}
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300 mr-2">Aggregation:</span>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {range === '24h' || range === '7d' ? (
                <button
                  onClick={() => setAggregation('hourly')}
                  className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                    aggregation === 'hourly'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Hourly
                </button>
              ) : null}
              <button
                onClick={() => setAggregation('daily')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                  aggregation === 'daily'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setAggregation('weekly')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                  aggregation === 'weekly'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setAggregation('monthly')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                  aggregation === 'monthly'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Sector filter & Custom date range if active */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300 mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Sector:</span>
            </span>
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                onClick={() => setSelectedRegion('all')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  selectedRegion === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All 5 Sectors
              </button>
              <button
                onClick={() => setSelectedRegion('national')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  selectedRegion === 'national'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                National Avg
              </button>
              {(['north', 'south', 'east', 'west', 'central'] as RegionId[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRegion(r)}
                  className={`px-2 py-1 capitalize rounded-md transition-colors cursor-pointer ${
                    selectedRegion === r
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Pickers */}
          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-transparent text-slate-900 dark:text-white text-xs border-none outline-hidden"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-transparent text-slate-900 dark:text-white text-xs border-none outline-hidden"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analytics KPI Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Period Maximum</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {stats.max}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Peak PSI observation</div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Period Minimum</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {stats.min}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Lowest recorded PSI</div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Mean (Average)</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {stats.average}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Arithmetic mean</div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Median PSI</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {stats.median}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">50th percentile</div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Unhealthy Days (&gt;100)</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-orange-600 dark:text-orange-400 mt-1">
              {stats.daysExceeding100}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{stats.percentageUnhealthy}% of period</div>
          </div>
        </div>
      )}

      {/* Main Interactive Chart Container */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
        {dataState.loading ? (
          <div className="h-72 flex items-center justify-center text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-pulse" />
              <span>Loading verified NEA historical observations...</span>
            </div>
          </div>
        ) : dataState.error ? (
          <div className="h-72 flex items-center justify-center text-sm text-rose-500 gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{dataState.error}</span>
          </div>
        ) : !chartObservations.length ? (
          <div className="h-72 flex items-center justify-center text-sm text-slate-400">
            No observation data available for the specified date range.
          </div>
        ) : (
          <div>
            {/* Legend & Tooltip strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
              <div className="flex items-center gap-3">
                {selectedRegion === 'all' ? (
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> North</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> South</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> East</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> West</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pink-500" /> Central</span>
                  </div>
                ) : (
                  <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                    {selectedRegion === 'national' ? 'National Average' : `${selectedRegion} Sector`} PSI
                  </span>
                )}
                {dataState.history?.aggregation && dataState.history.aggregation !== 'daily' && (
                  <span className="text-slate-400 italic">({dataState.history.aggregation} average)</span>
                )}
              </div>

              {/* Hover observation info */}
              {hoverIndex !== null && chartObservations[hoverIndex] && (
                <div className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                  <span>{chartObservations[hoverIndex].label || chartObservations[hoverIndex].date || chartObservations[hoverIndex].timestamp}: </span>
                  <span className="font-bold">
                    {selectedRegion === 'all' || selectedRegion === 'national'
                      ? `${chartObservations[hoverIndex].national} PSI`
                      : `${(chartObservations[hoverIndex] as any)[selectedRegion]} PSI`}
                  </span>
                </div>
              )}
            </div>

            {/* SVG Line Chart */}
            <div className="relative w-full aspect-21/9 min-h-[260px] overflow-hidden select-none">
              <svg
                viewBox="0 0 800 300"
                className="w-full h-full overflow-visible"
                onMouseLeave={() => setHoverIndex(null)}
              >
                {/* Horizontal Category Thresholds */}
                {/* 50 = Good limit */}
                {50 >= yMin && 50 <= yMax && (
                  <g>
                    <line
                      x1="50"
                      y1={20 + 240 - ((50 - yMin) / (yMax - yMin)) * 240}
                      x2="770"
                      y2={20 + 240 - ((50 - yMin) / (yMax - yMin)) * 240}
                      stroke="#10B981"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                      opacity="0.4"
                    />
                    <text x="55" y={20 + 240 - ((50 - yMin) / (yMax - yMin)) * 240 - 4} fill="#10B981" fontSize="9" opacity="0.8">
                      50 Good
                    </text>
                  </g>
                )}

                {/* 100 = Moderate limit */}
                {100 >= yMin && 100 <= yMax && (
                  <g>
                    <line
                      x1="50"
                      y1={20 + 240 - ((100 - yMin) / (yMax - yMin)) * 240}
                      x2="770"
                      y2={20 + 240 - ((100 - yMin) / (yMax - yMin)) * 240}
                      stroke="#F59E0B"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                      opacity="0.4"
                    />
                    <text x="55" y={20 + 240 - ((100 - yMin) / (yMax - yMin)) * 240 - 4} fill="#F59E0B" fontSize="9" opacity="0.8">
                      100 Moderate
                    </text>
                  </g>
                )}

                {/* 200 = Unhealthy limit */}
                {200 >= yMin && 200 <= yMax && (
                  <g>
                    <line
                      x1="50"
                      y1={20 + 240 - ((200 - yMin) / (yMax - yMin)) * 240}
                      x2="770"
                      y2={20 + 240 - ((200 - yMin) / (yMax - yMin)) * 240}
                      stroke="#F97316"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                      opacity="0.4"
                    />
                    <text x="55" y={20 + 240 - ((200 - yMin) / (yMax - yMin)) * 240 - 4} fill="#F97316" fontSize="9" opacity="0.8">
                      200 Unhealthy
                    </text>
                  </g>
                )}

                {/* All Regions Multi-lines */}
                {selectedRegion === 'all' ? (
                  <>
                    <path d={multiPaths.north} fill="none" stroke="#3B82F6" strokeWidth="1.5" opacity="0.8" />
                    <path d={multiPaths.south} fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0.8" />
                    <path d={multiPaths.east} fill="none" stroke="#8B5CF6" strokeWidth="1.5" opacity="0.8" />
                    <path d={multiPaths.west} fill="none" stroke="#F97316" strokeWidth="1.5" opacity="0.8" />
                    <path d={multiPaths.central} fill="none" stroke="#EC4899" strokeWidth="1.5" opacity="0.8" />
                    {/* Bold National Average line */}
                    <path d={svgPath} fill="none" stroke="#0F172A" className="dark:stroke-white" strokeWidth="2.5" />
                  </>
                ) : (
                  <path
                    d={svgPath}
                    fill="none"
                    stroke="#0F172A"
                    className="dark:stroke-emerald-400"
                    strokeWidth="2"
                  />
                )}

                {/* Crosshair & Points */}
                {points.map((p, idx) => {
                  const isHovered = hoverIndex === idx;
                  return (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoverIndex(idx)}
                    >
                      {/* Transparent wider hover target */}
                      <rect
                        x={p.x - 10}
                        y="0"
                        width="20"
                        height="300"
                        fill="transparent"
                      />
                      {isHovered && (
                        <>
                          <line
                            x1={p.x}
                            y1="20"
                            x2={p.x}
                            y2="260"
                            stroke="currentColor"
                            className="text-slate-400"
                            strokeDasharray="2 2"
                            strokeWidth="1"
                          />
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="5"
                            fill="#0F172A"
                            className="dark:fill-white"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                          />
                        </>
                      )}
                    </g>
                  );
                })}

                {/* X Axis Base Line */}
                <line x1="50" y1="260" x2="770" y2="260" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />

                {/* Date labels at intervals */}
                {points.length > 0 && (
                  <>
                    <text x="50" y="278" fill="currentColor" className="text-slate-400 text-[10px]" textAnchor="start">
                      {points[0].obs.label || points[0].obs.date || points[0].obs.timestamp?.slice(0, 10)}
                    </text>
                    <text x="410" y="278" fill="currentColor" className="text-slate-400 text-[10px]" textAnchor="middle">
                      {points[Math.floor(points.length / 2)]?.obs.label || points[Math.floor(points.length / 2)]?.obs.date}
                    </text>
                    <text x="770" y="278" fill="currentColor" className="text-slate-400 text-[10px]" textAnchor="end">
                      {points[points.length - 1].obs.label || points[points.length - 1].obs.date}
                    </text>
                  </>
                )}
              </svg>
            </div>
          </div>
        )}

        {/* Missing Periods Banner if any */}
        {dataState.history?.missingPeriods && dataState.history.missingPeriods.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <span className="font-semibold">Note on gaps:</span> {dataState.history.missingPeriods.length} period(s) have unrecorded NEA station observations during sensor maintenance. Gaps are preserved as unrecorded periods rather than filled with interpolated estimates.
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
