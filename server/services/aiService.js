const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant'; // Free tier: 14,400 req/day, 30 RPM

/**
 * Ask Groq whether the scraped content satisfies the user's condition.
 * Returns { met: bool, extractedValue: string|null, reason: string }
 */
async function evaluateWithAI(scrapedContent, userPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { met: false, reason: 'GROQ_API_KEY not set in .env' };
  }

  const systemMessage = `You are a web monitoring assistant. When given scraped webpage content and a condition, you must:
1. Extract the specific value relevant to the condition (e.g. the gold price, product price, etc.)
2. If multiple dated values exist, use the most recent (latest) one
3. Evaluate whether the condition is currently met

Respond ONLY with a valid JSON object, no extra text:
{"met": true, "extractedValue": "the specific value you found", "reason": "brief explanation"}
or
{"met": false, "extractedValue": "the specific value you found", "reason": "brief explanation"}`;

  const userMessage = `Scraped content:
"""
${scrapedContent.substring(0, 8000)}
"""

Condition: "${userPrompt}"`;

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        temperature: 0,
        max_tokens: 200
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const text = response.data?.choices?.[0]?.message?.content || '';

    // Extract JSON from response (strip any markdown fences if present)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { met: false, reason: `AI returned unexpected response: ${text.substring(0, 100)}` };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      met: Boolean(parsed.met),
      extractedValue: parsed.extractedValue || null,
      reason: parsed.reason || 'AI check complete'
    };
  } catch (err) {
    if (err.response?.data?.error) {
      return { met: false, reason: `AI API error: ${err.response.data.error.message}` };
    }
    return { met: false, reason: `AI check failed: ${err.message}` };
  }
}

module.exports = { evaluateWithAI };
