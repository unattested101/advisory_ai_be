const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const sseService = require('../services/sse.service');
const openaiService = require('../services/openai.service');
const actionItemsService = require('../services/actionItems.service');

/**
 * Verify Svix webhook signature (Recall.ai uses Svix for webhooks)
 * https://docs.recall.ai/docs/bot-status-change-events
 */
function verifyWebhookSignature(req, res, next) {
  // Svix uses these headers
  const svixId = req.headers['svix-id'];
  const svixTimestamp = req.headers['svix-timestamp'];
  const svixSignature = req.headers['svix-signature'];
  const secret = process.env.RECALL_WEBHOOK_SECRET;

  // Skip verification if no secret configured (development)
  if (!secret) {
    console.warn('Warning: RECALL_WEBHOOK_SECRET not configured, skipping signature verification');
    return next();
  }

  if (!svixSignature) {
    console.warn('Warning: No svix-signature in webhook request');
    return next();
  }

  // For now, just log and proceed - Svix verification can be added later
  console.log('Webhook headers:', { svixId, svixTimestamp, hasSignature: !!svixSignature });
  return next();
}

// Log ALL incoming webhook requests for debugging
router.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`\n========== WEBHOOK REQUEST ==========`);
  console.log(`[${now}] ${req.method} ${req.originalUrl}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Query:', req.query);
  console.log('Body preview:', JSON.stringify(req.body)?.substring(0, 500));
  console.log(`======================================\n`);
  next();
});

// Apply signature verification to all webhook routes
router.use(verifyWebhookSignature);

/**
 * GET /webhook/test - Simple test endpoint to verify webhook reachability
 */
router.get('/test', (req, res) => {
  console.log('Test webhook endpoint hit!');
  res.json({ status: 'ok', message: 'Webhook endpoint is reachable', timestamp: new Date().toISOString() });
});

/**
 * POST /webhook/test - Test POST endpoint
 */
router.post('/test', (req, res) => {
  console.log('Test POST webhook received:', JSON.stringify(req.body, null, 2));
  res.json({ status: 'ok', received: true });
});

/**
 * POST /webhook/status-change
 * Recall.ai webhook for bot status changes
 * 
 * Payload format (from Recall.ai docs):
 * {
 *   "event": "bot.joining_call",
 *   "data": {
 *     "data": {
 *       "code": string,
 *       "sub_code": string | null,
 *       "updated_at": string
 *     },
 *     "bot": {
 *       "id": string,
 *       "metadata": object
 *     }
 *   }
 * }
 */
router.post('/status-change', (req, res) => {
  console.log('Status change webhook received:', JSON.stringify(req.body, null, 2));
  
  // Acknowledge receipt immediately (must return 2xx)
  res.status(200).send('OK');

  const { event, data } = req.body || {};
  
  if (!data?.bot?.id) {
    console.log('Invalid status change webhook - missing bot id');
    return;
  }

  const botId = data.bot.id;
  const statusCode = data.data?.code || event?.replace('bot.', '') || 'unknown';
  const subCode = data.data?.sub_code;

  console.log(`Bot ${botId} status: ${statusCode}${subCode ? ` (${subCode})` : ''}`);

  // Update bot status in SSE service
  sseService.updateBotStatus(botId, {
    code: statusCode,
    subCode: subCode,
    event: event,
    timestamp: data.data?.updated_at || new Date().toISOString()
  });

  // Handle specific events
  switch (event) {
    case 'bot.joining_call':
      sseService.sendEvent(botId, {
        type: 'status',
        status: { code: 'joining_call', message: 'Bot is joining the call...' }
      });
      break;

    case 'bot.in_waiting_room':
      sseService.sendEvent(botId, {
        type: 'status',
        status: { code: 'in_waiting_room', message: 'Bot is in the waiting room' }
      });
      break;

    case 'bot.in_call_not_recording':
      sseService.sendEvent(botId, {
        type: 'status',
        status: { code: 'in_call_not_recording', message: 'Bot joined but not recording yet' }
      });
      break;

    case 'bot.in_call_recording':
      sseService.sendEvent(botId, {
        type: 'status',
        status: { code: 'in_call_recording', message: 'Bot is recording' }
      });
      break;

    case 'bot.recording_permission_allowed':
      sseService.sendEvent(botId, {
        type: 'status',
        status: { code: 'recording_permission_allowed', message: 'Recording permission granted' }
      });
      break;

    case 'bot.recording_permission_denied':
      sseService.sendEvent(botId, {
        type: 'status',
        status: { code: 'recording_permission_denied', message: 'Recording permission denied' }
      });
      break;

    case 'bot.call_ended':
      console.log(`Call ended for bot ${botId}`);
      sseService.sendEvent(botId, {
        type: 'status',
        status: { code: 'call_ended', message: 'Call has ended' }
      });
      break;

    case 'bot.done':
      console.log(`Bot ${botId} is done`);
      sseService.sendEvent(botId, { 
        type: 'meeting_ended',
        botId,
        timestamp: new Date().toISOString()
      });

      // Fire-and-forget: extract action items if a client is linked
      (async () => {
        try {
          const clientId = sseService.getBotClient(botId);
          if (!clientId) {
            console.log(`No client linked to bot ${botId}, skipping action item extraction`);
            return;
          }

          const transcript = sseService.getTranscript(botId);
          if (!transcript || transcript.length === 0) {
            console.log(`No transcript for bot ${botId}, skipping action item extraction`);
            return;
          }

          const formattedTranscript = transcript
            .map(seg => `${seg.speaker || 'Unknown'}: ${seg.text || ''}`)
            .join('\n');

          console.log(`Extracting action items for bot ${botId} (client ${clientId})...`);
          const result = await openaiService.extractActionItems(formattedTranscript);

          if (result.actionItems && result.actionItems.length > 0) {
            actionItemsService.saveMeetingActions(clientId, botId, result.actionItems);
            console.log(`Saved ${result.actionItems.length} action items for client ${clientId}`);
          } else {
            console.log(`No action items found in transcript for bot ${botId}`);
          }
        } catch (err) {
          console.error(`Failed to extract action items for bot ${botId}:`, err);
        }
      })();
      break;

    case 'bot.fatal':
      console.error(`Bot ${botId} fatal error:`, subCode);
      sseService.sendEvent(botId, {
        type: 'error',
        botId,
        message: subCode || 'A fatal error occurred'
      });
      break;
  }
});

/**
 * POST /webhook/transcript
 * Recall.ai webhook for real-time transcript updates
 * https://docs.recall.ai/docs/bot-real-time-transcription
 * 
 * Payload format:
 * {
 *   "event": "transcript.data" | "transcript.partial_data",
 *   "data": {
 *     "data": {
 *       "words": [{ "text": string, "start_timestamp": { "relative": float } }],
 *       "participant": { "id": number, "name": string | null }
 *     },
 *     "bot": { "id": string }
 *   }
 * }
 */
// Handle both /transcript and /transcript/ (trailing slash version with token)
const handleTranscriptWebhook = (req, res) => {
  // Acknowledge receipt immediately (must return 2xx) - this is critical for real-time performance
  res.status(200).send('OK');

  // Log token if present (for debugging)
  if (req.query.token) {
    console.log(`Transcript webhook received with token: ${req.query.token}`);
  }

  const now = new Date().toISOString();
  console.log(`[${now}] Transcript webhook received:`, JSON.stringify(req.body, null, 2));

  const { event, data } = req.body || {};
  
  if (!data) {
    console.log('Invalid transcript webhook - no data');
    return;
  }

  const botId = data.bot?.id;
  const transcriptData = data.data;

  if (!botId) {
    console.log('Invalid transcript webhook - missing bot_id');
    return;
  }

  if (!transcriptData) {
    console.log('Invalid transcript webhook - missing transcript data');
    return;
  }

  // Extract text from words array
  const words = transcriptData.words || [];
  const text = words.map(w => w.text).join(' ');
  
  // Get speaker name from participant
  const speaker = transcriptData.participant?.name || 'Unknown';
  
  // Get timestamp from first word
  const timestamp = words[0]?.start_timestamp?.relative 
    ? words[0].start_timestamp.relative * 1000 // Convert to ms
    : Date.now();

  // Determine if this is final or partial data
  const isFinal = event === 'transcript.data';

  console.log(`Transcript ${isFinal ? 'final' : 'partial'} for bot ${botId}: [${speaker}] ${text}`);

  sseService.addTranscript(botId, {
    speaker,
    text,
    timestamp,
    isFinal
  });
};

// Register both routes (with and without trailing slash)
router.post('/transcript', handleTranscriptWebhook);
router.post('/transcript/', handleTranscriptWebhook);

// GET handlers for endpoint verification/health checks
router.get('/transcript', (req, res) => {
  res.status(200).json({ status: 'ok', endpoint: 'transcript webhook' });
});
router.get('/transcript/', (req, res) => {
  res.status(200).json({ status: 'ok', endpoint: 'transcript webhook' });
});
router.get('/status-change', (req, res) => {
  res.status(200).json({ status: 'ok', endpoint: 'status-change webhook' });
});

/**
 * POST /webhook/recording
 * Recall.ai webhook for recording completion
 */
router.post('/recording', (req, res) => {
  console.log('Recording webhook received:', JSON.stringify(req.body, null, 2));
  res.status(200).send('OK');

  const { data } = req.body || {};
  const botId = data?.bot?.id || data?.bot_id;
  
  if (botId) {
    sseService.sendEvent(botId, {
      type: 'recording_ready',
      botId: botId,
      recordingUrl: data.recording_url || data.video_url
    });
  }
});

module.exports = router;
