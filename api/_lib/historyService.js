/**
 * Historical PSI Service
 * Reads official NEA historical records and fetches recent hourly data with caching.
 */

import fs from 'node:fs';
import path from 'node:path';
import { getPsiCategory } from './psiService.js';

let historicalRecords = null;
const hourlyCache = new Map(); // dateStr -> items[]

function loadHistoricalData() {
  if (historicalRecords) return historicalRecords;
  try {
    const filePath = path.resolve(process.cwd(), 'data/historical_daily_psi.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      historicalRecords = JSON.parse(raw);
      return historicalRecords;
    }
  } catch (e) {
    console.error('Failed to load historical daily PSI file:', e.message);
  }
  return [];
}

async function fetchHourlyForDate(dateStr) {
  if (hourlyCache.has(dateStr)) {
    return hourlyCache.get(dateStr);
  }
  try {
    const res = await fetch(`https://api.data.gov.sg/v1/environment/psi?date=${dateStr}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return [];
    const json = await res.json();
    const items = json.items || [];
    hourlyCache.set(dateStr, items);
    return items;
  } catch (e) {
    console.warn(`Hourly fetch failed for ${dateStr}:`, e.message);
    return [];
  }
}

function calculateMedian(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export async function getHistoricalPsi({
  region = 'all',
  range = '30d',
  startDate,
  endDate,
  aggregation = 'daily',
  format = 'json'
} = {}) {
  const records = loadHistoricalData();
  const today = new Date();
  const SGT_OFFSET = 8 * 60 * 60 * 1000;
  const sgtNow = new Date(Date.now() + SGT_OFFSET);
  const todayStr = sgtNow.toISOString().slice(0, 10);

  let start = '';
  let end = todayStr;

  // Resolve date range
  if (range === '24h') {
    const yest = new Date(sgtNow.getTime() - 24 * 60 * 60 * 1000);
    start = yest.toISOString().slice(0, 10);
  } else if (range === '7d') {
    const d = new Date(sgtNow.getTime() - 7 * 24 * 60 * 60 * 1000);
    start = d.toISOString().slice(0, 10);
  } else if (range === '30d') {
    const d = new Date(sgtNow.getTime() - 30 * 24 * 60 * 60 * 1000);
    start = d.toISOString().slice(0, 10);
  } else if (range === '90d') {
    const d = new Date(sgtNow.getTime() - 90 * 24 * 60 * 60 * 1000);
    start = d.toISOString().slice(0, 10);
  } else if (range === '1y') {
    const d = new Date(sgtNow.getTime() - 365 * 24 * 60 * 60 * 1000);
    start = d.toISOString().slice(0, 10);
  } else if (range === '5y') {
    const d = new Date(sgtNow.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
    start = d.toISOString().slice(0, 10);
  } else if (range === 'custom') {
    if (startDate) start = startDate;
    if (endDate) end = endDate;
  }

  // Handle hourly queries for 24h or 7d
  if (range === '24h' || (range === '7d' && aggregation === 'hourly')) {
    const dateList = [];
    const curr = new Date(start);
    const stop = new Date(end);
    while (curr <= stop) {
      dateList.push(curr.toISOString().slice(0, 10));
      curr.setDate(curr.getDate() + 1);
    }

    const hourlyResults = [];
    for (const dStr of dateList) {
      const items = await fetchHourlyForDate(dStr);
      for (const item of items) {
        const rd = item.readings?.psi_twenty_four_hourly;
        if (!rd) continue;
        const ts = item.timestamp;
        const n = rd.north ?? 0;
        const s = rd.south ?? 0;
        const e = rd.east ?? 0;
        const w = rd.west ?? 0;
        const c = rd.central ?? 0;
        const nat = Math.round((n + s + e + w + c) / 5);
        hourlyResults.push({
          timestamp: ts,
          date: ts.slice(0, 10),
          north: n,
          south: s,
          east: e,
          west: w,
          central: c,
          national: nat,
          max: Math.max(n, s, e, w, c),
          min: Math.min(n, s, e, w, c),
          isAggregate: false,
        });
      }
    }

    if (hourlyResults.length > 0) {
      // Sort chronologically
      hourlyResults.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      // Compute statistics
      const targetVals = hourlyResults.map(r => {
        if (region === 'all' || region === 'national') return r.national;
        return r[region] ?? r.national;
      });

      const maxVal = Math.max(...targetVals);
      const minVal = Math.min(...targetVals);
      const avgVal = Math.round(targetVals.reduce((a, b) => a + b, 0) / targetVals.length);
      const medVal = calculateMedian(targetVals);
      const unhealthyCount = targetVals.filter(v => v > 100).length;

      return {
        range,
        region,
        aggregation: 'hourly',
        startDate: hourlyResults[0]?.timestamp,
        endDate: hourlyResults[hourlyResults.length - 1]?.timestamp,
        totalObservations: hourlyResults.length,
        statistics: {
          max: maxVal,
          min: minVal,
          average: avgVal,
          median: medVal,
          daysExceeding100: unhealthyCount,
          percentageUnhealthy: Math.round((unhealthyCount / hourlyResults.length) * 100),
        },
        data: hourlyResults,
        missingPeriods: [],
      };
    }
  }

  // Filter daily records
  let filtered = records.filter(r => r.date >= start && r.date <= end);
  if (!filtered.length && records.length) {
    // If start is earlier than dataset, clamp to dataset earliest
    filtered = records.slice(0, 30);
  }

  // Apply Weekly or Monthly Aggregation if requested
  let outputData = filtered;
  let isAggregate = false;

  if (aggregation === 'weekly') {
    isAggregate = true;
    const weekMap = new Map();
    for (const r of filtered) {
      const d = new Date(r.date);
      // Group by year and ISO week
      const dNum = d.getTime();
      const weekStart = new Date(dNum - (d.getDay() * 86400000)).toISOString().slice(0, 10);
      if (!weekMap.has(weekStart)) weekMap.set(weekStart, []);
      weekMap.get(weekStart).push(r);
    }
    outputData = Array.from(weekMap.entries()).map(([wDate, items]) => {
      const count = items.length;
      return {
        date: wDate,
        label: `Week of ${wDate}`,
        north: Math.round(items.reduce((a, b) => a + b.north, 0) / count),
        south: Math.round(items.reduce((a, b) => a + b.south, 0) / count),
        east: Math.round(items.reduce((a, b) => a + b.east, 0) / count),
        west: Math.round(items.reduce((a, b) => a + b.west, 0) / count),
        central: Math.round(items.reduce((a, b) => a + b.central, 0) / count),
        national: Math.round(items.reduce((a, b) => a + b.national, 0) / count),
        max: Math.max(...items.map(i => i.max)),
        min: Math.min(...items.map(i => i.min)),
        isAggregate: true,
        daysCount: count,
      };
    });
  } else if (aggregation === 'monthly') {
    isAggregate = true;
    const monthMap = new Map();
    for (const r of filtered) {
      const mKey = r.date.slice(0, 7); // YYYY-MM
      if (!monthMap.has(mKey)) monthMap.set(mKey, []);
      monthMap.get(mKey).push(r);
    }
    outputData = Array.from(monthMap.entries()).map(([mKey, items]) => {
      const count = items.length;
      return {
        date: `${mKey}-01`,
        label: mKey,
        north: Math.round(items.reduce((a, b) => a + b.north, 0) / count),
        south: Math.round(items.reduce((a, b) => a + b.south, 0) / count),
        east: Math.round(items.reduce((a, b) => a + b.east, 0) / count),
        west: Math.round(items.reduce((a, b) => a + b.west, 0) / count),
        central: Math.round(items.reduce((a, b) => a + b.central, 0) / count),
        national: Math.round(items.reduce((a, b) => a + b.national, 0) / count),
        max: Math.max(...items.map(i => i.max)),
        min: Math.min(...items.map(i => i.min)),
        isAggregate: true,
        daysCount: count,
      };
    });
  } else {
    outputData = filtered.map(r => ({ ...r, isAggregate: false }));
  }

  // Calculate statistics across filtered days
  const targetValues = filtered.map(r => {
    if (region === 'all' || region === 'national') return r.national;
    return r[region] ?? r.national;
  });

  const maxVal = targetValues.length ? Math.max(...targetValues) : 0;
  const minVal = targetValues.length ? Math.min(...targetValues) : 0;
  const avgVal = targetValues.length ? Math.round(targetValues.reduce((a, b) => a + b, 0) / targetValues.length) : 0;
  const medVal = calculateMedian(targetValues);
  const daysExceeding100 = targetValues.filter(v => v > 100).length;

  // Category breakdown
  const categoryCounts = {
    Good: 0,
    Moderate: 0,
    Unhealthy: 0,
    VeryUnhealthy: 0,
    Hazardous: 0,
  };
  for (const v of targetValues) {
    if (v <= 50) categoryCounts.Good++;
    else if (v <= 100) categoryCounts.Moderate++;
    else if (v <= 200) categoryCounts.Unhealthy++;
    else if (v <= 300) categoryCounts.VeryUnhealthy++;
    else categoryCounts.Hazardous++;
  }

  // Check for missing dates in the sequence
  const missingPeriods = [];
  if (filtered.length > 1) {
    for (let i = 0; i < filtered.length - 1; i++) {
      const d1 = new Date(filtered[i].date);
      const d2 = new Date(filtered[i + 1].date);
      const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        missingPeriods.push({
          from: new Date(d1.getTime() + 86400000).toISOString().slice(0, 10),
          to: new Date(d2.getTime() - 86400000).toISOString().slice(0, 10),
          gapDays: diffDays - 1,
        });
      }
    }
  }

  return {
    range,
    region,
    aggregation,
    startDate: filtered[0]?.date || start,
    endDate: filtered[filtered.length - 1]?.date || end,
    totalObservations: outputData.length,
    statistics: {
      max: maxVal,
      min: minVal,
      average: avgVal,
      median: medVal,
      daysExceeding100,
      percentageUnhealthy: targetValues.length ? Math.round((daysExceeding100 / targetValues.length) * 100) : 0,
      categoryDistribution: categoryCounts,
    },
    data: outputData,
    missingPeriods,
  };
}

export function generateCsv(historyResult) {
  const data = historyResult.data || [];
  const headers = ['Date', 'National_Avg', 'North', 'South', 'East', 'West', 'Central', 'Max_PSI', 'Min_PSI', 'Is_Aggregate'];
  const rows = [headers.join(',')];

  for (const item of data) {
    const row = [
      item.timestamp || item.date,
      item.national ?? '',
      item.north ?? '',
      item.south ?? '',
      item.east ?? '',
      item.west ?? '',
      item.central ?? '',
      item.max ?? '',
      item.min ?? '',
      item.isAggregate ? 'YES' : 'NO'
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}
