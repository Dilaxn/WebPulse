const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const { evaluateWithAI, parseNumericCondition } = require('../server/services/aiService');
const scraper = require('../server/services/scraperService');

const today = new Date();
const CURRENT_DATE = `${String(today.getUTCDate()).padStart(2, '0')}/${String(today.getUTCMonth() + 1).padStart(2, '0')}/${today.getUTCFullYear()}`;
const PAGE = `DATE: 02/10/2025 22KT LKR 283,000 DATE: ${CURRENT_DATE} 22KT LKR 335,800`;
const condition = 'Return true if the 22KT gold price is less than 320000';

test('parses the user numeric condition', () => {
  assert.deepEqual(parseNumericCondition(condition), { operator: '<', threshold: 320000 });
});

test('uses the selected current price and compares it in code', async () => {
  const original = axios.post;
  const key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  axios.post = async () => ({ data: { choices: [{ message: { content: JSON.stringify({
    found: true, met: true, extractedValue: '335,800', evidence: `${CURRENT_DATE} 22KT LKR 335,800`, reason: 'Latest dated price'
  }) } }] } });
  try {
    const result = await evaluateWithAI(PAGE, condition);
    assert.equal(result.met, false);
    assert.equal(result.extractedValue, '335,800');
  } finally { axios.post = original; process.env.OPENAI_API_KEY = key; }
});

test('verifies a numeric value despite AI changing commas and evidence whitespace', async () => {
  const original = axios.post;
  const key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  axios.post = async () => ({ data: { choices: [{ message: { content: JSON.stringify({
    found: true, met: true, extractedValue: '335800',
    evidence: `DATE: ${CURRENT_DATE}\n22KT LKR 335800`, reason: 'Latest dated price'
  }) } }] } });
  try {
    const result = await evaluateWithAI(PAGE, condition);
    assert.equal(result.met, false);
    assert.equal(result.extractedValue, '335,800');
    assert.match(result.evidence, /22KT LKR 335,800/);
  } finally { axios.post = original; if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key; }
});

test('rejects an extracted value absent from the page', async () => {
  const original = axios.post;
  const key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  axios.post = async () => ({ data: { choices: [{ message: { content: JSON.stringify({
    found: true, met: true, extractedValue: '300,000', evidence: `${CURRENT_DATE} 22KT LKR 335,800`, reason: 'Price'
  }) } }] } });
  try {
    await assert.rejects(evaluateWithAI(PAGE, condition), /was not found in the scraped page/);
  } finally { axios.post = original; process.env.OPENAI_API_KEY = key; }
});

test('prefers direct HTML even when a Firecrawl key is configured', async () => {
  const firecrawl = scraper.scrapeWithFirecrawl;
  const cheerio = scraper.scrapeWithCheerio;
  const key = process.env.FIRECRAWL_API_KEY;
  process.env.FIRECRAWL_API_KEY = 'test-key';
  scraper.scrapeWithFirecrawl = async () => { throw new Error('Firecrawl should not be called'); };
  scraper.scrapeWithCheerio = async () => ({ success: true, value: PAGE, source: 'Direct HTML' });
  try {
    const result = await scraper.scrapeForAI('https://ravijewellers.lk/');
    assert.equal(result.source, 'Direct HTML');
    assert.equal(result.value, PAGE);
  } finally { scraper.scrapeWithFirecrawl = firecrawl; scraper.scrapeWithCheerio = cheerio; if (key === undefined) delete process.env.FIRECRAWL_API_KEY; else process.env.FIRECRAWL_API_KEY = key; }
});

test('ignores an old karat price when a newer dated rate is on the page', async () => {
  const original = axios.post;
  const key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  const page = `DATE: 02/10/2025 22KT LKR 283,000 DATE: ${CURRENT_DATE} 22KT LKR 342,200`;
  axios.post = async () => ({ data: { choices: [{ message: { content: JSON.stringify({
    found: true, met: true, extractedValue: '283,000', evidence: '22KT LKR 283,000', reason: 'Gold price'
  }) } }] } });
  try {
    const result = await evaluateWithAI(page, condition);
    assert.equal(result.met, false);
    assert.equal(result.extractedValue, '342,200');
    assert.match(result.evidence, /22KT LKR 342,200/);
  } finally { axios.post = original; if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key; }
});

test('refuses to trigger from a page containing only a year-old rate', async () => {
  const original = axios.post;
  const key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  axios.post = async () => ({ data: { choices: [{ message: { content: JSON.stringify({
    found: true, met: true, extractedValue: '283,000', evidence: '22KT LKR 283,000', reason: 'Gold price'
  }) } }] } });
  try {
    await assert.rejects(evaluateWithAI('DATE: 02/10/2025 22KT LKR 283,000', condition), /over seven days old/);
  } finally { axios.post = original; if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key; }
});

test('reports which provider returned a 403', async () => {
  const original = axios.get;
  axios.get = async () => {
    const error = new Error('Request failed with status code 403');
    error.response = { status: 403 };
    throw error;
  };
  try {
    const direct = await scraper.scrapeWithCheerio('https://ravijewellers.lk/');
    const jina = await scraper.scrapeWithJina('https://ravijewellers.lk/');
    assert.match(direct.error, /Direct HTML: HTTP 403 from website/);
    assert.match(jina.error, /Jina Reader: HTTP 403/);
  } finally { axios.get = original; }
});
