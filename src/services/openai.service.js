const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Check which predefined questions have been covered in the transcript
 */
async function checkQuestionCoverage(transcript, questions) {
  const systemPrompt = `You are an AI assistant that analyzes meeting transcripts to determine which questions from a checklist have been addressed.

Your task is to:
1. Read the meeting transcript carefully
2. For each question in the checklist, determine if it has been addressed or answered in the transcript
3. A question is considered "covered" if:
   - It was explicitly asked
   - The topic was discussed even if not asked as a direct question
   - The information was provided by any participant

Return a JSON response with the following structure:
{
  "allCovered": boolean,
  "coveredQuestions": [
    {
      "question": "The original question text",
      "evidence": "Brief quote or summary from transcript showing it was covered"
    }
  ],
  "missingQuestions": [
    {
      "question": "The original question text",
      "suggestion": "A natural way to ask this question in the conversation"
    }
  ]
}

Be thorough but reasonable - if the topic was clearly discussed, mark it as covered even if the exact wording differs.`;

  const userPrompt = `Here is the meeting transcript:

${transcript}

---

Here are the questions to check:

${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

---

Analyze the transcript and determine which questions have been covered and which are still missing.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // Ensure the response has the expected structure
    return {
      allCovered: result.allCovered || false,
      coveredQuestions: result.coveredQuestions || [],
      missingQuestions: result.missingQuestions || []
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to analyze question coverage: ' + error.message);
  }
}

/**
 * Generate a summary of the meeting
 */
async function generateMeetingSummary(transcript) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that creates concise meeting summaries. Focus on key points, decisions, and action items.'
        },
        {
          role: 'user',
          content: `Please summarize this meeting transcript:\n\n${transcript}`
        }
      ],
      temperature: 0.5
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate summary: ' + error.message);
  }
}

/**
 * Generate advisory suggestions for a client based on their portfolio, goals, and recent news
 */
async function generateAdvisorySuggestions(client, newsItems) {
  const holdingsSummary = client.portfolio.holdings
    .map(h => `- ${h.asset} (${h.type}): £${h.value.toLocaleString()} — ${h.allocation}%`)
    .join('\n');

  const goalsSummary = client.goals
    .map(g => {
      let desc = `- ${g.title} (${g.type}): target £${g.targetAmount.toLocaleString()}, saved £${g.currentSavings.toLocaleString()}, deadline ${g.targetDate}`;
      if (g.area) desc += `, area: ${g.area}`;
      if (g.notes) desc += ` — ${g.notes}`;
      return desc;
    })
    .join('\n');

  const newsSummary = newsItems
    .map(n => `- [${n.category}] ${n.headline}: ${n.summary}`)
    .join('\n');

  const systemPrompt = `You are a senior financial advisor AI assistant based in London. You analyse client portfolios and goals against the latest financial news to generate specific, actionable suggestions.

Your task is to cross-reference the client's holdings and goals with the news and produce clear action items. Be specific — name actual assets, funds, and areas. Prioritise time-sensitive opportunities.

Return a JSON response with this structure:
{
  "suggestions": [
    {
      "type": "investment" | "property" | "rebalance" | "risk_alert" | "opportunity",
      "priority": "high" | "medium" | "low",
      "title": "Short action title",
      "description": "2-3 sentence explanation of what to do and why",
      "relatedGoal": "goal title or null",
      "relatedNews": "news headline that triggered this",
      "relatedHoldings": ["asset names from portfolio"]
    }
  ]
}

Generate 3-5 suggestions, ranked by priority. Be practical and London-market-specific.`;

  const userPrompt = `CLIENT PROFILE:
Name: ${client.name}
Risk Profile: ${client.riskProfile}
Total Portfolio Value: £${client.portfolio.totalValue.toLocaleString()}

HOLDINGS:
${holdingsSummary}

GOALS:
${goalsSummary}

RECENT LONDON FINANCIAL NEWS:
${newsSummary}

---
Analyse this client's position against the news and generate specific advisory action items.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      clientId: client.id,
      clientName: client.name,
      suggestions: result.suggestions || []
    };
  } catch (error) {
    console.error('OpenAI API error (advisory):', error);
    throw new Error('Failed to generate advisory suggestions: ' + error.message);
  }
}

