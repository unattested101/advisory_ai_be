const express = require("express");
const router = express.Router();
const questions = require("../config/questions.json");
const questionTemplates = require("../config/question-templates.json");

/**
 * GET /api/questions
 * Get the list of predefined questions (default template for backward compat)
 */
router.get("/", (req, res) => {
  res.json(questions);
});

/**
 * GET /api/questions/templates
 * Get all question templates for the dropdown
 */
router.get("/templates", (req, res) => {
  res.json(questionTemplates);
});

/**
 * PUT /api/questions
 * Update the list of questions (in-memory only for demo)
 */
router.put("/", (req, res) => {
  const { questions: newQuestions } = req.body;

  if (!Array.isArray(newQuestions)) {
    return res.status(400).json({ error: "Questions must be an array" });
  }

  // Note: This only updates in-memory, not the file
  // In production, you'd want to persist this
  questions.questions = newQuestions;

  res.json({
    success: true,
    message: "Questions updated",
    questions: questions.questions,
  });
});

module.exports = router;
