import { generatePsiForecast } from './_lib/forecastService.js';

export default async function handler(req, res) {
  try {
    const {
      region = 'national',
      horizon = '30',
      refresh = 'false'
    } = req.query || {};

    const validRegions = ['national', 'all', 'north', 'south', 'east', 'west', 'central'];
    const chosenRegion = validRegions.includes(region.toLowerCase()) ? region.toLowerCase() : 'national';

    const horizonNum = parseInt(horizon, 10);
    const validHorizon = [7, 14, 30].includes(horizonNum) ? horizonNum : 30;

    const forceRefresh = refresh === 'true';

    const forecast = generatePsiForecast({
      region: chosenRegion === 'all' ? 'national' : chosenRegion,
      horizon: validHorizon,
      forceRefresh,
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json(forecast);
  } catch (error) {
    console.error('API /api/forecast error:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      status: 'error',
      message: 'Failed to generate 30-day PSI forecast projection.',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
