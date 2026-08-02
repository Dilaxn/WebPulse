const axios = require('axios');

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini';

/**
 * Detect numeric comparison in the user's prompt.
 * Returns { operator, threshold } or null if not a numeric condition.
 */
function parseNumericCondition(prompt) {
  const belowMatch = prompt.match(
    /(?:below|less than|under|drops?\s+below|lower than)\s*(?:LKR|USD|Rs\.?|£|€|\$)?\s*([\d,]+)/i
  );
  if (belowMatch) return { operator: '<', threshold: parseFloat(belowMatch[1].replace(/,/g, '')) };

  const aboveMatch = prompt.match(
    /(?:above|greater than|over|rises?\s+above|exceeds?|higher than)\s*(?:LKR|USD|Rs\.?|£|€|\$)?\s*([\d,]+)/i
  );
  if (aboveMatch) return { operator: '>', threshold: parseFloat(aboveMatch[1].replace(/,/g, '')) };

  return null;
}

/**
 * Extract the first large numeric value from a string like "LKR 366,200".
 * Handles both Western (366,200) and Indian (3,66,200) comma formats.
 */
function extractNumber(text) {
  if (!text) return NaN;
  const commaMatches = text.match(/\d{1,3}(?:,\d{2,3})+(?:\.\d+)?/g);
  if (commaMatches) {
    return parseFloat(commaMatches[commaMatches.length - 1].replace(/,/g, ''));
  }
  const plain = (text.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  const large = plain.filter(n => n >= 100);
  return large.length ? large[large.length - 1] : (plain[plain.length - 1] ?? NaN);
}

/**
 * Evaluate whether the scraped content satisfies the user's condition.
 *
 * For numeric conditions (below/above + number):
 *   → AI extracts the value only; JavaScript does the comparison (100% reliable).
 *
 * For all other conditions (in stock, contains text, etc.):
 *   → AI evaluates the full condition.
 *
 * Returns { met: bool, extractedValue: string|null, reason: string }
 */
async function evaluateWithAI(scrapedContent, userPrompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { met: false, reason: 'OPENAI_API_KEY not set in .env' };

  const today = new Date().toISOString().split('T')[0];
  const numericCondition = parseNumericCondition(userPrompt);

  let systemMessage, userMessage;

  if (numericCondition) {
    // Numeric mode: only ask AI to extract the value
    systemMessage = `You are a web page data extractor. Today is ${today}.
The user wants a specific numeric value from the page.
Your ONLY job: find and return that single value exactly as it appears on the page.
- If there are multiple entries with dates, return the value with the MOST RECENT date.
- Do NOT evaluate any condition. Do NOT decide true or false.
- If the value is not found, set extractedValue to null.
Return ONLY this JSON with no other text:
{"extractedValue": "exact text from page, e.g. LKR 366,200"}`;

    userMessage = `Page content:
"""
${scrapedContent.substring(0, 8000)}
"""

Extract the relevant value for: "${userPrompt}"

Return JSON only.`;
  } else {
    // Text/general mode: AI evaluates the full condition
    systemMessage = `You are a web page monitor. Today is ${today}.
Your ONLY job: decide if the user's condition is satisfied RIGHT NOW based on the page content.

RULES:
1. Find the relevant value(s) in the content.
2. If multiple entries with dates exist, use the MOST RECENT.
3. Strip ALL currency symbols (LKR, USD, Rs, $, £, €) and commas before any number comparison.
4. "below X" = current < X → met: true  |  "above X" = current > X → met: true
5. "in stock", "available", "open" etc. = look for those words → met: true if found
6. If value not found at all → met: false

EXAMPLES:
[met: true]  Content: "Petrol LKR 368"  | Condition: "below LKR 400" → 368 < 400 → met: true
[met: false] Content: "Petrol LKR 368"  | Condition: "below LKR 300" → 368 < 300 is FALSE → met: false

Return ONLY this JSON with no other text:
{"met": true, "extractedValue": "exact text from page", "reason": "one sentence"}`;

    userMessage = `Page content:
"""
${scrapedContent.substring(0, 8000)}
"""

Condition: "${userPrompt}"

Return JSON only.`;
  }

  const callOpenAI = async () => {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: OPENAI_MODEL,
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
      rawResponse = await callOpenAI();
    } catch (firstErr) {
      if (firstErr.response?.status === 429) {
        console.warn('  ⚠️  OpenAI rate limited, retrying in 3s...');
        await new Promise(r => setTimeout(r, 3000));
        rawResponse = await callOpenAI();
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
      if (!jsonMatch) return { met: false, reason: `AI returned non-JSON: ${rawResponse.substring(0, 200)}` };
      parsed = JSON.parse(jsonMatch[0]);
    }

    // --- Numeric mode: code does the comparison ---
    if (numericCondition) {
      const numStr = parsed.extractedValue || '';
      const num = extractNumber(numStr);
      console.log(`  🔢 Extracted number: ${num} | Condition: ${num} ${numericCondition.operator} ${numericCondition.threshold}`);
      if (isNaN(num)) {
        return { met: false, extractedValue: null, reason: `Could not extract a number from: "${numStr}"` };
      }
      const { operator, threshold } = numericCondition;
      const met = operator === '<' ? num < threshold : num > threshold;
      return {
        met,
        extractedValue: parsed.extractedValue || null,
        reason: `${num.toLocaleString()} ${operator} ${threshold.toLocaleString()} → ${met}`
      };
    }

    // --- Text/general mode: AI decided met ---
    let met = parsed.met;
    if (typeof met === 'string') met = met.trim().toLowerCase() === 'true';
    else met = Boolean(met);

    return {
      met,
      extractedValue: parsed.extractedValue || null,
      reason: parsed.reason || 'AI check complete'
    };

  } catch (err) {
    console.error(`  ❌ AI eval error. Raw: "${rawResponse}" | ${err.message}`);
    if (err.response?.data?.error) return { met: false, reason: `AI API error: ${err.response.data.error.message}` };
    return { met: false, reason: `AI check failed: ${err.message}` };
  }
}

/**
 * Evaluate whether a website screenshot satisfies the user's condition.
 * Uses OpenAI's vision API (gpt-4o-mini supports images).
 * Same return format as evaluateWithAI: { met, extractedValue, reason }
 */
async function evaluateWithAIVision(imageBase64, userPrompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { met: false, reason: 'OPENAI_API_KEY not set in .env' };

  const today = new Date().toISOString().split('T')[0];
  const numericCondition = parseNumericCondition(userPrompt);

  let systemMessage, questionText;

  if (numericCondition) {
    systemMessage = `You are a web page data extractor. Today is ${today}.
The user wants a specific numeric value from this website screenshot.
Your ONLY job: find and return that single value exactly as it appears on the page.
- If there are multiple entries with dates, return the value with the MOST RECENT date.
- Do NOT evaluate any condition. Do NOT decide true or false.
- If the value is not found, set extractedValue to null.
Return ONLY this JSON with no other text:
{"extractedValue": "exact text from page, e.g. LKR 366,200"}`;

    questionText = `Extract the relevant value for: "${userPrompt}"\n\nReturn JSON only.`;
  } else {
    systemMessage = `You are a web page monitor. Today is ${today}.
Your ONLY job: decide if the user's condition is satisfied RIGHT NOW based on this website screenshot.

RULES:
1. Find the relevant value(s) visible in the screenshot.
2. If multiple entries with dates exist, use the MOST RECENT.
3. Strip ALL currency symbols (LKR, USD, Rs, $, £, €) and commas before any number comparison.
4. "below X" = current < X → met: true  |  "above X" = current > X → met: true
5. "in stock", "available", "open" etc. = look for those words → met: true if found
6. If value not found at all → met: false

Return ONLY this JSON with no other text:
{"met": true, "extractedValue": "exact text from page", "reason": "one sentence"}`;

    questionText = `Condition: "${userPrompt}"\n\nReturn JSON only.`;
  }

  const callOpenAI = async () => {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemMessage },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'low'  // 85 tokens flat — cheap and reliable for text extraction
                }
              },
              { type: 'text', text: questionText }
            ]
          }
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
        timeout: 30000
      }
    );
    return response.data?.choices?.[0]?.message?.content || '';
  };

  let rawResponse = '';
  try {
    try {
      rawResponse = await callOpenAI();
    } catch (firstErr) {
      if (firstErr.response?.status === 429) {
        console.warn('  ⚠️  OpenAI rate limited, retrying in 3s...');
        await new Promise(r => setTimeout(r, 3000));
        rawResponse = await callOpenAI();
      } else {
        throw firstErr;
      }
    }

    console.log(`  🤖 Raw vision AI response: ${rawResponse}`);

    let parsed;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      const jsonMatch = rawResponse.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) return { met: false, reason: `Vision AI returned non-JSON: ${rawResponse.substring(0, 200)}` };
      parsed = JSON.parse(jsonMatch[0]);
    }

    if (numericCondition) {
      const numStr = parsed.extractedValue || '';
      const num = extractNumber(numStr);
      console.log(`  🔢 Vision extracted number: ${num} | Condition: ${num} ${numericCondition.operator} ${numericCondition.threshold}`);
      if (isNaN(num)) {
        return { met: false, extractedValue: null, reason: `Could not extract a number from: "${numStr}"` };
      }
      const { operator, threshold } = numericCondition;
      const met = operator === '<' ? num < threshold : num > threshold;
      return {
        met,
        extractedValue: parsed.extractedValue || null,
        reason: `${num.toLocaleString()} ${operator} ${threshold.toLocaleString()} → ${met}`
      };
    }

    let met = parsed.met;
    if (typeof met === 'string') met = met.trim().toLowerCase() === 'true';
    else met = Boolean(met);

    return {
      met,
      extractedValue: parsed.extractedValue || null,
      reason: parsed.reason || 'Vision AI check complete'
    };

  } catch (err) {
    console.error(`  ❌ Vision AI eval error. Raw: "${rawResponse}" | ${err.message}`);
    if (err.response?.data?.error) return { met: false, reason: `Vision AI API error: ${err.response.data.error.message}` };
    return { met: false, reason: `Vision AI check failed: ${err.message}` };
  }
}

module.exports = { evaluateWithAI, evaluateWithAIVision };
