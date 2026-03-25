const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  monitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Monitor', required: true },
  type: { type: String, enum: ['trigger', 'error', 'info'], default: 'trigger' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  value: { type: String },
  isRead: { type: Boolean, default: false },
  emailSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
