import { fetchCurrentPsi } from './_lib/psiService.js';

export default async function handler(req, res) {
  try {
    const force = req.query?.refresh === 'true' || req.query?.force === 'true';
    const data = await fetchCurrentPsi(force);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (error) {
    console.error('API /api/psi error:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(503).json({
      status: 'error',
      message: 'Failed to retrieve official Singapore PSI readings.',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
