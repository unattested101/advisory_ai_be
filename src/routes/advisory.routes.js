const express = require("express");
const router = express.Router();

const {
  generateAdvisorySuggestions,
  generateNewsImpact,
} = require("../services/openai.service");
const {
  sendImpactEmail,
  sendActionItemEmail,
} = require("../services/email.service");
const actionItemsService = require("../services/actionItems.service");

// Load mock data
const clients = require("../config/clients.json");
const news = require("../config/news.json");

/**
 * GET /api/advisory/clients
 * Returns all clients with their portfolios and goals
 */
router.get("/clients", (req, res) => {
  res.json({ clients });
});

/**
 * GET /api/advisory/clients/:id
 * Returns a single client by ID
 */
router.get("/clients/:id", (req, res) => {
  const client = clients.find((c) => c.id === req.params.id);
  if (!client) {
    return res.status(404).json({ error: "Client not found" });
  }
  res.json({ client });
});

/**
 * GET /api/advisory/news
 * Returns all news items
 */
router.get("/news", (req, res) => {
  res.json({ news });
});

/**
 * POST /api/advisory/suggestions
 * Generate AI suggestions for a specific client (or all clients)
 * Body: { clientId?: string }
 * If clientId is provided, generates for that client only.
 * If omitted, generates for all clients.
 */
router.post("/suggestions", async (req, res) => {
  try {
    const { clientId } = req.body;

    if (clientId) {
      // Single client
      const client = clients.find((c) => c.id === clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      const result = await generateAdvisorySuggestions(client, news);
      return res.json({ results: [result] });
    }

    // All clients — run in parallel
    const results = await Promise.all(
      clients.map((client) => generateAdvisorySuggestions(client, news)),
    );

    res.json({ results });
  } catch (error) {
    console.error("Advisory suggestions error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to generate suggestions" });
  }
});

/**
 * POST /api/advisory/suggestions/:clientId
 * Generate AI suggestions for a specific client
 */
router.post("/suggestions/:clientId", async (req, res) => {
  try {
    const client = clients.find((c) => c.id === req.params.clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await generateAdvisorySuggestions(client, news);
    res.json(result);
  } catch (error) {
    console.error("Advisory suggestions error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to generate suggestions" });
  }
});

/**
 * POST /api/advisory/news/:newsId/impact
 * Analyse the impact of a specific news article across all clients
 */
router.post("/news/:newsId/impact", async (req, res) => {
  try {
    const newsItem = news.find((n) => n.id === req.params.newsId);
    if (!newsItem) {
      return res.status(404).json({ error: "News article not found" });
    }

    const result = await generateNewsImpact(newsItem, clients);
    res.json(result);
  } catch (error) {
    console.error("News impact error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to analyse news impact" });
  }
});

/**
 * POST /api/advisory/email
 * Send a news impact email to a single client
 * Body: { clientId, clientName, newsArticle, impact, actionItem, relatedHoldings, relatedGoal }
 */
router.post("/email", async (req, res) => {
  try {
    const {
      clientId,
      clientName,
      newsArticle,
      impact,
      actionItem,
      relatedHoldings,
      relatedGoal,
    } = req.body;

    if (!clientName || !newsArticle || !impact || !actionItem) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Look up real email from client data (falls back to test address in service)
    const client = clients.find((c) => c.id === clientId);
    const recipientEmail = client ? client.email : "annarana2002@gmail.com";

    await sendImpactEmail(recipientEmail, clientName, newsArticle, {
      impact,
      actionItem,
      relatedHoldings: relatedHoldings || [],
      relatedGoal: relatedGoal || null,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Email send error:", error);
    res.status(500).json({ error: error.message || "Failed to send email" });
  }
});

/**
 * POST /api/advisory/email/bulk
 * Send news impact emails to all affected clients at once
 * Body: { newsArticle, impacts: [{ clientId, clientName, impact, actionItem, relatedHoldings, relatedGoal }] }
 */
router.post("/email/bulk", async (req, res) => {
  try {
    const { newsArticle, impacts } = req.body;

    if (
      !newsArticle ||
      !impacts ||
      !Array.isArray(impacts) ||
      impacts.length === 0
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const results = await Promise.all(
      impacts.map(async (imp) => {
        const client = clients.find((c) => c.id === imp.clientId);
        const recipientEmail = client ? client.email : "annarana2002@gmail.com";
        try {
          await sendImpactEmail(recipientEmail, imp.clientName, newsArticle, {
            impact: imp.impact,
            actionItem: imp.actionItem,
            relatedHoldings: imp.relatedHoldings || [],
            relatedGoal: imp.relatedGoal || null,
          });
          return { clientId: imp.clientId, success: true };
        } catch (err) {
          return { clientId: imp.clientId, success: false, error: err.message };
        }
      }),
    );

    const sent = results.filter((r) => r.success).length;
    res.json({ success: true, sent, total: impacts.length, results });
  } catch (error) {
    console.error("Bulk email error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to send bulk emails" });
  }
});

// ──────────────────────────────────────────
// Action Items API
// ──────────────────────────────────────────

/**
 * GET /api/advisory/action-items/upcoming
 * Returns all pending action items across all clients, sorted by deadline (most urgent first)
 */
router.get("/action-items/upcoming", (req, res) => {
  const items = actionItemsService.getUpcomingActions(clients);
  res.json({ items });
});

/**
 * POST /api/advisory/action-items/email
 * Send an action item follow-up email to a client
 * Body: { clientId, actionItemText, message }
 */
router.post("/action-items/email", async (req, res) => {
  try {
    const { clientId, actionItemText, message } = req.body;

    if (!clientId || !actionItemText || !message) {
      return res
        .status(400)
        .json({ error: "clientId, actionItemText, and message are required" });
    }

    const client = clients.find((c) => c.id === clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    await sendActionItemEmail(
      client.email,
      client.name,
      actionItemText,
      message,
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Action item email error:", error);
    res.status(500).json({ error: error.message || "Failed to send email" });
  }
});

/**
 * GET /api/advisory/clients/:clientId/action-items
 * Returns all meeting action items for a specific client
 */
router.get("/clients/:clientId/action-items", (req, res) => {
  const { clientId } = req.params;
  const client = clients.find((c) => c.id === clientId);
  if (!client) {
    return res.status(404).json({ error: "Client not found" });
  }

  const meetings = actionItemsService.getClientActions(clientId);
  res.json({ meetings });
});

/**
 * PATCH /api/advisory/action-items/:meetingId/:itemId/toggle
 * Toggles the done status of a single action item
 */
router.patch("/action-items/:meetingId/:itemId/toggle", (req, res) => {
  const { meetingId, itemId } = req.params;
  const updated = actionItemsService.toggleActionItem(meetingId, itemId);

  if (!updated) {
    return res.status(404).json({ error: "Meeting or action item not found" });
  }

  res.json({ item: updated });
});

module.exports = router;
