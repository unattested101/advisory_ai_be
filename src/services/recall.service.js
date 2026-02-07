const axios = require('axios');

const RECALL_REGION = process.env.RECALL_REGION || 'us-west-2';
const RECALL_API_KEY = process.env.RECALL_API_KEY;
const RECALL_BASE_URL = `https://${RECALL_REGION}.recall.ai/api/v1`;

/**
 * Create a bot and send it to join a meeting
 * https://docs.recall.ai/docs/bot-real-time-transcription
 */
async function inviteBot(meetingUrl, botName = 'Advisory AI Bot') {
  const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:3000';
  const transcriptWebhookUrl = `${webhookBaseUrl}/webhook/transcript`;
  
  console.log('Creating bot with transcript webhook URL:', transcriptWebhookUrl);
  
  const requestBody = {
    bot_name: botName,
    meeting_url: meetingUrl,
    recording_config: {
      transcript: {
        provider: {
          recallai_streaming: {
            language_code: 'en',
            mode: 'prioritize_low_latency'
          }
        }
      },
      realtime_endpoints: [
        {
          type: 'webhook',
          url: transcriptWebhookUrl,
          events: ['transcript.data']
        }
      ]
    }
  };
  
  console.log('Bot request body:', JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await axios.post(
      `${RECALL_BASE_URL}/bot`,
      requestBody,
      {
        headers: {
          Authorization: `Token ${RECALL_API_KEY}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Bot created successfully:', response.data.id);
    console.log('Bot response:', JSON.stringify(response.data, null, 2));
    
    // Log the realtime_endpoints configuration that was actually set
    if (response.data.recording_config?.realtime_endpoints) {
      console.log('Realtime endpoints configured:', JSON.stringify(response.data.recording_config.realtime_endpoints, null, 2));
    } else {
      console.warn('WARNING: No realtime_endpoints in bot response - webhooks may not be configured');
    }
    
    return response.data;
  } catch (error) {
    console.error('Failed to invite bot:', error.response?.data || error.message);
    console.error('Full error:', JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
}

/**
 * Get bot status
 */
async function getBotStatus(botId) {
  try {
    const response = await axios.get(
      `${RECALL_BASE_URL}/bot/${botId}`,
      {
        headers: {
          Authorization: `Token ${RECALL_API_KEY}`,
          Accept: 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to get bot status:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get bot transcript
 */
async function getBotTranscript(botId) {
  try {
    const response = await axios.get(
      `${RECALL_BASE_URL}/bot/${botId}/transcript`,
      {
        headers: {
          Authorization: `Token ${RECALL_API_KEY}`,
          Accept: 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to get transcript:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Remove bot from meeting
 */
async function removeBot(botId) {
  try {
    const response = await axios.post(
      `${RECALL_BASE_URL}/bot/${botId}/leave_call`,
      {},
      {
        headers: {
          Authorization: `Token ${RECALL_API_KEY}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to remove bot:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  inviteBot,
  getBotStatus,
  getBotTranscript,
  removeBot
};
