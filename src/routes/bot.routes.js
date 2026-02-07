const express = require("express");
const router = express.Router();
const recallService = require("../services/recall.service");
const sseService = require("../services/sse.service");
const openaiService = require("../services/openai.service");
const questions = require("../config/questions.json");

/**
 * POST /api/bot/invite
 * Send a bot to join a meeting
 */
router.post("/invite", async (req, res) => {
  const { meetingUrl, botName, clientId, questions } = req.body;

  if (!meetingUrl) {
    return res.status(400).json({ error: "Meeting URL is required" });
  }

  try {
    const bot = await recallService.inviteBot(meetingUrl, botName);

    // Link bot to client if clientId is provided
    if (clientId) {
      sseService.setBotClient(bot.id, clientId);
      console.log(`Linked bot ${bot.id} to client ${clientId}`);
    }

    // Store per-call questions if provided
    if (questions && Array.isArray(questions) && questions.length > 0) {
      sseService.setBotQuestions(bot.id, questions);
      console.log(
        `Stored ${questions.length} custom questions for bot ${bot.id}`,
      );
    }

    res.json({
      success: true,
      botId: bot.id,
      status: bot.status_changes?.[0]?.code || "pending",
      message: "Bot is joining the meeting",
    });
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data || error.message;
    res.status(status).json({ error: message });
  }
});

/**
 * GET /api/bot/:botId/status
 * Get current bot status
 */
router.get("/:botId/status", async (req, res) => {
  const { botId } = req.params;

  try {
    const bot = await recallService.getBotStatus(botId);
    res.json({
      botId: bot.id,
      status:
        bot.status_changes?.[bot.status_changes.length - 1]?.code || "unknown",
      meetingUrl: bot.meeting_url,
    });
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data || error.message;
    res.status(status).json({ error: message });
  }
});

/**
 * GET /api/bot/:botId/events
 * SSE endpoint for real-time transcript updates
 */
router.get("/:botId/events", (req, res) => {
  const { botId } = req.params;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "connected", botId })}\n\n`);

  // Add client to SSE manager
  sseService.addClient(botId, res);

  // Handle client disconnect
  req.on("close", () => {
    sseService.removeClient(botId, res);
  });
});

/**
 * POST /api/bot/:botId/check-coverage
 * Check if all questions have been covered (uses per-bot questions if stored, else default)
 */
router.post("/:botId/check-coverage", async (req, res) => {
  const { botId } = req.params;

  // Use per-bot questions if stored, otherwise fall back to global defaults
  const botQuestions = sseService.getBotQuestions(botId) || questions.questions;

  try {
    // Get transcript from SSE service (in-memory)
    const transcript = sseService.getTranscript(botId);

    if (!transcript || transcript.length === 0) {
      return res.status(400).json({
        error: "No transcript available yet",
        allCovered: false,
        coveredQuestions: [],
        missingQuestions: botQuestions,
      });
    }

    // Format transcript for LLM
    const formattedTranscript = transcript
      .map(
        (seg) =>
          `${seg.speaker || "Unknown"}: ${seg.words?.map((w) => w.text).join(" ") || seg.text || ""}`,
      )
      .join("\n");

    // Check coverage with OpenAI
    const result = await openaiService.checkQuestionCoverage(
      formattedTranscript,
      botQuestions,
    );

    res.json(result);
  } catch (error) {
    console.error("Coverage check failed:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bot/:botId/leave
 * Remove bot from meeting
 */
router.post("/:botId/leave", async (req, res) => {
  const { botId } = req.params;

  try {
    await recallService.removeBot(botId);
    res.json({ success: true, message: "Bot is leaving the meeting" });
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data || error.message;
    res.status(status).json({ error: message });
  }
});

module.exports = router;
