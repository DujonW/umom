const Anthropic = require('@anthropic-ai/sdk');
const { config } = require('./index');

let client;

function getClaudeClient() {
  if (!client) {
    client = new Anthropic({ apiKey: config.claude.apiKey, timeout: 30000 });
  }
  return client;
}

module.exports = { getClaudeClient };
