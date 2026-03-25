const mongoose = require('mongoose');

const monitorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Basic info
  name: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  description: { type: String, trim: true },

  // What to watch
  type: {
    type: String,
    enum: ['price_drop', 'text_match', 'element_exists', 'element_change', 'custom_css'],
    required: true
  },

  // Scraping config
  selector: { type: String, trim: true },         // CSS selector to target
  attribute: { type: String, default: 'text' },    // 'text', 'href', 'src', etc.
  regex: { type: String, trim: true },             // Optional regex to extract value

  // Condition
  condition: {
    operator: {
      type: String,
      enum: ['less_than', 'greater_than', 'equals', 'contains', 'not_contains', 'contains_all', 'ai_match', 'changes'],
      default: 'less_than'
    },
    value: { type: String },                       // Target value (e.g., "360000")
    valueType: { type: String, enum: ['number', 'string'], default: 'string' }
  },

  // AI-based condition (natural language)
  aiPrompt: { type: String, trim: true },

  // Schedule
  interval: {
    type: String,
    enum: ['1m', '5m', '15m', '30m', '1h', '3h', '6h', '12h', '1d'],
    default: '1h'
  },
  cronExpression: { type: String },                // Auto-generated from interval

  // Notification
  notifyVia: {
    type: [String],
    enum: ['email', 'webhook', 'inapp'],
    default: ['email', 'inapp']
  },
  notificationEmails: { type: [String], default: [] }, // Per-monitor recipient emails
  webhookUrl: { type: String, trim: true },

  // State
  isActive: { type: Boolean, default: true },
  isPaused: { type: Boolean, default: false },
  usePuppeteer: { type: Boolean, default: false }, // For JS-rendered pages

  // Tracking
  lastChecked: { type: Date },
  lastValue: { type: String },
  lastStatus: { type: String, enum: ['success', 'error', 'triggered', 'pending'], default: 'pending' },
  lastError: { type: String },
  triggerCount: { type: Number, default: 0 },
  checkCount: { type: Number, default: 0 },

  // History (last 50 checks)
  history: [{
    checkedAt: { type: Date, default: Date.now },
    value: String,
    status: { type: String, enum: ['success', 'error', 'triggered'] },
    error: String
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-generate cron expression from interval
monitorSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (this.isModified('interval')) {
    const cronMap = {
      '1m': '*/1 * * * *',
      '5m': '*/5 * * * *',
      '15m': '*/15 * * * *',
      '30m': '*/30 * * * *',
      '1h': '0 * * * *',
      '3h': '0 */3 * * *',
      '6h': '0 */6 * * *',
      '12h': '0 */12 * * *',
      '1d': '0 9 * * *'     // Daily at 9 AM
    };
    this.cronExpression = cronMap[this.interval] || '0 * * * *';
  }
  next();
});

// Keep only last 50 history entries
monitorSchema.pre('save', function (next) {
  if (this.history && this.history.length > 50) {
    this.history = this.history.slice(-50);
  }
  next();
});

// Index for efficient queries
monitorSchema.index({ user: 1, isActive: 1 });
monitorSchema.index({ isActive: 1, isPaused: 1 });

module.exports = mongoose.model('Monitor', monitorSchema);
