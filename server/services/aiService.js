const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Ask Groq whether the scraped content satisfies the user's condition.
 * Returns { met: bool, extractedValue: string|null, reason: string }
 */
async function evaluateWithAI(scrapedContent, userPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { met: false, reason: 'GROQ_API_KEY not set in .env' };
  }

  const today = new Date().toISOString().split('T')[0];

  const systemMessage = `You are a web page monitor. Today is ${today}.

Your ONLY job: decide if the user's condition is satisfied RIGHT NOW based on the page content.

CRITICAL RULES:
1. Find the relevant value(s) in the content.
2. If there are multiple entries with dates, pick the MOST RECENT date.
3. Strip ALL currency symbols (LKR, USD, Rs, $, £, €) and commas before any number comparison.
4. "drops below X" means: is the current number LESS THAN X? This is NOT about change over time — just compare the current number to X.
5. "below X" = number < X → met: true
6. "above X" = number > X → met: true
7. "contains [text]" = text appears on page → met: true
8. "in stock", "available", "open" etc. = look for those words → met: true
9. If value is not found at all → met: false

EXAMPLE:
Content: "22KT LKR 368,000"
Condition: "Alert me when price drops below LKR 380,000"
Calculation: strip symbols → 368000 < 380000 → TRUE → met: true

You MUST return ONLY this JSON with no other text:
{"met": true, "extractedValue": "exact text from page", "reason": "one sentence"}`;

  const userMessage = `Page content:
"""
${scrapedContent.substring(0, 8000)}
"""

Condition: "${userPrompt}"

Return JSON only.`;

  const callGroq = async () => {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        temperature: 0,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );
    return response.data?.choices?.[0]?.message?.content || '';
  };

  let rawResponse = '';
  try {
    try {
      rawResponse = await callGroq();
    } catch (firstErr) {
      // Retry once on rate-limit (429) after a short wait
      if (firstErr.response?.status === 429) {
        console.warn('  ⚠️  Groq rate limited, retrying in 3s...');
        await new Promise(r => setTimeout(r, 3000));
        rawResponse = await callGroq();
      } else {
        throw firstErr;
      }
    }

    console.log(`  🤖 Raw AI response: ${rawResponse}`);

    let parsed;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      const jsonMatch = rawResponse.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) {
        return { met: false, reason: `AI returned non-JSON: ${rawResponse.substring(0, 200)}` };
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    // Normalise met — handle string "true"/"false" just in case
    let met = parsed.met;
    if (typeof met === 'string') {
      met = met.trim().toLowerCase() === 'true';
    } else {
      met = Boolean(met);
    }

    return {
      met,
      extractedValue: parsed.extractedValue || null,
      reason: parsed.reason || 'AI check complete'
    };
  } catch (err) {
    console.error(`  ❌ AI eval error. Raw: "${rawResponse}" | ${err.message}`);
    if (err.response?.data?.error) {
      return { met: false, reason: `AI API error: ${err.response.data.error.message}` };
    }
    return { met: false, reason: `AI check failed: ${err.message}` };
  }
}

module.exports = { evaluateWithAI };
