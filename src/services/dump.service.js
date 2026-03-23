const { getClaudeClient } = require('../config/openai');
const { config } = require('../config');
const { withRetry } = require('../utils/retry');
const { BRAIN_DUMP_EXTRACT_PROMPT } = require('../config/adhd-prompts');

/**
 * Sends a brain dump to Haiku and returns structured extraction as plain JS object.
 * If JSON parsing fails we return an empty object — saves still happen for any
 * partial data that was captured before the failure.
 */
async function extractFromDump(text) {
  const client = getClaudeClient();
  const todayDate = new Date().toISOString().split('T')[0];

  const response = await withRetry(() => client.messages.create({
    model: config.claude.model,
    max_tokens: 600,
    system: 'You are a data extraction assistant. Return only valid JSON. No markdown code fences, no explanation.',
    messages: [{ role: 'user', content: BRAIN_DUMP_EXTRACT_PROMPT(text, todayDate) }],
  }));

  const raw = response.content.find((b) => b.type === 'text')?.text?.trim() || '{}';

  try {
    return JSON.parse(raw);
  } catch {
    // Haiku occasionally wraps JSON in markdown fences — strip and retry
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    return {};
  }
}

module.exports = { extractFromDump };
