// Polyfill File for Node.js < 20 (required by undici)
if (typeof File === 'undefined') {
  const { Blob } = require('buffer');
  global.File = class File extends Blob {
    constructor(chunks, filename, options = {}) {
      super(chunks, options);
      this.name = filename;
      this.lastModified = options.lastModified ?? Date.now();
    }
  };
}

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/db');
const scheduler = require('./services/schedulerService');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middleware
app.use(helmet({ contentSecurityPolicy: false }));

// In production (same-origin), CORS is not needed.
// In development, allow the local React dev server.
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.APP_URL ? [process.env.APP_URL] : true)
  : ['http://localhost:3000', 'http://localhost:3002'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.options('*', cors());

app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/monitors', require('./routes/monitors'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/stats', require('./routes/stats'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeJobs: scheduler.getActiveJobCount(),
    timestamp: new Date().toISOString()
  });
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🚀 Web Monitor Agent running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   API: http://localhost:${PORT}/api/health\n`);
  });

  // Initialize scheduler after DB connection
  await scheduler.init();
};

startServer().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await scheduler.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down...');
  await scheduler.shutdown();
  process.exit(0);
});
