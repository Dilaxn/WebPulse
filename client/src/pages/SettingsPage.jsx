import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { updateProfile, testEmail } from '../utils/api';
import { FiSave, FiSend, FiUser, FiMail, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [notificationEmail, setNotificationEmail] = useState(user?.notificationEmail || user?.email || '');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateProfile({ name, notificationEmail });
      setUser(res.data.user);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update'); }
    setSaving(false);
  };

  const handleTestEmail = async () => {
    setTesting(true);
    try {
      const res = await testEmail();
      if (res.data.success) toast.success('Test email sent! Check your inbox.');
      else toast.error('Failed to send test email');
    } catch { toast.error('Email test failed'); }
    setTesting(false);
  };

  return (
    <div className="animate-in" style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 8 }}>Settings</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>Manage your account and notification preferences</p>

      <form onSubmit={handleSave}>
        <div className="card" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'var(--accent)' }}>
            <FiUser size={18} /> Profile
          </div>

          <div className="form-group">
            <label>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>

          <div className="form-group">
            <label>Login Email</label>
            <input value={user?.email || ''} disabled style={{ opacity: 0.5 }} />
            <div className="form-hint">Login email cannot be changed</div>
          </div>

          <div className="form-group">
            <label>Notification Email</label>
            <input value={notificationEmail} onChange={e => setNotificationEmail(e.target.value)}
              placeholder="Where to send alerts" type="email" />
            <div className="form-hint">Alerts will be sent to this email address</div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            <FiSave size={14} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Email Test */}
      <div className="card" style={{ padding: 28, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--accent)' }}>
          <FiMail size={18} /> Email Configuration
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Send a test email to verify your notification setup is working correctly.
        </p>
        <button type="button" className="btn btn-secondary" onClick={handleTestEmail} disabled={testing}>
          <FiSend size={14} /> {testing ? 'Sending...' : 'Send Test Email'}
        </button>
      </div>

      {/* Setup Guide */}
      <div className="card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--accent)' }}>
          <FiShield size={18} /> Finding CSS Selectors
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <p style={{ marginBottom: 12 }}>To monitor a specific element on a web page:</p>
          <ol style={{ paddingLeft: 20 }}>
            <li>Open the target URL in your browser</li>
            <li>Right-click on the element you want to track</li>
            <li>Select "Inspect" or "Inspect Element"</li>
            <li>In the DevTools, right-click the highlighted HTML element</li>
            <li>Choose "Copy" → "Copy selector"</li>
            <li>Paste the selector into the CSS Selector field when creating a monitor</li>
          </ol>
          <p style={{ marginTop: 12 }}>
            <strong>Tip:</strong> For price tracking, you can use a regex like <code style={{
              fontFamily: 'var(--font-mono)', background: 'var(--bg-secondary)',
              padding: '2px 6px', borderRadius: 4, fontSize: 12
            }}>(\d[\d,.]+)</code> to extract just the number from text like "Rs. 360,000".
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
