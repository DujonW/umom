const { extractFromDump } = require('../services/dump.service');
const { saveCheckin, updateCheckin } = require('../services/checkin.service');
const { createTask } = require('../services/task.service');
const { createEntry } = require('../services/journal.service');
const { logCycle } = require('../services/period.service');
const pending = require('../services/pending-checkin.service');
const { getClaudeClient } = require('../config/openai');
const { config } = require('../config');
const { withRetry } = require('../utils/retry');
const { CORE_SYSTEM_PROMPT, CHECKIN_FOLLOWUP_EXTRACT_PROMPT } = require('../config/adhd-prompts');
const { success, error } = require('../utils/responseHelpers');

// Fields required for a complete check-in
const CHECKIN_FIELDS = ['mood', 'energy', 'focus'];

async function dump(req, res, next) {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json(error('text is required', 'VALIDATION_ERROR'));
    }

    const extracted = await extractFromDump(text);
    const saved = { checkin: null, tasks: [], journal: null, cycle: null };
    const saves = [];

    // Save cycle log immediately if period start was mentioned
    if (extracted.cycle?.startDate) {
      saves.push(
        logCycle({ startDate: extracted.cycle.startDate })
          .then(() => { saved.cycle = extracted.cycle.startDate; })
          .catch(() => {})
      );
    }

    // Save tasks and journal immediately — these don't need follow-up
    for (const task of (extracted.tasks || [])) {
      if (task.title) {
        saves.push(
          createTask({ title: task.title, priority: task.priority || null, status: 'To Do' })
            .then((t) => { saved.tasks.push(t.title || task.title); })
            .catch(() => {})
        );
      }
    }

    const jn = extracted.journal;
    if (jn?.entry) {
      saves.push(
        createEntry({ entry: jn.entry, type: jn.type || 'General', aiReflection: '' })
          .then(() => { saved.journal = jn.entry.slice(0, 80); })
          .catch(() => {})
      );
    }

    await Promise.all(saves);

    // Determine check-in completeness
    const ci = extracted.checkin;
    const hasAnyCheckin = ci && CHECKIN_FIELDS.some((f) => ci[f] != null);
    const missing = ci ? CHECKIN_FIELDS.filter((f) => ci[f] == null) : [];
    const isComplete = hasAnyCheckin && missing.length === 0;

    let pendingId = null;

    if (hasAnyCheckin) {
      // Always save immediately with whatever fields exist — never block on completeness
      const savedPage = await saveCheckin({ ...ci, aiResponse: '', cyclePhase: null }).catch(() => null);
      saved.checkin = { mood: ci.mood, energy: ci.energy, focus: ci.focus };

      if (!isComplete) {
        // Store pending with the Notion page ID so follow-up can update the same entry
        pendingId = pending.save(ci, savedPage?.id ?? null);
      }
    }

    // Generate Mara's response
    const savedSummary = buildSummary(saved);
    const followUpInstruction = pendingId
      ? `\n\nAlso ask conversationally (in one sentence) for the missing check-in fields: ${missing.join(', ')} (scale 1-10 or describe).`
      : '';

    const client = getClaudeClient();
    const aiResponse = await withRetry(() => client.messages.create({
      model: config.claude.model,
      max_tokens: 250,
      system: CORE_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `I just did a brain dump: "${text}"${savedSummary ? `\n\nCaptured: ${savedSummary}` : ''}\n\nAcknowledge what I shared as Mara.${followUpInstruction} Under 150 words.`,
      }],
    }))
      .then((r) => r.content.find((b) => b.type === 'text')?.text?.trim() || '')
      .catch(() => 'Got it — everything has been saved.');

    res.json(success({ saved, pendingId, aiResponse }, 'Brain dump processed'));
  } catch (err) {
    next(err);
  }
}

async function followup(req, res, next) {
  try {
    const { pendingId, text } = req.body;
    if (!pendingId || !text?.trim()) {
      return res.status(400).json(error('pendingId and text are required', 'VALIDATION_ERROR'));
    }

    const row = pending.get(pendingId);
    if (!row) {
      return res.status(404).json(error('Pending check-in not found or expired', 'NOT_FOUND'));
    }

    // Find which fields are still missing
    const missing = CHECKIN_FIELDS.filter((f) => row[f] == null);
    if (missing.length === 0) {
      // Already complete — just save it
      pending.remove(pendingId);
      await saveCheckin({ mood: row.mood, energy: row.energy, focus: row.focus, notes: row.notes, aiResponse: '', cyclePhase: null }).catch(() => {});
      return res.json(success({ saved: true }, 'Check-in saved'));
    }

    // Extract the missing fields from the follow-up reply
    const client = getClaudeClient();
    const raw = await withRetry(() => client.messages.create({
      model: config.claude.model,
      max_tokens: 100,
      system: 'Return only valid JSON. No markdown, no explanation.',
      messages: [{ role: 'user', content: CHECKIN_FOLLOWUP_EXTRACT_PROMPT(text, missing) }],
    })).then((r) => r.content.find((b) => b.type === 'text')?.text?.trim() || '{}');

    let extracted = {};
    try {
      extracted = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) { try { extracted = JSON.parse(match[0]); } catch { /* leave empty */ } }
    }

    // Merge extracted fields with what we already had
    const merged = {
      mood: extracted.mood ?? row.mood,
      energy: extracted.energy ?? row.energy,
      focus: extracted.focus ?? row.focus,
      notes: row.notes,
    };

    // Update the existing Notion entry with the newly captured fields
    pending.remove(pendingId);
    const newFields = {};
    if (extracted.mood != null)   newFields.mood   = extracted.mood;
    if (extracted.energy != null) newFields.energy = extracted.energy;
    if (extracted.focus != null)  newFields.focus  = extracted.focus;

    if (row.notion_page_id && Object.keys(newFields).length > 0) {
      await updateCheckin(row.notion_page_id, newFields).catch(() => {});
    }

    const aiResponse = await withRetry(() => client.messages.create({
      model: config.claude.model,
      max_tokens: 200,
      system: CORE_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Check-in saved — mood: ${merged.mood ?? '?'}/10, energy: ${merged.energy ?? '?'}/10, focus: ${merged.focus ?? '?'}/10. Give a brief warm acknowledgment as Mara. Under 80 words.`,
      }],
    }))
      .then((r) => r.content.find((b) => b.type === 'text')?.text?.trim() || '')
      .catch(() => 'Check-in saved!');

    res.json(success({ checkin: merged, aiResponse }, 'Check-in complete'));
  } catch (err) {
    next(err);
  }
}

function buildSummary(saved) {
  const parts = [];
  if (saved.checkin) parts.push('check-in');
  if (saved.tasks.length) parts.push(`${saved.tasks.length} task(s): ${saved.tasks.join(', ')}`);
  if (saved.journal) parts.push('journal entry');
  if (saved.cycle) parts.push(`cycle log (started ${saved.cycle})`);
  return parts.join(', ');
}

module.exports = { dump, followup };
