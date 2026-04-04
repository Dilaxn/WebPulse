const mongoose = require('mongoose');

const monitorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Basic info
  name: { type: String, required: true, trim: true },
  url:  { type: String, required: true, trim: true },
  description: { type: String, trim: true },

  // AI condition (natural language — what should trigger the alert)
  aiPrompt: { type: String, required: true, trim: true },

  // Internal — always ai_match, kept for schema consistency
  condition: {
    operator: { type: String, default: 'ai_match' },
    value:    { type: String, default: '' },
    valueType:{ type: String, default: 'string' }
  },

  // Schedule
  interval: {
    type: String,
    enum: ['5m', '15m', '30m', '1h', '3h', '6h', '12h', '1d'],
    default: '1h'
  },
  cronExpression: { type: String },

  // Notification
  notifyVia: {
    type: [String],
    enum: ['email', 'inapp'],
    default: ['email', 'inapp']
  },
  notificationEmails: { type: [String], default: [] },

  // State
  isActive:  { type: Boolean, default: true },
  isPaused:  { type: Boolean, default: false },

  // Tracking
  lastChecked: { type: Date },
  lastValue:   { type: String },
  lastStatus:  { type: String, enum: ['success', 'error', 'triggered', 'pending'], default: 'pending' },
  lastError:   { type: String },
  triggerCount:{ type: Number, default: 0 },
  checkCount:  { type: Number, default: 0 },

  // History (last 50 checks)
  history: [{
    checkedAt: { type: Date, default: Date.now },
    value:  String,
    status: { type: String, enum: ['success', 'error', 'triggered'] },
    error:  String
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-generate cron expression from interval
monitorSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (this.isModified('interval')) {
    const cronMap = {
      '5m':  '*/5 * * * *',
      '15m': '*/15 * * * *',
      '30m': '*/30 * * * *',
      '1h':  '0 * * * *',
      '3h':  '0 */3 * * *',
      '6h':  '0 */6 * * *',
      '12h': '0 */12 * * *',
      '1d':  '0 9 * * *'
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

monitorSchema.index({ user: 1, isActive: 1 });
monitorSchema.index({ isActive: 1, isPaused: 1 });

module.exports = mongoose.model('Monitor', monitorSchema);