/**
 * Analyse the impact of a single news article across all clients.
 * Returns only clients that are meaningfully affected.
 */
async function generateNewsImpact(newsItem, allClients) {
  const clientsSummary = allClients.map(c => {
    const holdings = c.portfolio.holdings
      .map(h => `${h.asset} (${h.type}, £${h.value.toLocaleString()})`)
      .join(', ');
    const goals = c.goals
      .map(g => {
        let d = `${g.title} (${g.type}, target £${g.targetAmount.toLocaleString()}, saved £${g.currentSavings.toLocaleString()})`;
        if (g.area) d += ` [area: ${g.area}]`;
        return d;
      })
      .join('; ');
    return `CLIENT ID: ${c.id}\nName: ${c.name} | Risk: ${c.riskProfile} | Portfolio: £${c.portfolio.totalValue.toLocaleString()}\nHoldings: ${holdings}\nGoals: ${goals}`;
  }).join('\n\n');

  const systemPrompt = `You are a senior London-based financial advisor AI. You are given a single financial news article and a list of advisory clients with their portfolios and goals.

Your task:
1. Determine which clients are meaningfully affected by this specific news article.
2. For each affected client, explain the impact and provide a concrete action item.
3. Only include clients where there is a clear, direct connection (matching holdings, relevant goals/areas, or material portfolio impact). Do NOT include clients with only tenuous links.

Return a JSON response:
{
  "impacts": [
    {
      "clientId": "client-xxx",
      "clientName": "Name",
      "impact": "1-2 sentence explanation of how this news affects this client specifically",
      "actionItem": "Specific action the advisor should take for this client",
      "priority": "high" | "medium" | "low",
      "relatedHoldings": ["asset names from their portfolio that are relevant"],
      "relatedGoal": "goal title if relevant, or null"
    }
  ]
}

If no clients are meaningfully affected, return { "impacts": [] }. Be precise and London-market-specific.`;

  const userPrompt = `NEWS ARTICLE:
Headline: ${newsItem.headline}
Summary: ${newsItem.summary}
Category: ${newsItem.category}
Source: ${newsItem.source}
Date: ${newsItem.date}
Relevant areas: ${newsItem.relevantAreas.join(', ')}

---

ALL CLIENTS:

${clientsSummary}

---
Identify which clients are affected by this news article and provide specific impact analysis and action items for each.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      newsId: newsItem.id,
      headline: newsItem.headline,
      impacts: result.impacts || []
    };
  } catch (error) {
    console.error('OpenAI API error (news impact):', error);
    throw new Error('Failed to analyse news impact: ' + error.message);
  }
}

/**
 * Extract action items from a meeting transcript.
 * Looks for tasks, follow-ups, commitments, and anything labelled as an action.
 */
async function extractActionItems(transcript) {
  const systemPrompt = `You are an AI assistant that extracts action items from meeting transcripts between a financial advisor and their client.

Your task:
1. Read the transcript carefully.
2. Identify every action item, task, follow-up, commitment, or to-do mentioned by any participant.
3. Look for phrases like "I'll do", "we need to", "action item", "follow up on", "let's schedule", "please send", "I will", "next step", etc.
4. Also capture implicit actions — if someone agrees to do something, that counts.

Return a JSON response with this structure:
{
  "actionItems": [
    {
      "text": "Clear, concise description of the action item",
      "assignee": "Name of the person responsible (or 'Advisor' / 'Client' if name unclear)"
    }
  ]
}

If no action items are found, return { "actionItems": [] }.
Be thorough — it's better to capture a borderline action item than to miss one.`;

  const userPrompt = `Here is the meeting transcript:\n\n${transcript}\n\n---\n\nExtract all action items from this meeting.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      actionItems: result.actionItems || []
    };
  } catch (error) {
    console.error('OpenAI API error (extractActionItems):', error);
    throw new Error('Failed to extract action items: ' + error.message);
  }
}

module.exports = {
  checkQuestionCoverage,
  generateMeetingSummary,
  generateAdvisorySuggestions,
  generateNewsImpact,
  extractActionItems
};
