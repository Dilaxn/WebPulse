# WebPulse — Intelligent Web Monitoring Agent

A full-stack MERN application that monitors web pages, scrapes specific data using CSS selectors, evaluates conditions, and sends email/webhook alerts when conditions are met.

## Features

- **Dynamic Monitor Creation** — Add unlimited web monitors via the dashboard
- **Smart Scraping** — Cheerio (fast, lightweight) or Puppeteer (JavaScript-rendered pages)
- **Flexible Conditions** — Less than, greater than, equals, contains, changes detection
- **Multiple Alert Channels** — Email (SMTP), Webhooks, In-App notifications
- **Configurable Intervals** — From every 1 minute to daily checks
- **CSS Selector Targeting** — Monitor any element on any page
- **Regex Extraction** — Pull numbers from price strings like "Rs. 360,000"
- **Check History** — Track last 50 checks per monitor with values and timestamps
- **Test Before Save** — Test your selector setup before creating a monitor
- **Auth System** — JWT-based authentication with user accounts

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB (local or [MongoDB Atlas](https://cloud.mongodb.com) free tier)
- Gmail account with App Password (for email alerts)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd web-monitor
npm install
cd client && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
MONGO_URI=mongodb://localhost:27017/web-monitor
JWT_SECRET=your_random_secret_here_make_it_long
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
EMAIL_FROM=WebPulse <your_email@gmail.com>
```

**Gmail App Password Setup:**
1. Go to Google Account → Security → 2-Step Verification (enable it)
2. Go to App Passwords → Generate one for "Mail"
3. Use that 16-character password as `SMTP_PASS`

### 3. Run

```bash
# Development (both server + client with hot reload)
npm run dev

# Or separately:
npm run server   # Backend on :5000
npm run client   # React on :3000
```

Visit `http://localhost:3000`

---

## Example Monitors

### Gold Price Tracker (Ravi Jewellers)

| Field | Value |
|---|---|
| **Name** | Gold Price - Ravi Jewellers |
| **URL** | `https://ravijewellers.lk/` |
| **Type** | Price Drop |
| **CSS Selector** | *(use browser DevTools to find the price element selector)* |
| **Regex** | `(\d[\d,.]+)` |
| **Condition** | Less than → `360000` (Number) |
| **Interval** | Every 1 hour |
| **Puppeteer** | Enable if page uses JavaScript rendering |

### Goethe German Course (A1 Sat/Sun)

| Field | Value |
|---|---|
| **Name** | German A1 Weekend Course |
| **URL** | `https://www.goethe.de/ins/lk/en/spr/kur/tup.cfm?...` |
| **Type** | Text Match |
| **CSS Selector** | *(target the course schedule/availability element)* |
| **Condition** | Contains → `Saturday` or `Available` |
| **Interval** | Every 6 hours |
| **Puppeteer** | Enable (Goethe site is JS-heavy) |

---

## Finding CSS Selectors

1. Open target URL in Chrome/Firefox
2. Right-click the element you want to track → **Inspect**
3. In DevTools, right-click the highlighted HTML → **Copy** → **Copy selector**
4. Paste into the "CSS Selector" field
5. Use the **Test Now** button to verify before saving

**Tips:**
- For prices displayed as "Rs. 360,000", use regex `(\d[\d,.]+)` to extract just `360000`
- If the page loads data via JavaScript, enable the "Puppeteer" checkbox
- Try broad selectors first (e.g., `.price`, `h2`), then narrow down

---

## Deploying to Namecheap Shared Hosting

### Option A: Namecheap with Node.js (Stellar Business+ plan)

Namecheap shared hosting supports Node.js via Phusion Passenger:

1. **Build the React client:**
   ```bash
   npm run build
   ```

2. **Upload via cPanel File Manager or SSH:**
   Upload the entire project (excluding `node_modules` and `client/node_modules`) to your home directory.

3. **Set up Node.js in cPanel:**
   - Go to cPanel → "Setup Node.js App"
   - Node version: 18+
   - Application root: `/home/<username>/web-monitor`
   - Startup file: `server/index.js`
   - Click "Create"

4. **Install dependencies via SSH:**
   ```bash
   cd ~/web-monitor
   npm install --production
   ```

5. **Set environment variables** in cPanel Node.js app settings or create `.env` file

6. **MongoDB:** Use MongoDB Atlas (free tier) since shared hosting doesn't include MongoDB.

7. **Important:** Set `USE_CHEERIO_ONLY=true` in `.env` — Puppeteer won't work on shared hosting.

### Option B: VPS (Recommended for Full Features)

For Puppeteer support and better reliability, use a VPS:

**DigitalOcean / Vultr / Linode ($5-6/mo):**

```bash
# On your VPS
sudo apt update && sudo apt install -y nodejs npm mongodb-org nginx

# Clone and setup
git clone <repo> ~/web-monitor
cd ~/web-monitor
npm run setup

# Create .env
cp .env.example .env
nano .env  # Fill in your values

# Run with PM2 (process manager)
npm install -g pm2
pm2 start server/index.js --name webpulse
pm2 startup
pm2 save

# Nginx reverse proxy
sudo nano /etc/nginx/sites-available/webpulse
```

Nginx config:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then enable SSL with Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Option C: Free/Cheap Cloud Hosting

- **Railway.app** — Free tier, easy deploy, supports MongoDB
- **Render.com** — Free tier with cron support
- **Fly.io** — Free tier, global deployment

---

## Architecture

```
web-monitor/
├── server/
│   ├── index.js              # Express server entry
│   ├── config/db.js          # MongoDB connection
│   ├── middleware/auth.js     # JWT auth middleware
│   ├── models/
│   │   ├── User.js           # User schema
│   │   ├── Monitor.js        # Monitor schema (core)
│   │   └── Notification.js   # Alert notifications
│   ├── routes/
│   │   ├── auth.js           # Login/Register
│   │   ├── monitors.js       # CRUD + run/toggle
│   │   ├── notifications.js  # Alerts management
│   │   └── stats.js          # Dashboard stats
│   └── services/
│       ├── scraperService.js  # Cheerio + Puppeteer scraping
│       ├── schedulerService.js # Cron job management
│       └── emailService.js    # Nodemailer SMTP
├── client/
│   └── src/
│       ├── App.js            # Router + Auth
│       ├── hooks/useAuth.js  # Auth context
│       ├── utils/api.js      # Axios API client
│       ├── components/       # Sidebar, shared UI
│       ├── pages/            # All page components
│       └── styles/           # Global CSS
├── .env.example              # Environment template
├── .htaccess                 # Namecheap Passenger config
└── package.json              # Root with scripts
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/monitors` | List all monitors |
| POST | `/api/monitors` | Create monitor |
| GET | `/api/monitors/:id` | Get monitor + history |
| PUT | `/api/monitors/:id` | Update monitor |
| DELETE | `/api/monitors/:id` | Delete monitor |
| POST | `/api/monitors/:id/run` | Force run check |
| POST | `/api/monitors/:id/toggle` | Pause/Resume |
| POST | `/api/monitors/test-scrape` | Test scrape without saving |
| GET | `/api/notifications` | List alerts |
| PUT | `/api/notifications/read-all` | Mark all read |
| POST | `/api/notifications/test-email` | Send test email |
| GET | `/api/stats` | Dashboard stats |
| GET | `/api/health` | Server health check |

---

## License

MIT
