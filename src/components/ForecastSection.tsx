import React, { useState, useEffect, useMemo } from 'react';
import { RegionId, ForecastResponse, DailyForecast } from '../types/psi';
import { TrendingUp, Info, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

interface ForecastSectionProps {
  initialRegion?: RegionId | 'all';
}

export const ForecastSection: React.FC<ForecastSectionProps> = ({
  initialRegion = 'all',
}) => {
  const [horizon, setHorizon] = useState<7 | 14 | 30>(30);
  const [selectedRegion, setSelectedRegion] = useState<string>(initialRegion === 'all' ? 'national' : initialRegion);
  const [showMethodologyModal, setShowMethodologyModal] = useState<boolean>(false);

  const [forecastState, setForecastState] = useState<{
    loading: boolean;
    error: string | null;
    data: ForecastResponse | null;
  }>({
    loading: true,
    error: null,
    data: null,
  });

  // Sync initialRegion
  useEffect(() => {
    if (initialRegion) {
      setSelectedRegion(initialRegion === 'all' ? 'national' : initialRegion);
    }
  }, [initialRegion]);

  const fetchForecast = async () => {
    setForecastState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`/api/forecast?region=${selectedRegion}&horizon=${horizon}`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const json: ForecastResponse = await res.json();
      setForecastState({ loading: false, error: null, data: json });
    } catch (err: any) {
      setForecastState(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to load statistical forecast',
      }));
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [selectedRegion, horizon]);

  // Chart computations: Stitch historical tail + daily forecasts
  const [hoverDay, setHoverDay] = useState<DailyForecast | null>(null);

  const {
    historicalPoints,
    forecastPoints,
    intervalBandPath,
    yMin,
    yMax,
    separatorX,
  } = useMemo(() => {
    const historical = forecastState.data?.historicalTail || [];
    const forecasts = forecastState.data?.dailyForecasts || [];

    if (!historical.length && !forecasts.length) {
      return { historicalPoints: [], forecastPoints: [], intervalBandPath: '', yMin: 0, yMax: 200, separatorX: 0 };
    }

    const allValues = [
      ...historical.map(h => h.actual),
      ...forecasts.map(f => f.predicted),
      ...forecasts.map(f => f.upperBound),
      ...forecasts.map(f => f.lowerBound),
    ];

    const minY = Math.max(0, Math.min(...allValues) - 15);
    const maxY = Math.max(120, Math.max(...allValues) + 20);

    const width = 800;
    const height = 300;
    const padding = { top: 20, right: 30, bottom: 40, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const totalSteps = historical.length + forecasts.length;
    const getX = (idx: number) => padding.left + (idx / (totalSteps - 1)) * chartW;
    const getY = (val: number) => padding.top + chartH - ((val - minY) / (maxY - minY)) * chartH;

    // Historical Points
    const hPts = historical.map((h, idx) => ({
      x: getX(idx),
      y: getY(h.actual),
      date: h.date,
      value: h.actual,
    }));

    // Separator line position between historical and forecast
    const sepX = hPts.length ? hPts[hPts.length - 1].x : padding.left;

    // Forecast Points (starting from last historical point for continuous line)
    const fPts = forecasts.map((f, idx) => {
      const stepIdx = historical.length + idx;
      return {
        x: getX(stepIdx),
        y: getY(f.predicted),
        upperY: getY(f.upperBound),
        lowerY: getY(f.lowerBound),
        forecast: f,
      };
    });

    // Build shaded interval band path
    let bandD = '';
    if (fPts.length > 0 && hPts.length > 0) {
      const lastH = hPts[hPts.length - 1];
      // Start at last historical point
      bandD = `M ${lastH.x.toFixed(1)} ${lastH.y.toFixed(1)}`;
      // Along upper bounds
      for (const p of fPts) {
        bandD += ` L ${p.x.toFixed(1)} ${p.upperY.toFixed(1)}`;
      }
      // Backwards along lower bounds
      for (let i = fPts.length - 1; i >= 0; i--) {
        bandD += ` L ${fPts[i].x.toFixed(1)} ${fPts[i].lowerY.toFixed(1)}`;
      }
      bandD += ' Z';
    }

    return {
      historicalPoints: hPts,
      forecastPoints: fPts,
      intervalBandPath: bandD,
      yMin: minY,
      yMax: maxY,
      separatorX: sepX,
    };
  }, [forecastState.data]);

  const fcData = forecastState.data;
  const validation = fcData?.validation;

  return (
    <section id="forecast" className="w-full">
      {/* Title & Important Disclaimer Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Rolling 30-Day PSI Statistical Forecast
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Statistical projection computed from NEA historical patterns. Not an official NEA forecast.
          </p>
        </div>

        {/* Info button */}
        <button
          onClick={() => setShowMethodologyModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer self-start md:self-auto shadow-xs"
        >
          <Info className="w-3.5 h-3.5 text-blue-500" />
          <span>Forecast Methodology & Backtesting</span>
        </button>
      </div>

      {/* Prominent Legal Disclaimer Badge */}
      <div className="mb-6 p-4 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-slate-900 dark:text-white">Official Disclaimer:</span> The 30-day PSI forecasts are independently generated statistical projections and are not official forecasts or advisories issued by the National Environment Agency (NEA). Forecast uncertainty increases over longer horizons. Do not treat these projections as official haze advisories.
        </div>
      </div>

      {/* Control Ribbon */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Horizon Selector */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Horizon:</span>
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {([7, 14, 30] as const).map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                  horizon === h
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {h} Days
              </button>
            ))}
          </div>
        </div>

        {/* Sector Selector */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Sector:</span>
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setSelectedRegion('national')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                selectedRegion === 'national'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              National
            </button>
            {(['north', 'south', 'east', 'west', 'central'] as RegionId[]).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRegion(r)}
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

        {/* Quick KPI comparison */}
        {fcData && (
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-400">Forecast Avg:</span>{' '}
              <span className="font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200">
                {fcData.summary.predictedMean} PSI
              </span>
            </div>
            <div>
              <span className="text-slate-400">Recent 30d Avg:</span>{' '}
              <span className="font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200">
                {fcData.summary.historicalMean30d} PSI
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Continuous Chart: Solid Historical -> Dashed Forecast + Shaded 80% Band */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs mb-6">
        {forecastState.loading ? (
          <div className="h-72 flex items-center justify-center text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-pulse" />
              <span>Generating rolling statistical forecast with backtesting metrics...</span>
            </div>
          </div>
        ) : forecastState.error ? (
          <div className="h-72 flex items-center justify-center text-sm text-rose-500">
            {forecastState.error}
          </div>
        ) : (
          <div>
            {/* Chart Legend & Interactive Inspection Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-slate-800 dark:bg-slate-200" />
                  <span className="text-slate-600 dark:text-slate-400">Observed History (Solid)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 border-t-2 border-dashed border-emerald-600 dark:border-emerald-400" />
                  <span className="text-slate-600 dark:text-slate-400">Statistical Projection (Dashed)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xs" />
                  <span className="text-slate-600 dark:text-slate-400">80% Prediction Interval</span>
                </div>
              </div>

              {hoverDay && (
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md text-xs font-mono text-slate-800 dark:text-slate-200">
                  <span className="font-semibold">{hoverDay.date}:</span> Predicted{' '}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{hoverDay.predicted} PSI</span>{' '}
                  <span className="text-slate-400">[{hoverDay.lowerBound} – {hoverDay.upperBound}]</span> · {hoverDay.category}
                </div>
              )}
            </div>

            {/* SVG Canvas */}
            <div className="relative w-full aspect-21/9 min-h-[260px] overflow-hidden select-none">
              <svg
                viewBox="0 0 800 300"
                className="w-full h-full overflow-visible"
                onMouseLeave={() => setHoverDay(null)}
              >
                {/* Horizontal Category Thresholds */}
                <line x1="50" y1={20 + 240 - ((50 - yMin) / (yMax - yMin)) * 240} x2="770" y2={20 + 240 - ((50 - yMin) / (yMax - yMin)) * 240} stroke="#10B981" strokeDasharray="3 3" strokeWidth="1" opacity="0.4" />
                <line x1="50" y1={20 + 240 - ((100 - yMin) / (yMax - yMin)) * 240} x2="770" y2={20 + 240 - ((100 - yMin) / (yMax - yMin)) * 240} stroke="#F59E0B" strokeDasharray="3 3" strokeWidth="1" opacity="0.4" />
                <line x1="50" y1={20 + 240 - ((200 - yMin) / (yMax - yMin)) * 240} x2="770" y2={20 + 240 - ((200 - yMin) / (yMax - yMin)) * 240} stroke="#F97316" strokeDasharray="3 3" strokeWidth="1" opacity="0.4" />

                {/* Shaded 80% Prediction Interval Band */}
                {intervalBandPath && (
                  <path
                    d={intervalBandPath}
                    fill="#10B981"
                    fillOpacity="0.12"
                    stroke="#10B981"
                    strokeWidth="0.5"
                    strokeOpacity="0.3"
                  />
                )}

                {/* Vertical Divider at Current Date */}
                {separatorX > 0 && (
                  <g>
                    <line
                      x1={separatorX}
                      y1="20"
                      x2={separatorX}
                      y2="260"
                      stroke="currentColor"
                      className="text-slate-400 dark:text-slate-600"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                    />
                    <text
                      x={separatorX}
                      y="14"
                      fill="currentColor"
                      className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider"
                      textAnchor="middle"
                    >
                      Today
                    </text>
                  </g>
                )}

                {/* Solid Line: Historical Tail */}
                {historicalPoints.length > 0 && (
                  <path
                    d={historicalPoints.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '')}
                    fill="none"
                    stroke="#0F172A"
                    className="dark:stroke-slate-300"
                    strokeWidth="2.5"
                  />
                )}

                {/* Dashed Line: 30-Day Forecast */}
                {forecastPoints.length > 0 && historicalPoints.length > 0 && (
                  <path
                    d={
                      `M ${historicalPoints[historicalPoints.length - 1].x.toFixed(1)} ${historicalPoints[historicalPoints.length - 1].y.toFixed(1)} ` +
                      forecastPoints.reduce((acc, p) => `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '')
                    }
                    fill="none"
                    stroke="#059669"
                    className="dark:stroke-emerald-400"
                    strokeDasharray="5 4"
                    strokeWidth="2.5"
                  />
                )}

                {/* Interactive Points on Forecast Line */}
                {forecastPoints.map((p, idx) => {
                  const isHovered = hoverDay?.date === p.forecast.date;
                  return (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoverDay(p.forecast)}
                    >
                      <rect x={p.x - 8} y="0" width="16" height="300" fill="transparent" />
                      {isHovered && (
                        <>
                          <line x1={p.x} y1="20" x2={p.x} y2="260" stroke="#10B981" strokeDasharray="2 2" strokeWidth="1" />
                          <circle cx={p.x} cy={p.y} r="5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                          <circle cx={p.x} cy={p.upperY} r="3" fill="#10B981" opacity="0.6" />
                          <circle cx={p.x} cy={p.lowerY} r="3" fill="#10B981" opacity="0.6" />
                        </>
                      )}
                    </g>
                  );
                })}

                {/* Base Axis */}
                <line x1="50" y1="260" x2="770" y2="260" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Model Backtesting & Performance Card */}
      {validation && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Backtest MAE (Error)
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              ±{validation.mae} PSI
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Persistence baseline: ±{validation.baselineMae}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Root Mean Sq. Error (RMSE)
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {validation.rmse}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Baseline RMSE: {validation.baselineRmse}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              80% Interval Coverage
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {validation.coverage80Percent}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Actual values within band
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Potential Unhealthy Days
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-orange-600 dark:text-orange-400 mt-1">
              {fcData?.summary.potentialUnhealthyDays ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Days predicted or bound &gt;100
            </div>
          </div>
        </div>
      )}

      {/* Daily Predictions Table */}
      {fcData && fcData.dailyForecasts.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Daily Projection Table ({horizon} Days Horizon)
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Generated: {new Date(fcData.generatedAt).toLocaleDateString()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-medium">
                <tr>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Date (SGT)</th>
                  <th className="px-4 py-3 text-right">Predicted PSI</th>
                  <th className="px-4 py-3 text-center">80% Prediction Interval</th>
                  <th className="px-4 py-3">Air Quality Category</th>
                  <th className="px-4 py-3">Model Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {fcData.dailyForecasts.map((d) => (
                  <tr
                    key={d.date}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-slate-500">
                      +{d.step}d
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white font-mono">
                      {d.date}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white text-sm">
                      {d.predicted}
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      [{d.lowerBound} – {d.upperBound}]
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 font-semibold ${
                        d.category === 'Good' ? 'text-emerald-600 dark:text-emerald-400' :
                        d.category === 'Moderate' ? 'text-amber-600 dark:text-amber-400' :
                        d.category === 'Unhealthy' ? 'text-orange-600 dark:text-orange-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.hex }} />
                        {d.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {d.confidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Methodology Modal */}
      {showMethodologyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span>Forecasting Methodology & Validation</span>
              </h3>
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed">
              <p>
                <strong>Model:</strong> Damped Holt-Winters Triple Exponential Smoothing (ETS) with 7-day weekly seasonality and trend damping factor (damping phi ≈ 0.92).
              </p>
              <p>
                <strong>Prediction Intervals:</strong> 80% empirical intervals computed as y_predicted ± 1.282 × σ × √(1 + α²·h), expanding as the forecast horizon widens from Day 1 to Day 30 to reflect increasing uncertainty.
              </p>
              <p>
                <strong>Backtesting:</strong> Evaluated using rolling-origin cross-validation over recent historical observation periods. Both Mean Absolute Error (MAE) and Root Mean Squared Error (RMSE) are reported alongside a Persistence baseline (y_forecast = y_current).
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-900 dark:text-amber-200">
                <strong>Critical Notice:</strong> Singapore's transboundary haze depends on regional wind patterns, biomass burning in neighboring territories, and monsoonal shifts. These factors are subject to rapid physical fluctuations that purely statistical models cannot fully anticipate. Refer to official NEA daily bulletins for binding advisories.
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
