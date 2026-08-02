const cron = require('node-cron');
const Monitor = require('../models/Monitor');
const Notification = require('../models/Notification');
const User = require('../models/User');
const scraper = require('./scraperService');
const emailService = require('./emailService');
const { evaluateWithAI, evaluateWithAIVision } = require('./aiService');

class SchedulerService {
  constructor() {
    this.jobs = new Map(); // monitorId -> cron job
    this.isRunning = false;
  }

  async init() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('🕐 Scheduler initializing...');

    try {
      const monitors = await Monitor.find({ isActive: true, isPaused: false });
      console.log(`📋 Found ${monitors.length} active monitors`);

      for (const monitor of monitors) {
        this.scheduleMonitor(monitor);
      }

      // Cleanup dead jobs every hour
      cron.schedule('0 * * * *', () => this.cleanupDeadJobs());

      console.log('✅ Scheduler running');
    } catch (err) {
      console.error('❌ Scheduler init failed:', err.message);
    }
  }

  scheduleMonitor(monitor) {
    const id = monitor._id.toString();

    // Stop existing job if any
    if (this.jobs.has(id)) {
      this.jobs.get(id).stop();
      this.jobs.delete(id);
    }

    if (!monitor.isActive || monitor.isPaused) return;

    const cronExpr = monitor.cronExpression || '0 * * * *';

    if (!cron.validate(cronExpr)) {
      console.error(`Invalid cron for monitor ${id}: ${cronExpr}`);
      return;
    }

    const job = cron.schedule(cronExpr, () => this.runCheck(id), {
      scheduled: true,
      timezone: 'Asia/Colombo'
    });

    this.jobs.set(id, job);
    console.log(`  ⏱  Scheduled "${monitor.name}" (${monitor.interval}) [${cronExpr}]`);
  }

  async runCheck(monitorId) {
    try {
      const monitor = await Monitor.findById(monitorId);
      if (!monitor || !monitor.isActive || monitor.isPaused) {
        this.removeJob(monitorId);
        return;
      }

      console.log(`🔍 Checking: "${monitor.name}"`);

      monitor.lastChecked = new Date();
      monitor.checkCount += 1;

      const historyEntry = {
        checkedAt: new Date(),
        value: null,
        status: 'success',
        error: null
      };

      // ── AI Vision path ───────────────────────────────────────────────────────
      if (monitor.condition.operator === 'ai_match') {
        const prompt = monitor.aiPrompt?.trim() || monitor.condition.value;
        console.log(`  🤖 AI prompt: "${prompt}"`);
        console.log(`  📸 Taking screenshot for vision analysis...`);

        const screenshotResult = await scraper.scrapeWithScreenshot(monitor.url);
        let evaluation;

        if (screenshotResult.success) {
          evaluation = await evaluateWithAIVision(screenshotResult.imageBase64, prompt);
        } else {
          // Fallback: Jina text if Puppeteer unavailable
          console.warn(`  ⚠️  Screenshot failed (${screenshotResult.error}), falling back to Jina text...`);
          const jinaResult = await scraper.scrapeWithJina(monitor.url);
          if (!jinaResult.success) {
            const errMsg = `Screenshot: ${screenshotResult.error} | Jina: ${jinaResult.error}`;
            historyEntry.status = 'error';
            historyEntry.error = errMsg;
            monitor.lastStatus = 'error';
            monitor.lastError = errMsg;
            monitor.history.push(historyEntry);
            await monitor.save();
            console.log(`  ❌ All scrape methods failed: ${errMsg}`);
            return;
          }
          console.log(`  📄 Jina content length: ${jinaResult.value.length} chars`);
          evaluation = await evaluateWithAI(jinaResult.value, prompt);
        }

        console.log(`  📊 AI met: ${evaluation.met} | extracted: "${evaluation.extractedValue}"`);
        console.log(`  📝 AI reason: ${evaluation.reason}`);

        if (evaluation.extractedValue) {
          historyEntry.value = evaluation.extractedValue;
          monitor.lastValue = evaluation.extractedValue;
        }
        if (evaluation.met) {
          await this.triggerAlert(monitor, evaluation.extractedValue || '');
          historyEntry.status = 'triggered';
        }

        monitor.lastStatus = historyEntry.status;
        monitor.lastError = null;
        monitor.history.push(historyEntry);
        await monitor.save();
        return;
      }

      // ── Non-AI path (selector / changes / contains etc.) ────────────────────
      const result = await scraper.scrape(monitor);

      historyEntry.value = result.success ? result.value : null;
      historyEntry.status = result.success ? 'success' : 'error';
      historyEntry.error = result.success ? null : result.error;

      if (!result.success) {
        monitor.lastStatus = 'error';
        monitor.lastError = result.error;
        monitor.history.push(historyEntry);
        await monitor.save();
        console.log(`  ❌ Error: ${result.error}`);
        return;
      }

      const currentValue = result.value;

      if (monitor.condition.operator === 'changes') {
        if (monitor.lastValue && monitor.lastValue !== currentValue) {
          await this.triggerAlert(monitor, currentValue);
          historyEntry.status = 'triggered';
        }
      } else {
        const evaluation = scraper.evaluateCondition(currentValue, monitor.condition);
        if (evaluation.met) {
          await this.triggerAlert(monitor, currentValue);
          historyEntry.status = 'triggered';
        }
        console.log(`  📊 Value: "${currentValue.substring(0, 80)}" | ${evaluation.reason}`);
      }

      monitor.lastValue = currentValue;
      monitor.lastStatus = historyEntry.status;
      monitor.lastError = null;
      monitor.history.push(historyEntry);
      await monitor.save();

    } catch (err) {
      console.error(`❌ Check failed for ${monitorId}:`, err.message);
    }
  }

  async triggerAlert(monitor, currentValue) {
    console.log(`  🔔 ALERT TRIGGERED: "${monitor.name}" = "${currentValue.substring(0, 100)}"`);

    monitor.triggerCount += 1;

    const user = await User.findById(monitor.user);
    if (!user) return;

    // Create in-app notification
    const notification = await Notification.create({
      user: monitor.user,
      monitor: monitor._id,
      type: 'trigger',
      title: `🔔 ${monitor.name}`,
      message: `Condition met! Current value: ${currentValue.substring(0, 200)}`,
      value: currentValue
    });

    // Send email
    if (monitor.notifyVia.includes('email')) {
      const recipients = (monitor.notificationEmails && monitor.notificationEmails.length > 0)
        ? monitor.notificationEmails
        : [user.notificationEmail || user.email];
      const results = await Promise.all(recipients.map(addr => emailService.sendAlert(addr, monitor, currentValue)));
      notification.emailSent = results.some(Boolean);
      await notification.save();
    }

    // Webhook
    if (monitor.notifyVia.includes('webhook') && monitor.webhookUrl) {
      try {
        const axios = require('axios');
        await axios.post(monitor.webhookUrl, {
          monitor: monitor.name,
          url: monitor.url,
          value: currentValue,
          condition: monitor.condition,
          triggeredAt: new Date().toISOString()
        }, { timeout: 10000 });
        console.log(`  📡 Webhook sent to ${monitor.webhookUrl}`);
      } catch (e) {
        console.log(`  ⚠️  Webhook failed: ${e.message}`);
      }
    }
  }

  // Force run a specific monitor right now
  async forceRun(monitorId) {
    return this.runCheck(monitorId);
  }

  removeJob(monitorId) {
    const id = monitorId.toString();
    if (this.jobs.has(id)) {
      this.jobs.get(id).stop();
      this.jobs.delete(id);
    }
  }

  async cleanupDeadJobs() {
    for (const [id] of this.jobs) {
      const monitor = await Monitor.findById(id);
      if (!monitor || !monitor.isActive || monitor.isPaused) {
        this.removeJob(id);
      }
    }
  }

  getActiveJobCount() {
    return this.jobs.size;
  }

  async shutdown() {
    for (const [id, job] of this.jobs) {
      job.stop();
    }
    this.jobs.clear();
    await scraper.cleanup();
    this.isRunning = false;
    console.log('🛑 Scheduler stopped');
  }
}

module.exports = new SchedulerService();
