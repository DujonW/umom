function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV === 'development';

  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (isDev) console.error(err.stack);

  const status = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = status < 500 || isDev ? err.message : 'An unexpected error occurred';

  res.status(status).json({
    success: false,
    error: { code, message },
  });
}

module.exports = { errorHandler };
