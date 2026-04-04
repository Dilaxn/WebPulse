const axios = require('axios');
const cheerio = require('cheerio');
let puppeteer;

try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.log('⚠️  Puppeteer not available, using Cheerio-only mode');
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

  // ---- Cheerio-based scraping (fast, lightweight) ----
  async scrapeWithCheerio(url, selector, attribute = 'text', regex = null) {
    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
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
        // No selector — get full page text
        value = $('body').text().trim().substring(0, 5000);
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

  // ---- Puppeteer-based scraping (for JS-rendered pages) ----
  async scrapeWithPuppeteer(url, selector, attribute = 'text', regex = null) {
    if (!puppeteer) {
      return this.scrapeWithCheerio(url, selector, attribute, regex);
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
          console.warn('⚠️  Puppeteer browser launch failed, falling back to Cheerio:', launchError.message);
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

      // Wait for selector if provided
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
        value = await page.evaluate(() => document.body.innerText.substring(0, 5000));
      }

      // Apply regex
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
    const { url, selector, attribute, regex, usePuppeteer } = monitor;

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
      // Smart extraction: prefer comma-formatted prices (e.g. "22KT LKR 377,400" -> 377400)
      const extractNumber = (str) => {
        // Prefer comma-formatted numbers (e.g. "22KT LKR 377,400" -> 377400)
        const commaMatches = str.match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?/g);
        if (commaMatches) {
          return parseFloat(commaMatches[commaMatches.length - 1].replace(/,/g, ''));
        }
        // Fall back: collect all plain numbers, return the last one >= 100
        // (avoids "22" in "22KT" being mistaken for a price)
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
        return { met: String(current) === String(target), reason: `"${current}" ${current == target ? '==' : '!='} "${target}"` };
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
        return { met: true, reason: 'Value change detected' }; // Handled separately in scheduler
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
