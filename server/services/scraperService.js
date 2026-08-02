const axios = require('axios');
const cheerio = require('cheerio');
let puppeteer;

try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.log('⚠️  Puppeteer not available, using Cheerio/Jina mode');
}

class ScraperService {
  constructor() {
    this.browser = null;
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
  }

  getRandomUA() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  // ---- Jina Reader (renders JS pages, returns clean text — perfect for AI monitors) ----
  async scrapeWithJina(url) {
    try {
      const jinaUrl = `https://r.jina.ai/${url}`;
      const headers = {
        'Accept': 'text/plain',
        'X-Return-Format': 'text',
        'X-Timeout': '30',
        'User-Agent': this.getRandomUA()
      };
      // Use API key if provided (higher rate limits, fewer 403s)
      if (process.env.JINA_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`;
      }
      const { data } = await axios.get(jinaUrl, { headers, timeout: 45000 });
      const text = typeof data === 'string' ? data : JSON.stringify(data);
      return { success: true, value: text.substring(0, 8000) };
    } catch (error) {
      console.warn(`⚠️  Jina Reader failed for ${url}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ---- Cheerio-based scraping (for selector-based monitors on static HTML) ----
  async scrapeWithCheerio(url, selector, attribute = 'text', regex = null) {
    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000,
        maxRedirects: 5
      });

      const $ = cheerio.load(data);
      let value = '';

      if (selector) {
        const element = $(selector).first();
        if (!element.length) {
          throw new Error(`Selector "${selector}" not found on page`);
        }

        if (attribute === 'text') {
          value = element.text().trim();
        } else if (attribute === 'html') {
          value = element.html().trim();
        } else if (attribute === 'exists') {
          value = element.length > 0 ? 'true' : 'false';
        } else {
          value = element.attr(attribute) || '';
        }
      } else {
        // Strip style/script/svg so CSS doesn't eat the character budget
        $('style, script, noscript, svg').remove();
        value = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 8000);
      }

      // Apply regex if provided
      if (regex && value) {
        const match = value.match(new RegExp(regex));
        if (match) {
          value = match[1] || match[0];
        }
      }

      return { success: true, value: value.trim() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ---- Screenshot-based scraping (for vision AI evaluation) ----
  async scrapeWithScreenshot(url) {
    if (!puppeteer) {
      return { success: false, error: 'Puppeteer not available for screenshot mode' };
    }

    let page;
    try {
      if (!this.browser || !this.browser.isConnected()) {
        try {
          this.browser = await puppeteer.launch({
            headless: 'new',
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
              '--single-process'
            ]
          });
        } catch (launchError) {
          return { success: false, error: `Browser launch failed: ${launchError.message}` };
        }
      }

      page = await this.browser.newPage();
      await page.setUserAgent(this.getRandomUA());
      // Wide viewport so headers/nav render properly
      await page.setViewport({ width: 1440, height: 900 });

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

      // Let JS-rendered content (prices, stock info, etc.) finish populating
      await new Promise(r => setTimeout(r, 2000));

      const screenshotBuffer = await page.screenshot({
        type: 'jpeg',
        quality: 35,      // Low quality keeps base64 small → cheaper vision tokens
        fullPage: true    // Capture entire page so any content can be found
      });

      return { success: true, imageBase64: screenshotBuffer.toString('base64') };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      if (page) await page.close().catch(() => {});
    }
  }

  // ---- Puppeteer-based scraping (for JS-rendered pages with selectors) ----
  async scrapeWithPuppeteer(url, selector, attribute = 'text', regex = null) {
    if (!puppeteer) {
      return this.scrapeWithJina(url);
    }

    let page;
    try {
      if (!this.browser || !this.browser.isConnected()) {
        try {
          this.browser = await puppeteer.launch({
            headless: 'new',
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
              '--single-process'
            ]
          });
        } catch (launchError) {
          console.warn('⚠️  Puppeteer browser launch failed, falling back to Jina/Cheerio:', launchError.message);
          // For AI monitors (no selector), use Jina; otherwise Cheerio
          if (!selector) return this.scrapeWithJina(url);
          return this.scrapeWithCheerio(url, selector, attribute, regex);
        }
      }

      page = await this.browser.newPage();
      await page.setUserAgent(this.getRandomUA());
      await page.setViewport({ width: 1366, height: 768 });

      // Block unnecessary resources for speed
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const type = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

      if (selector) {
        await page.waitForSelector(selector, { timeout: 15000 }).catch(() => {});
      }

      let value = '';
      if (selector) {
        value = await page.evaluate((sel, attr) => {
          const el = document.querySelector(sel);
          if (!el) return '';
          if (attr === 'text') return el.textContent.trim();
          if (attr === 'html') return el.innerHTML.trim();
          if (attr === 'exists') return 'true';
          return el.getAttribute(attr) || '';
        }, selector, attribute);
      } else {
        value = await page.evaluate(() => document.body.innerText.substring(0, 8000));
      }

      if (regex && value) {
        const match = value.match(new RegExp(regex));
        if (match) value = match[1] || match[0];
      }

      return { success: true, value: value.trim() };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      if (page) await page.close().catch(() => {});
    }
  }

