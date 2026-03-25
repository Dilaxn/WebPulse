const express = require('express');
const Monitor = require('../models/Monitor');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const scheduler = require('../services/schedulerService');

const router = express.Router();

// GET /api/stats
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.userId;

    const [
      totalMonitors,
      activeMonitors,
      pausedMonitors,
      totalAlerts,
      unreadAlerts,
      recentAlerts
    ] = await Promise.all([
      Monitor.countDocuments({ user: userId }),
      Monitor.countDocuments({ user: userId, isActive: true, isPaused: false }),
      Monitor.countDocuments({ user: userId, isPaused: true }),
      Notification.countDocuments({ user: userId }),
      Notification.countDocuments({ user: userId, isRead: false }),
      Notification.find({ user: userId })
        .populate('monitor', 'name url')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    res.json({
      totalMonitors,
      activeMonitors,
      pausedMonitors,
      totalAlerts,
      unreadAlerts,
      recentAlerts,
      activeJobs: scheduler.getActiveJobCount()
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
