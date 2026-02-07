// Store SSE clients by botId
const clients = new Map();

// Store transcripts by botId
const transcripts = new Map();

// Store bot statuses
const botStatuses = new Map();

// Store botId -> clientId mapping
const botClientMap = new Map();

// Store botId -> custom questions list
const botQuestionsMap = new Map();

/**
 * Add a new SSE client for a specific bot
 */
function addClient(botId, res) {
  if (!clients.has(botId)) {
    clients.set(botId, []);
  }
  clients.get(botId).push(res);
  console.log(
    `SSE client connected for bot ${botId}. Total clients: ${clients.get(botId).length}`,
  );

  // Send current transcript history to new client
  const history = transcripts.get(botId) || [];
  if (history.length > 0) {
    console.log(`Sending ${history.length} history items to new client`);
    res.write(
      `data: ${JSON.stringify({ type: "history", transcript: history })}\n\n`,
    );
  }

  // Send current bot status
  const status = botStatuses.get(botId);
  if (status) {
    res.write(`data: ${JSON.stringify({ type: "status", status })}\n\n`);
  }
}

/**
 * Remove a client when connection closes
 */
function removeClient(botId, res) {
  const botClients = clients.get(botId);
  if (botClients) {
    const index = botClients.indexOf(res);
    if (index > -1) {
      botClients.splice(index, 1);
    }
    if (botClients.length === 0) {
      clients.delete(botId);
    }
  }
}

/**
 * Send event to all clients subscribed to a bot
 */
function sendEvent(botId, data) {
  const botClients = clients.get(botId);
  if (botClients) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    botClients.forEach((client) => {
      client.write(message);
    });
  }
}

/**
 * Add transcript segment and notify clients
 */
function addTranscript(botId, segment) {
  if (!transcripts.has(botId)) {
    transcripts.set(botId, []);
  }
  transcripts.get(botId).push(segment);

  const clientCount = clients.get(botId)?.length || 0;
  console.log(
    `Adding transcript for bot ${botId}. Connected clients: ${clientCount}`,
  );

  sendEvent(botId, { type: "transcript", segment });
}

/**
 * Update bot status and notify clients
 */
function updateBotStatus(botId, status) {
  botStatuses.set(botId, status);
  sendEvent(botId, { type: "status", status });
}

/**
 * Get full transcript for a bot
 */
function getTranscript(botId) {
  return transcripts.get(botId) || [];
}

/**
 * Get bot status
 */
function getBotStatus(botId) {
  return botStatuses.get(botId) || null;
}

/**
 * Clear data for a bot (when meeting ends)
 */
function clearBotData(botId) {
  // Keep transcript for later use but clear clients
  const botClients = clients.get(botId);
  if (botClients) {
    botClients.forEach((client) => {
      client.end();
    });
    clients.delete(botId);
  }
}

/**
 * Link a botId to a clientId
 */
function setBotClient(botId, clientId) {
  botClientMap.set(botId, clientId);
}

/**
 * Get the clientId linked to a bot
 */
function getBotClient(botId) {
  return botClientMap.get(botId) || null;
}

/**
 * Store custom questions for a bot
 */
function setBotQuestions(botId, questions) {
  botQuestionsMap.set(botId, questions);
}

/**
 * Get the custom questions for a bot
 */
function getBotQuestions(botId) {
  return botQuestionsMap.get(botId) || null;
}

module.exports = {
  addClient,
  removeClient,
  sendEvent,
  addTranscript,
  updateBotStatus,
  getTranscript,
  getBotStatus,
  clearBotData,
  setBotClient,
  getBotClient,
  setBotQuestions,
  getBotQuestions,
};