  // ---- Main scrape method ----
  async scrape(monitor) {
    const { url, selector, attribute, regex, usePuppeteer, condition } = monitor;
    const isAiMonitor = condition && condition.operator === 'ai_match';

    // AI monitors (no selector): always use Jina Reader — renders JS, returns clean text
    if (isAiMonitor || !selector) {
      console.log(`  🌐 Using Jina Reader for: ${url}`);
      const jinaResult = await this.scrapeWithJina(url);
      if (jinaResult.success) return jinaResult;
      // Jina failed — fall back to Cheerio
      console.warn('  ⚠️  Jina fallback to Cheerio');
      return this.scrapeWithCheerio(url, null, attribute, regex);
    }

    // Selector-based monitors: use Puppeteer if requested, otherwise Cheerio
    if (usePuppeteer && process.env.USE_CHEERIO_ONLY !== 'true') {
      return this.scrapeWithPuppeteer(url, selector, attribute, regex);
    }
    return this.scrapeWithCheerio(url, selector, attribute, regex);
  }

  // ---- Evaluate condition ----
  evaluateCondition(currentValue, condition) {
    const { operator, value: targetValue, valueType } = condition;

    let current = currentValue;
    let target = targetValue;

    if (valueType === 'number') {
      const extractNumber = (str) => {
        const commaMatches = str.match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?/g);
        if (commaMatches) {
          return parseFloat(commaMatches[commaMatches.length - 1].replace(/,/g, ''));
        }
        const plainMatches = (str.match(/\d+(?:\.\d+)?/g) || []).map(Number);
        const large = plainMatches.filter(n => n >= 100);
        if (large.length) return large[large.length - 1];
        if (plainMatches.length) return plainMatches[plainMatches.length - 1];
        return NaN;
      };

      current = extractNumber(String(currentValue));
      target = parseFloat(String(targetValue).replace(/,/g, ''));

      if (isNaN(current)) return { met: false, reason: `Could not parse number from: "${currentValue}"` };
      if (isNaN(target)) return { met: false, reason: `Invalid target value: "${targetValue}"` };
    }

    switch (operator) {
      case 'less_than':
        return { met: current < target, reason: `${current} ${current < target ? '<' : '>='} ${target}` };
      case 'greater_than':
        return { met: current > target, reason: `${current} ${current > target ? '>' : '<='} ${target}` };
      case 'equals':
        return { met: String(current) === String(target), reason: `"${current}" ${String(current) === String(target) ? '==' : '!='} "${target}"` };
      case 'contains':
        return { met: String(current).toLowerCase().includes(String(target).toLowerCase()), reason: `Contains check for "${target}"` };
      case 'not_contains':
        return { met: !String(current).toLowerCase().includes(String(target).toLowerCase()), reason: `Not-contains check for "${target}"` };
      case 'contains_all': {
        const keywords = String(targetValue).split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
        const haystack = String(currentValue).toLowerCase();
        const missing = keywords.filter(k => !haystack.includes(k));
        return {
          met: missing.length === 0,
          reason: missing.length === 0
            ? `All keywords found: ${keywords.join(', ')}`
            : `Missing keywords: ${missing.join(', ')}`
        };
      }
      case 'changes':
        return { met: true, reason: 'Value change detected' };
      default:
        return { met: false, reason: 'Unknown operator' };
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}

module.exports = new ScraperService();
