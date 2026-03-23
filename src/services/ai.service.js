const { getClaudeClient } = require('../config/openai');
const { config } = require('../config');
const { withRetry } = require('../utils/retry');
const {
  CORE_SYSTEM_PROMPT,
  REFRAMING_TEMPLATES,
  TASK_INITIATION_SCRIPTS,
  SELF_ESTEEM_AFFIRMATIONS,
  PHASE_COACHING_CONTEXT,
  DAILY_CHECKIN_PROMPT,
  WEEKLY_REPORT_PROMPT,
  MONTHLY_REPORT_PROMPT,
} = require('../config/adhd-prompts');

const MODEL = () => config.claude.model;

function extractText(response) {
  const block = response.content.find((b) => b.type === 'text');
  return block ? block.text.trim() : '';
}

/**
 * Builds the system prompt, injecting user context (Notion digest) and
 * optional cycle phase or additional context.
 */
function buildSystemPrompt(options = {}) {
  const { cyclePhase, additionalContext, userContext } = options;
  let system = CORE_SYSTEM_PROMPT;
  if (userContext) system += `\n\n${userContext}`;
  if (cyclePhase && PHASE_COACHING_CONTEXT[cyclePhase]) {
    system += `\n\n${PHASE_COACHING_CONTEXT[cyclePhase]}`;
  }
  if (additionalContext) system += `\n\n${additionalContext}`;
  return system;
}

/**
 * Core chat. conversationHistory must be user/assistant only (no system messages).
 */
async function chat(conversationHistory, options = {}) {
  const client = getClaudeClient();
  return extractText(await withRetry(() => client.messages.create({
    model: MODEL(),
    max_tokens: 500,
    system: buildSystemPrompt(options),
    messages: conversationHistory,
  })));
}

/**
 * Generates a session summary for overflow management.
 * Kept brief — Haiku summarises the key points of a long conversation.
 */
async function summariseSession(conversationHistory) {
  const client = getClaudeClient();
  return extractText(await withRetry(() => client.messages.create({
    model: MODEL(),
    max_tokens: 200,
    system: 'You are summarising a coaching conversation. Write 2-3 sentences covering the main topics discussed and any decisions or strategies agreed on. Be factual and brief.',
    messages: [
      ...conversationHistory,
      { role: 'user', content: 'Please summarise this conversation so far.' },
    ],
  })));
}

async function respondToCheckin(checkinData, userContext = '') {
  const client = getClaudeClient();
  return extractText(await withRetry(() => client.messages.create({
    model: MODEL(),
    max_tokens: 300,
    system: userContext ? `${CORE_SYSTEM_PROMPT}\n\n${userContext}` : CORE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: DAILY_CHECKIN_PROMPT(checkinData) }],
  })));
}

async function reframe(thought, reframeType = 'worstCase', userContext = '') {
  const client = getClaudeClient();
  const template = REFRAMING_TEMPLATES[reframeType] || REFRAMING_TEMPLATES.worstCase;
  let system = `${CORE_SYSTEM_PROMPT}\n\n${template}`;
  if (userContext) system += `\n\n${userContext}`;
  return extractText(await withRetry(() => client.messages.create({
    model: MODEL(),
    max_tokens: 400,
    system,
    messages: [{
      role: 'user',
      content: `Help me reframe this thought: "${thought}"\nBe warm and concise (under 200 words).`,
    }],
  })));
}

async function buildEsteem(userMessage, userContext = '') {
  const client = getClaudeClient();
  const affirmation = SELF_ESTEEM_AFFIRMATIONS[Math.floor(Math.random() * SELF_ESTEEM_AFFIRMATIONS.length)];
  let system = `${CORE_SYSTEM_PROMPT}\nWeave this in naturally (don't quote verbatim): "${affirmation}"`;
  if (userContext) system += `\n\n${userContext}`;
  return extractText(await withRetry(() => client.messages.create({
    model: MODEL(),
    max_tokens: 350,
    system,
    messages: [{ role: 'user', content: userMessage }],
  })));
}

async function generateTaskInitiation(task, difficulty = 'medium', userContext = '') {
  const client = getClaudeClient();
  const scripts = Object.values(TASK_INITIATION_SCRIPTS).join('\n\n');
  let system = `${CORE_SYSTEM_PROMPT}\n\n${scripts}`;
  if (userContext) system += `\n\n${userContext}`;
  return extractText(await withRetry(() => client.messages.create({
    model: MODEL(),
    max_tokens: 350,
    system,
    messages: [{
      role: 'user',
      content: `I'm struggling to start: "${task.title || task}"${task.description ? `\nContext: ${task.description}` : ''}\nDifficulty for me: ${difficulty}\nPick 1-2 relevant strategies. Be specific to this task.`,
    }],
  })));
}

async function generateWeeklySummary(weekData, userContext = '') {
  const client = getClaudeClient();
  return extractText(await withRetry(() => client.messages.create({
    model: MODEL(),
    max_tokens: 600,
    system: userContext ? `${CORE_SYSTEM_PROMPT}\n\n${userContext}` : CORE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: WEEKLY_REPORT_PROMPT(weekData) }],
  })));
}

async function generateMonthlySummary(monthData, userContext = '') {
  const client = getClaudeClient();
  return extractText(await withRetry(() => client.messages.create({
    model: MODEL(),
    max_tokens: 800,
    system: userContext ? `${CORE_SYSTEM_PROMPT}\n\n${userContext}` : CORE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: MONTHLY_REPORT_PROMPT(monthData) }],
  })));
}

module.exports = {
  chat,
  summariseSession,
  respondToCheckin,
  reframe,
  buildEsteem,
  generateTaskInitiation,
  generateWeeklySummary,
  generateMonthlySummary,
};
