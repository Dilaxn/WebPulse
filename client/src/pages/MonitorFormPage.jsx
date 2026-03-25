import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createMonitor, updateMonitor, getMonitor, testScrape } from '../utils/api';
import {
  FiSave, FiActivity, FiArrowLeft, FiLoader, FiCheck, FiX,
  FiGlobe, FiTarget, FiClock, FiBell, FiCode, FiPlus, FiTrash2
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const TYPES = [
  { value: 'price_drop', label: 'Price Drop', desc: 'Track when a price falls below/above a threshold' },
  { value: 'text_match', label: 'Text Match', desc: 'Watch for specific text appearing or disappearing' },
  { value: 'element_exists', label: 'Element Exists', desc: 'Check if an element appears on the page' },
  { value: 'element_change', label: 'Content Change', desc: 'Detect any change in element content' },
  { value: 'custom_css', label: 'Custom CSS Selector', desc: 'Advanced: target any element with CSS' }
];

const INTERVALS = [
  { value: '1m', label: 'Every 1 min' },
  { value: '5m', label: 'Every 5 mins' },
  { value: '15m', label: 'Every 15 mins' },
  { value: '30m', label: 'Every 30 mins' },
  { value: '1h', label: 'Every hour' },
  { value: '3h', label: 'Every 3 hours' },
  { value: '6h', label: 'Every 6 hours' },
  { value: '12h', label: 'Every 12 hours' },
  { value: '1d', label: 'Once daily' }
];

const OPERATORS = [
  { value: 'less_than', label: 'Less than' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'contains_all', label: 'Contains all keywords' },
  { value: 'ai_match', label: 'AI Smart Match (Gemini)' },
  { value: 'changes', label: 'Any change' }
];

const MonitorFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form, setForm] = useState({
    name: '',
    url: '',
    description: '',
    type: 'price_drop',
    selector: '',
    attribute: 'text',
    regex: '',
    condition: { operator: 'less_than', value: '', valueType: 'number' },
    aiPrompt: '',
    interval: '1h',
    notifyVia: ['email', 'inapp'],
    notificationEmails: [],
    webhookUrl: '',
    usePuppeteer: false
  });

  const [emailInput, setEmailInput] = useState('');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      getMonitor(id).then(res => {
        const m = res.data;
        setForm({
          name: m.name || '',
          url: m.url || '',
          description: m.description || '',
          type: m.type || 'price_drop',
          selector: m.selector || '',
          attribute: m.attribute || 'text',
          regex: m.regex || '',
          condition: m.condition || { operator: 'less_than', value: '', valueType: 'number' },
          aiPrompt: m.aiPrompt || '',
          interval: m.interval || '1h',
          notifyVia: m.notifyVia || ['email', 'inapp'],
          notificationEmails: m.notificationEmails || [],
          webhookUrl: m.webhookUrl || '',
          usePuppeteer: m.usePuppeteer || false
        });
      }).catch(() => toast.error('Failed to load monitor'));
    }
  }, [id, isEditing]);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateCondition = (field, value) => {
    setForm(prev => ({
      ...prev,
      condition: { ...prev.condition, [field]: value }
    }));
  };

  // Auto-set defaults based on type
  useEffect(() => {
    if (form.type === 'price_drop') {
      updateCondition('operator', 'less_than');
      updateCondition('valueType', 'number');
    } else if (form.type === 'text_match') {
      updateCondition('operator', 'contains');
      updateCondition('valueType', 'string');
    } else if (form.type === 'element_exists') {
      updateForm('attribute', 'exists');
      updateCondition('operator', 'equals');
      updateCondition('value', 'true');
    } else if (form.type === 'element_change') {
      updateCondition('operator', 'changes');
    }
  }, [form.type]);

  const handleTest = async () => {
    if (!form.url) { toast.error('URL is required'); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testScrape({
        url: form.url,
        selector: form.selector,
        attribute: form.attribute,
        regex: form.regex,
        usePuppeteer: form.usePuppeteer
      });
      setTestResult(res.data);
      if (res.data.success) {
        toast.success('Scrape test successful!');
      } else {
        toast.error(res.data.error || 'Test failed');
      }
    } catch (err) {
      toast.error('Test request failed');
      setTestResult({ success: false, error: err.message });
    }
    setTesting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.url) { toast.error('Name and URL are required'); return; }

    setSaving(true);
    try {
      if (isEditing) {
        await updateMonitor(id, form);
        toast.success('Monitor updated!');
      } else {
        await createMonitor(form);
        toast.success('Monitor created!');
      }
      navigate('/monitors');
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  };

  const sectionStyle = {
    marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid var(--border)'
  };

  const sectionHeaderStyle = {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--accent)'
  };

  return (
    <div className="animate-in" style={{ maxWidth: 700 }}>
      <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm" style={{ marginBottom: 20 }}>
        <FiArrowLeft size={14} /> Back
      </button>

      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 8 }}>
        {isEditing ? 'Edit Monitor' : 'Create New Monitor'}
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
        Set up a new web monitoring agent to track changes and get notified
      </p>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: 28 }}>

          {/* Basic Info */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}><FiGlobe size={18} /> Basic Info</div>
            <div className="form-group">
              <label>Monitor Name</label>
              <input placeholder="e.g., Gold Price Tracker" value={form.name}
                onChange={e => updateForm('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>URL to Monitor</label>
              <input placeholder="https://example.com/page" value={form.url}
                onChange={e => updateForm('url', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <input placeholder="What are you tracking?" value={form.description}
                onChange={e => updateForm('description', e.target.value)} />
            </div>
          </div>

          {/* Monitor Type */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}><FiTarget size={18} /> What to Watch</div>
            <div className="form-group">
              <label>Monitor Type</label>
              <select value={form.type} onChange={e => updateForm('type', e.target.value)}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>CSS Selector</label>
              <input placeholder="e.g., .price, #gold-rate, h1.title" value={form.selector}
                onChange={e => updateForm('selector', e.target.value)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }} />
              <div className="form-hint">The CSS selector targeting the element you want to monitor. Use browser DevTools to find it.</div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Extract</label>
                <select value={form.attribute} onChange={e => updateForm('attribute', e.target.value)}>
                  <option value="text">Text Content</option>
                  <option value="html">Inner HTML</option>
                  <option value="href">Link (href)</option>
                  <option value="src">Image (src)</option>
                  <option value="exists">Element Exists</option>
                </select>
              </div>
              <div className="form-group">
                <label>Regex Filter (optional)</label>
                <input placeholder="e.g., (\d+[\d,.]+)" value={form.regex}
                  onChange={e => updateForm('regex', e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <input type="checkbox" id="usePuppeteer" checked={form.usePuppeteer}
                onChange={e => updateForm('usePuppeteer', e.target.checked)}
                style={{ width: 16, height: 16 }} />
              <label htmlFor="usePuppeteer" style={{
                fontSize: 13, color: 'var(--text-secondary)',
                textTransform: 'none', letterSpacing: 0, marginBottom: 0
              }}>
                Use headless browser (Puppeteer) — for JavaScript-rendered pages
              </label>
            </div>
          </div>

          {/* Condition */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}><FiCode size={18} /> Alert Condition</div>
            <div className="form-row">
              <div className="form-group">
                <label>Operator</label>
                <select value={form.condition.operator} onChange={e => updateCondition('operator', e.target.value)}>
                  {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {form.condition.operator !== 'changes' && (
                <div className="form-group">
                  <label>Target Value</label>
                  <input
                    placeholder={
                      form.condition.operator === 'contains_all'
                        ? 'e.g., Colombo, Physical, Saturday, Sunday'
                        : "e.g., 360000 or 'Available'"
                    }
                    value={form.condition.value}
                    onChange={e => updateCondition('value', e.target.value)} />
                  {form.condition.operator === 'contains_all' && (
                    <div className="form-hint">Comma-separated keywords — ALL must appear in the scraped text to trigger.</div>
                  )}
                </div>
              )}
            </div>
            {form.condition.operator === 'ai_match' && (
              <div className="form-group" style={{ marginTop: 4 }}>
                <label>AI Condition (natural language)</label>
                <textarea
                  rows={3}
                  placeholder="e.g., Is there a physical course available in Colombo on Saturday or Sunday?"
                  value={form.aiPrompt}
                  onChange={e => updateForm('aiPrompt', e.target.value)}
                  style={{ fontFamily: 'inherit', fontSize: 13, resize: 'vertical' }}
                />
                <div className="form-hint">
                  Describe exactly what you're looking for. Gemini will read the scraped page content and decide if the condition is met. Enable Puppeteer above for JS-rendered pages.
                </div>
              </div>
            )}
            {form.condition.operator !== 'changes' && form.condition.operator !== 'ai_match' && (
              <div className="form-group">
                <label>Value Type</label>
                <select value={form.condition.valueType} onChange={e => updateCondition('valueType', e.target.value)}>
                  <option value="number">Number (strips currency symbols)</option>
                  <option value="string">Text (exact comparison)</option>
                </select>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}><FiClock size={18} /> Check Frequency</div>
            <div className="form-group">
              <label>Check Interval</label>
              <select value={form.interval} onChange={e => updateForm('interval', e.target.value)}>
                {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
          </div>

          {/* Notification */}
          <div style={{ marginBottom: 20 }}>
            <div style={sectionHeaderStyle}><FiBell size={18} /> Notifications</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {['email', 'inapp', 'webhook'].map(via => (
                <label key={via} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer'
                }}>
                  <input type="checkbox" checked={form.notifyVia.includes(via)}
                    onChange={e => {
                      updateForm('notifyVia',
                        e.target.checked
                          ? [...form.notifyVia, via]
                          : form.notifyVia.filter(v => v !== via)
                      );
                    }}
                    style={{ width: 16, height: 16 }} />
                  {via === 'email' ? 'Email' : via === 'inapp' ? 'In-App' : 'Webhook'}
                </label>
              ))}
            </div>
            {form.notifyVia.includes('email') && (
              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Alert Email Recipients</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    type="email"
                    placeholder="Add email address..."
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const addr = emailInput.trim();
                        if (addr && !form.notificationEmails.includes(addr)) {
                          updateForm('notificationEmails', [...form.notificationEmails, addr]);
                        }
                        setEmailInput('');
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    const addr = emailInput.trim();
                    if (addr && !form.notificationEmails.includes(addr)) {
                      updateForm('notificationEmails', [...form.notificationEmails, addr]);
                    }
                    setEmailInput('');
                  }}>
                    <FiPlus size={14} />
                  </button>
                </div>
                {form.notificationEmails.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {form.notificationEmails.map((addr, i) => (
                      <span key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        borderRadius: 20, padding: '4px 10px', fontSize: 12,
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {addr}
                        <FiTrash2 size={11} style={{ cursor: 'pointer', color: 'var(--danger)', flexShrink: 0 }}
                          onClick={() => updateForm('notificationEmails', form.notificationEmails.filter((_, j) => j !== i))} />
                      </span>
                    ))}
                  </div>
                )}
                <div className="form-hint">
                  {form.notificationEmails.length === 0
                    ? 'No emails added — alerts will go to your account email. Add emails to override.'
                    : `Alerts will be sent to ${form.notificationEmails.length} email(s) above.`}
                </div>
              </div>
            )}
            {form.notifyVia.includes('webhook') && (
              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Webhook URL</label>
                <input placeholder="https://your-webhook.example.com/endpoint" value={form.webhookUrl}
                  onChange={e => updateForm('webhookUrl', e.target.value)} />
              </div>
            )}
          </div>
        </div>

        {/* Test Scrape */}
        <div className="card" style={{ marginTop: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Test Your Selector</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Test scraping before saving to make sure everything works
              </div>
            </div>
            <button type="button" className="btn btn-secondary" onClick={handleTest} disabled={testing}>
              {testing ? <><FiLoader size={14} className="animate-spin" /> Testing...</> : <><FiActivity size={14} /> Test Now</>}
            </button>
          </div>

          {testResult && (
            <div style={{
              marginTop: 16, padding: 16, borderRadius: 'var(--radius-sm)',
              background: testResult.success ? 'var(--success-dim)' : 'var(--danger-dim)',
              border: `1px solid ${testResult.success ? 'var(--success)' : 'var(--danger)'}33`
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                color: testResult.success ? 'var(--success)' : 'var(--danger)',
                fontWeight: 600, fontSize: 13
              }}>
                {testResult.success ? <><FiCheck size={16} /> Success</> : <><FiX size={16} /> Error</>}
              </div>
              <pre style={{
                fontFamily: 'var(--font-mono)', fontSize: 12,
                whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                color: 'var(--text-secondary)', maxHeight: 200, overflow: 'auto'
              }}>
                {testResult.success ? testResult.value : testResult.error}
              </pre>
            </div>
          )}
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? 'Saving...' : <><FiSave size={16} /> {isEditing ? 'Update Monitor' : 'Create Monitor'}</>}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default MonitorFormPage;
