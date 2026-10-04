# WebPulse

WebPulse watches a web page on a schedule, evaluates a plain language condition with OpenAI, and shows the answer and observed value. It can send an email or in-app alert when the condition is true.

## Example

- URL: `https://ravijewellers.lk/`
- Condition: `Return true if the 22KT gold price is less than 320000 LKR`
- Interval: `Every hour`

At each check, WebPulse fetches readable page text, asks OpenAI to identify the relevant value and a supporting excerpt, and compares numeric thresholds in JavaScript. The latest dated relevant value should be selected when a page lists historical prices. The monitor records `true`, `false`, or an error when the requested value cannot be verified. Errors do not trigger alerts.

## Setup

Requirements: Node.js 18+, MongoDB, an OpenAI API key, and optionally a Firecrawl API key and SMTP credentials.

```bash
npm ci
cd client && npm ci && cd ..
cp .env.production.example .env
```

Set `MONGO_URI`, `JWT_SECRET`, and `OPENAI_API_KEY` in `.env`. Set `FIRECRAWL_API_KEY` for a higher rate limit and more reliable scheduled scraping. Set `SMTP_*` to deliver email alerts. Use `npm run dev` for the server and React client, or `npm run build && npm start` for production.

The server listens on port 5002 by default and the development client on port 3002.

## Scraping and cost

AI monitors and the page preview use the same scraper. With a Firecrawl key, they try Firecrawl markdown first, then direct HTML, then Jina Reader. Without a key, direct HTML runs first; Firecrawl keyless and Jina remain fallbacks. Firecrawl requests use `maxAge: 0` so scheduled checks request fresh content. A successful scrape does not prove that the source page itself updated recently; check the page's own dates.

As of October 2026, [Firecrawl's pricing](https://www.firecrawl.dev/pricing) lists 1,000 free credits per month and a basic one-page scrape at one credit. One hourly monitor uses roughly 720 page scrapes in a 30-day month; a five-minute monitor uses about 8,640. Firecrawl also documents [keyless scraping](https://docs.firecrawl.dev/features/scrape) with lower rate limits, but keyless access can be blocked for some server IP addresses. OpenAI API usage has separate costs. Add a Firecrawl key for scheduled production use and set intervals with those limits in mind.

The app uses OpenAI's strict JSON schema response format, which is the JavaScript equivalent of validating a Pydantic output model. It verifies that the returned value and evidence appear in the scraped content before recording a result. A missing value, an invalid response, or an API error is stored as an error, rather than a false condition.

## Checks

```bash
node --test tests/*.test.js
npm run build
```

The scheduler runs inside the Node.js server process. Keep one server instance running continuously for scheduled checks; multiple server instances would need a shared job queue to avoid duplicate runs.
