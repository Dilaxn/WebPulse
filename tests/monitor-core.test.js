const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const { evaluateWithAI, parseNumericCondition } = require('../server/services/aiService');
const scraper = require('../server/services/scraperService');

const PAGE = 'DATE: 02/10/2025 22KT LKR 283,000 DATE: 03/10/2026 22KT LKR 335,800';
const condition = 'Return true if the 22KT gold price is less than 320000';

test('parses the user numeric condition', () => {
  assert.deepEqual(parseNumericCondition(condition), { operator: '<', threshold: 320000 });
});

test('uses the selected current price and compares it in code', async () => {
  const original = axios.post;
  const key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  axios.post = async () => ({ data: { choices: [{ message: { content: JSON.stringify({
    found: true, met: true, extractedValue: '335,800', evidence: '03/10/2026 22KT LKR 335,800', reason: 'Latest dated price'
  }) } }] } });
  try {
    const result = await evaluateWithAI(PAGE, condition);
    assert.equal(result.met, false);
    assert.equal(result.extractedValue, '335,800');
  } finally { axios.post = original; process.env.OPENAI_API_KEY = key; }
});

test('rejects an extracted value absent from the page', async () => {
  const original = axios.post;
  const key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  axios.post = async () => ({ data: { choices: [{ message: { content: JSON.stringify({
    found: true, met: true, extractedValue: '300,000', evidence: '03/10/2026 22KT LKR 335,800', reason: 'Price'
  }) } }] } });
  try {
    await assert.rejects(evaluateWithAI(PAGE, condition), /could not be verified/);
  } finally { axios.post = original; process.env.OPENAI_API_KEY = key; }
});

test('falls back to direct HTML when Firecrawl cannot scrape', async () => {
  const firecrawl = scraper.scrapeWithFirecrawl;
  const cheerio = scraper.scrapeWithCheerio;
  const key = process.env.FIRECRAWL_API_KEY;
  process.env.FIRECRAWL_API_KEY = 'test-key';
  scraper.scrapeWithFirecrawl = async () => ({ success: false, error: 'quota' });
  scraper.scrapeWithCheerio = async () => ({ success: true, value: PAGE, source: 'Direct HTML' });
  try {
    const result = await scraper.scrapeForAI('https://ravijewellers.lk/');
    assert.equal(result.source, 'Direct HTML');
    assert.equal(result.value, PAGE);
  } finally { scraper.scrapeWithFirecrawl = firecrawl; scraper.scrapeWithCheerio = cheerio; if (key === undefined) delete process.env.FIRECRAWL_API_KEY; else process.env.FIRECRAWL_API_KEY = key; }
});
