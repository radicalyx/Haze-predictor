import express from 'express';
import { createServer as createViteServer } from 'vite';
import psiHandler from './api/psi.js';
import historyHandler from './api/history.js';
import forecastHandler from './api/forecast.js';
import healthHandler from './api/health.js';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Register API endpoints exactly as required
  app.get('/api/psi', (req, res) => psiHandler(req, res));
  app.get('/api/history', (req, res) => historyHandler(req, res));
  app.get('/api/forecast', (req, res) => forecastHandler(req, res));
  app.get('/api/health', (req, res) => healthHandler(req, res));

  // Mount Vite middleware for dev mode or serve dist in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Singapore PSI Tracker server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
