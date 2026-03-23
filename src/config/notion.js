const { Client } = require('@notionhq/client');
const { config } = require('./index');

let client;

function getNotionClient() {
  if (!client) {
    client = new Client({ auth: config.notion.apiKey, timeoutMs: 10000 });
  }
  return client;
}

module.exports = { getNotionClient };
