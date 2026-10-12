import { checkSystemHealth } from './_lib/healthService.js';

export default async function handler(req, res) {
  try {
    const health = await checkSystemHealth();
    const statusCode = health.status === 'healthy' ? 200 : 200; // Return 200 with diagnostics even if degraded so health check tools can read details
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(statusCode).json(health);
  } catch (error) {
    console.error('API /api/health error:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      status: 'error',
      message: 'Health check probe failed.',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
