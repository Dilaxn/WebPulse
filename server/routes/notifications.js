const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// GET /api/notifications
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 50, unreadOnly } = req.query;
    const query = { user: req.userId };
    if (unreadOnly === 'true') query.isRead = false;

    const notifications = await Notification.find(query)
      .populate('monitor', 'name url')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({ user: req.userId, isRead: false });

    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.userId, isRead: false }, { isRead: true });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', auth, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { isRead: true }
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.userId });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/notifications/test-email
router.post('/test-email', auth, async (req, res) => {
  try {
    const sent = await emailService.sendTestEmail(req.user.notificationEmail || req.user.email);
    res.json({ success: sent, message: sent ? 'Test email sent!' : 'Failed to send test email' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
