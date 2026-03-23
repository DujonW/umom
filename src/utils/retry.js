function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an async function with exponential backoff on retryable errors.
 * Retryable: HTTP 429 (rate limit) and 5xx (server errors).
 * Non-retryable errors (4xx except 429) are thrown immediately.
 */
async function withRetry(fn, { retries = 3, baseDelayMs = 500 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.status || err.statusCode || 0;
      const isRetryable = status === 429 || status >= 500;
      if (!isRetryable || attempt === retries) throw err;
      const delay = baseDelayMs * 2 ** attempt;
      console.warn(`[retry] attempt ${attempt + 1} failed (${status}), retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
}

module.exports = { withRetry };
