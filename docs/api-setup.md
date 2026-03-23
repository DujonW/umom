# API Setup Guide

## Anthropic (Claude Haiku)

### One key, all models
Your Anthropic API key is **not restricted to a specific model**. A single key gives access to Haiku, Sonnet, and Opus — there is no separate "Haiku key". You control which model is used via the `CLAUDE_MODEL` environment variable.

### Getting your key
1. Go to https://console.anthropic.com/settings/api-keys
2. Click **Create Key**
3. Name it (e.g. "Umom Local")
4. Copy the full `sk-ant-...` string — you only see it once

### Adding it to your `.env`
```
ANTHROPIC_API_KEY=sk-ant-api03-...your-key-here...
CLAUDE_MODEL=claude-haiku-4-5
```

`CLAUDE_MODEL` is optional — `claude-haiku-4-5` is already the default.

### Verifying Haiku access
Haiku is available on all paid Anthropic tiers. To confirm your account is active:
1. Go to https://console.anthropic.com/settings/billing
2. Confirm you have a payment method or active credits

If you're on a free trial with credits, Haiku will work. If you hit a `403` error, your credits may have expired.

### Usage monitoring
Track your spend at https://console.anthropic.com/settings/usage

**Haiku pricing (as of early 2026):** $1 per million input tokens, $5 per million output tokens. A typical chat session costs a fraction of a cent.

---

## Notion Integration

### Getting your integration token
1. Go to https://www.notion.so/my-integrations
2. Click **New integration** → name it "Umom Coach"
3. Set capabilities: Read, Update, Insert content
4. Copy the `secret_...` token

### Adding it to `.env`
```
NOTION_API_KEY=secret_...your-token-here...
```

See [notion-setup.md](./notion-setup.md) for the full database creation walkthrough.

---

## Troubleshooting

| Error | Likely cause | Fix |
|-------|-------------|-----|
| `401 Unauthorized` | Wrong or expired API key | Check `ANTHROPIC_API_KEY` in `.env` |
| `403 Forbidden` | Credits exhausted | Add billing at console.anthropic.com |
| `429 Too Many Requests` | Rate limited | The app retries automatically — wait a moment |
| `Notion 401` | Integration not connected to database | Open each database → Connections → add "Umom Coach" |
| `Missing required environment variables` | `.env` file incomplete | `cp .env.example .env` and fill in all values |
