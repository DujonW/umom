const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { requestLogger } = require('./middleware/requestLogger');
const { errorHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const routes = require('./routes');
const braindumpPage = require('./routes/braindump-page.routes');

function createApp() {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS — locked down for local use; adjust origins for deployment
  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3001' }));

  // Body parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));

  // Logging
  app.use(requestLogger);

  // General rate limit
  app.use(generalLimiter);

  // Brain dump web page — GET/POST /brain-dump?key=SECRET
  app.use('/brain-dump', braindumpPage);

  // API routes
  app.use('/api', routes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
  });

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
