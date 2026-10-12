import { getHistoricalPsi, generateCsv } from './_lib/historyService.js';

export default async function handler(req, res) {
  try {
    const {
      region = 'all',
      range = '30d',
      startDate,
      endDate,
      aggregation = 'daily',
      format = 'json'
    } = req.query || {};

    // Validate inputs
    const validRegions = ['all', 'national', 'north', 'south', 'east', 'west', 'central'];
    const chosenRegion = validRegions.includes(region.toLowerCase()) ? region.toLowerCase() : 'all';

    const validRanges = ['24h', '7d', '30d', '90d', '1y', '5y', 'custom'];
    const chosenRange = validRanges.includes(range.toLowerCase()) ? range.toLowerCase() : '30d';

    const validAggs = ['hourly', 'daily', 'weekly', 'monthly'];
    const chosenAgg = validAggs.includes(aggregation.toLowerCase()) ? aggregation.toLowerCase() : 'daily';

    const data = await getHistoricalPsi({
      region: chosenRegion,
      range: chosenRange,
      startDate,
      endDate,
      aggregation: chosenAgg,
      format,
    });

    if (format === 'csv') {
      const csv = generateCsv(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="singapore_psi_${chosenRegion}_${chosenRange}.csv"`);
      return res.status(200).send(csv);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (error) {
    console.error('API /api/history error:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve historical PSI observations.',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
