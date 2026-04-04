const express = require('express');
const { body, validationResult } = require('express-validator');
const Monitor = require('../models/Monitor');
const auth = require('../middleware/auth');
const scheduler = require('../services/schedulerService');
const scraper = require('../services/scraperService');

const router = express.Router();

// GET /api/monitors - List all monitors for user
router.get('/', auth, async (req, res) => {
  try {
    const monitors = await Monitor.find({ user: req.userId })
      .select('-history')
      .sort({ createdAt: -1 });
    res.json(monitors);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/monitors/:id - Get single monitor with history
router.get('/:id', auth, async (req, res) => {
  try {
    const monitor = await Monitor.findOne({ _id: req.params.id, user: req.userId });
    if (!monitor) return res.status(404).json({ error: 'Monitor not found' });
    res.json(monitor);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/monitors - Create new monitor
router.post('/', auth, [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('url').isURL().withMessage('Valid URL required'),
  body('type').isIn(['price_drop', 'text_match', 'element_exists', 'element_change', 'custom_css']).withMessage('Invalid type'),
  body('interval').isIn(['1m', '5m', '15m', '30m', '1h', '3h', '6h', '12h', '1d']).withMessage('Invalid interval')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const monitor = await Monitor.create({
      ...req.body,
      user: req.userId
    });

    // Schedule the new monitor
    scheduler.scheduleMonitor(monitor);

    res.status(201).json(monitor);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/monitors/:id - Update monitor
router.put('/:id', auth, async (req, res) => {
  try {
    const monitor = await Monitor.findOne({ _id: req.params.id, user: req.userId });
    if (!monitor) return res.status(404).json({ error: 'Monitor not found' });

    const allowedFields = [
      'name', 'url', 'description', 'type', 'selector', 'attribute',
      'regex', 'condition', 'aiPrompt', 'interval', 'notifyVia', 'notificationEmails',
      'webhookUrl', 'isActive', 'isPaused', 'usePuppeteer'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) monitor[field] = req.body[field];
    });

    await monitor.save();

    // Re-schedule with updated settings
    scheduler.scheduleMonitor(monitor);

    res.json(monitor);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/monitors/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const monitor = await Monitor.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!monitor) return res.status(404).json({ error: 'Monitor not found' });

    scheduler.removeJob(monitor._id);
    res.json({ message: 'Monitor deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/monitors/:id/run - Force run check now
router.post('/:id/run', auth, async (req, res) => {
  try {
    const monitor = await Monitor.findOne({ _id: req.params.id, user: req.userId });
    if (!monitor) return res.status(404).json({ error: 'Monitor not found' });

    await scheduler.forceRun(monitor._id);

    const updated = await Monitor.findById(monitor._id);
    res.json({ message: 'Check completed', monitor: updated });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/monitors/:id/toggle - Pause/Resume
router.post('/:id/toggle', auth, async (req, res) => {
  try {
    const monitor = await Monitor.findOne({ _id: req.params.id, user: req.userId });
    if (!monitor) return res.status(404).json({ error: 'Monitor not found' });

    monitor.isPaused = !monitor.isPaused;
    await monitor.save();

    if (monitor.isPaused) {
      scheduler.removeJob(monitor._id);
    } else {
      scheduler.scheduleMonitor(monitor);
    }

    res.json({ isPaused: monitor.isPaused, monitor });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/monitors/test-scrape - Test scrape without saving
router.post('/test-scrape', auth, async (req, res) => {
  try {
    const { url, selector, attribute, regex, usePuppeteer, useJina } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    let result;
    if (useJina || !selector) {
      // No selector = AI monitor mode: use Jina Reader for JS-rendered content
      result = await scraper.scrapeWithJina(url);
      if (!result.success) {
        result = await scraper.scrapeWithCheerio(url, null, attribute, regex);
      }
    } else if (usePuppeteer) {
      result = await scraper.scrapeWithPuppeteer(url, selector, attribute, regex);
    } else {
      result = await scraper.scrapeWithCheerio(url, selector, attribute, regex);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
