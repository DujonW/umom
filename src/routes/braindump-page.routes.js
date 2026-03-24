const { Router } = require('express');
const { processDump } = require('../controllers/dump.controller');

const router = Router();

// CSP for this page: no scripts, inline styles only, form submits to self
const PAGE_CSP = "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'";

function getKey() {
  return process.env.BRAIN_DUMP_KEY || null;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPage(key, { text = '', response = null, error = null } = {}) {
  const responsePart = response
    ? `<div class="response"><div class="label">Mara</div><p>${esc(response)}</p></div>`
    : error
    ? `<div class="error">${esc(error)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>What's on Your Mind?</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f4f0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem}
    .card{background:#fff;border-radius:16px;padding:2rem;max-width:600px;width:100%;box-shadow:0 2px 16px rgba(0,0,0,.08)}
    h1{font-size:1.35rem;font-weight:600;color:#1a1a1a;margin-bottom:.35rem}
    .sub{color:#888;font-size:.875rem;margin-bottom:1.5rem}
    textarea{width:100%;border:1.5px solid #e0dff8;border-radius:10px;padding:.9rem 1rem;font-size:1rem;font-family:inherit;resize:vertical;min-height:160px;outline:none;color:#1a1a1a;line-height:1.55}
    button{margin-top:.9rem;background:#7c6fcd;color:#fff;border:none;border-radius:10px;padding:.75rem 1.5rem;font-size:1rem;font-weight:500;cursor:pointer;width:100%}
    .response{margin-top:1.5rem;background:#f7f5ff;border-left:3px solid #7c6fcd;border-radius:0 10px 10px 0;padding:1rem 1.25rem}
    .label{font-size:.75rem;font-weight:700;color:#7c6fcd;text-transform:uppercase;letter-spacing:.07em;margin-bottom:.5rem}
    .response p{color:#333;line-height:1.65;font-size:.95rem;white-space:pre-wrap}
    .error{margin-top:1rem;background:#fff2f2;border-left:3px solid #e05050;border-radius:0 8px 8px 0;padding:.75rem 1rem;color:#c03030;font-size:.9rem}
  </style>
</head>
<body>
  <div class="card">
    <h1>What's on your mind?</h1>
    <p class="sub">Type a brain dump — Mara will organise it for you.</p>
    <form method="POST" action="/brain-dump">
      <input type="hidden" name="key" value="${esc(key)}">
      <textarea name="text" placeholder="I've been feeling overwhelmed because…" autofocus>${esc(text)}</textarea>
      <button type="submit">Send to Mara →</button>
    </form>
    ${responsePart}
  </div>
</body>
</html>`;
}

router.get('/', (req, res) => {
  const secret = getKey();
  if (!secret) return res.status(404).send('Not found');

  if (req.query.key !== secret) return res.status(401).send('Invalid key');

  res.setHeader('Content-Security-Policy', PAGE_CSP);
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.send(renderPage(req.query.key));
});

router.post('/', async (req, res) => {
  const secret = getKey();
  if (!secret) return res.status(404).send('Not found');

  const { key, text } = req.body;
  if (key !== secret) return res.status(401).send('Invalid key');

  res.setHeader('Content-Security-Policy', PAGE_CSP);
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (!text?.trim()) {
    return res.send(renderPage(key, { error: 'Please write something before submitting.' }));
  }

  try {
    const { aiResponse } = await processDump(text.trim());
    res.send(renderPage(key, { response: aiResponse }));
  } catch {
    res.send(renderPage(key, { text, error: 'Something went wrong. Please try again.' }));
  }
});

module.exports = router;
