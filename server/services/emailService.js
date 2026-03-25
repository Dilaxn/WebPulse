const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  init() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      console.log('✅ Email service initialized');
    } catch (err) {
      console.error('❌ Email service failed to initialize:', err.message);
    }
  }

  async sendAlert(to, monitor, currentValue) {
    if (!this.transporter) {
      console.error('Email transporter not available');
      return false;
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e0e0e0; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #00d4aa, #0088ff); border-radius: 12px 12px 0 0; padding: 30px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 24px; }
        .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; }
        .body { background: #141420; border: 1px solid #2a2a3a; border-top: none; border-radius: 0 0 12px 12px; padding: 30px; }
        .alert-box { background: #1a1a2e; border: 1px solid #00d4aa33; border-radius: 8px; padding: 20px; margin: 16px 0; }
        .label { color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .value { color: #00d4aa; font-size: 28px; font-weight: 700; }
        .detail { margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #2a2a3a; }
        .detail:last-child { border-bottom: none; }
        .btn { display: inline-block; background: linear-gradient(135deg, #00d4aa, #0088ff); color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-top: 16px; }
        .footer { text-align: center; color: #555; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 Monitor Alert Triggered!</h1>
          <p>${monitor.name}</p>
        </div>
        <div class="body">
          <div class="alert-box">
            <div class="label">Current Value</div>
            <div class="value">${currentValue}</div>
          </div>
          <div class="detail">
            <div class="label">Condition</div>
            <div>${monitor.condition.operator.replace('_', ' ')} ${monitor.condition.value}</div>
          </div>
          <div class="detail">
            <div class="label">URL Monitored</div>
            <div><a href="${monitor.url}" style="color: #0088ff;">${monitor.url.substring(0, 60)}...</a></div>
          </div>
          <div class="detail">
            <div class="label">Checked At</div>
            <div>${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}</div>
          </div>
          <a href="${appUrl}/dashboard" class="btn">View Dashboard →</a>
        </div>
        <div class="footer">
          <p>Web Monitor Agent • <a href="${appUrl}/dashboard" style="color: #0088ff;">Manage Monitors</a></p>
        </div>
      </div>
    </body>
    </html>`;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: `🔔 Alert: ${monitor.name} - Condition Met!`,
        html
      });
      console.log(`📧 Alert email sent to ${to} for "${monitor.name}"`);
      return true;
    } catch (err) {
      console.error(`❌ Failed to send email to ${to}:`, err.message);
      return false;
    }
  }

  async sendTestEmail(to) {
    if (!this.transporter) return false;
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: '✅ Web Monitor - Test Email',
        html: '<h2>Your email configuration is working!</h2><p>You will receive alerts at this address.</p>'
      });
      return true;
    } catch (err) {
      console.error('Test email failed:', err.message);
      return false;
    }
  }
}

module.exports = new EmailService();
