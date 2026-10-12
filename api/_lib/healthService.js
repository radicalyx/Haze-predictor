/**
 * System Health & Diagnostics Service
 */

import fs from 'node:fs';
import path from 'node:path';
import { generatePsiForecast } from './forecastService.js';

export async function checkSystemHealth() {
  const startedAt = Date.now();
  let upstreamReachable = false;
  let upstreamStatus = null;
  let upstreamError = null;

  // Check official data source
  try {
    const probeRes = await fetch('https://api-open.data.gov.sg/v2/real-time/api/psi', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000)
    });
    upstreamStatus = probeRes.status;
    upstreamReachable = probeRes.ok;
  } catch (err) {
    upstreamError = err.message;
    // Check fallback v1
    try {
      const v1Res = await fetch('https://api.data.gov.sg/v1/environment/psi', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      upstreamStatus = v1Res.status;
      upstreamReachable = v1Res.ok;
    } catch (v1Err) {
      upstreamError = upstreamError ? `${upstreamError}; v1: ${v1Err.message}` : v1Err.message;
    }
  }

  // Check historical archive status
  let historicalRecordsCount = 0;
  let historicalFilePresent = false;
  try {
    const filePath = path.resolve(process.cwd(), 'data/historical_daily_psi.json');
    if (fs.existsSync(filePath)) {
      historicalFilePresent = true;
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      historicalRecordsCount = data.length;
    }
  } catch (e) {
    historicalFilePresent = false;
  }

  // Check forecasting engine
  let forecastingOperational = false;
  let forecastError = null;
  try {
    const testFc = generatePsiForecast({ horizon: 7 });
    if (testFc && testFc.status === 'success') {
      forecastingOperational = true;
    }
  } catch (err) {
    forecastError = err.message;
  }

  const durationMs = Date.now() - startedAt;

  return {
    status: upstreamReachable && forecastingOperational ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    latencyMs: durationMs,
    upstreamDataSource: {
      provider: 'Singapore National Environment Agency (NEA)',
      portal: 'data.gov.sg',
      reachable: upstreamReachable,
      httpStatus: upstreamStatus,
      errorMessage: upstreamError,
    },
    historicalDatabase: {
      loaded: historicalFilePresent,
      totalDailyRecords: historicalRecordsCount,
      coveragePeriod: historicalRecordsCount > 0 ? '2021-01 to 2026-10 (5+ Years)' : 'None',
    },
    forecastingEngine: {
      operational: forecastingOperational,
      methodology: 'Damped Holt-Winters ETS-7 (Statistical Projection)',
      horizonSupportedDays: 30,
      errorMessage: forecastError,
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      runtime: process.env.VERCEL ? 'Vercel Serverless' : 'AI Studio Preview / Node.js',
    }
  };
}
