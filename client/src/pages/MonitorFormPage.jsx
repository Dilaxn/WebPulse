import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createMonitor, updateMonitor, getMonitor, testScrape } from '../utils/api';
import {
  FiSave, FiArrowLeft, FiLoader, FiGlobe, FiZap,
  FiClock, FiBell, FiPlus, FiTrash2, FiEye, FiCheck, FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const INTERVALS = [
  { value: '5m',  label: 'Every 5 minutes' },
  { value: '15m', label: 'Every 15 minutes' },
  { value: '30m', label: 'Every 30 minutes' },
  { value: '1h',  label: 'Every hour' },
  { value: '3h',  label: 'Every 3 hours' },
  { value: '6h',  label: 'Every 6 hours' },
  { value: '12h', label: 'Every 12 hours' },
  { value: '1d',  label: 'Once daily' }
];

const EXAMPLES = [
  'Alert me when the 22KT gold price drops below LKR 350,000',
  'Notify when the page shows "In Stock" or "Available"',
  'Trigger when a new product appears in the sale section',
  'Alert when the USD to LKR rate goes above 320',
];

const MonitorFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form, setForm] = useState({
    name: '',
    url: '',
    description: '',
    aiPrompt: '',
    interval: '1h',
    notifyVia: ['email', 'inapp'],
    notificationEmails: [],
  });

  const [emailInput, setEmailInput] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      getMonitor(id).then(res => {
        const m = res.data;
        setForm({
          name: m.name || '',
          url: m.url || '',
          description: m.description || '',
          aiPrompt: m.aiPrompt || '',
          interval: m.interval || '1h',
          notifyVia: m.notifyVia || ['email', 'inapp'],
          notificationEmails: m.notificationEmails || [],
        });
      }).catch(() => toast.error('Failed to load monitor'));
    }
  }, [id, isEditing]);

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addEmail = () => {
    const addr = emailInput.trim();
    if (addr && !form.notificationEmails.includes(addr)) {
      updateForm('notificationEmails', [...form.notificationEmails, addr]);
    }
    setEmailInput('');
  };

  // Preview what the AI will see when it fetches the URL
  const handlePreview = async () => {
    if (!form.url) { toast.error('Enter a URL first'); return; }
    setPreviewing(true);
    setPreviewResult(null);
    try {
      const res = await testScrape({ url: form.url, useJina: true });
      setPreviewResult(res.data);
    } catch {
      setPreviewResult({ success: false, error: 'Preview request failed' });
    }
    setPreviewing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.url || !form.aiPrompt) {
      toast.error('Name, URL and condition are required');
      return;
    }
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

  const section = { marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid var(--border)' };
  const sectionHeader = {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--accent)'
  };

  return (
    <div className="animate-in" style={{ maxWidth: 680 }}>
      <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm" style={{ marginBottom: 20 }}>
        <FiArrowLeft size={14} /> Back
      </button>

      <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
        {isEditing ? 'Edit Monitor' : 'New Monitor'}
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>
        Describe what you want to watch. The AI reads the page and alerts you when the condition is met.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: 28 }}>

          {/* Basic Info */}
          <div style={section}>
            <div style={sectionHeader}><FiGlobe size={16} /> Basic Info</div>
            <div className="form-group">
              <label>Monitor Name</label>
              <input placeholder="e.g., Gold Price Tracker" value={form.name}
                onChange={e => updateForm('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>URL to Monitor</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="https://example.com/page"
                  value={form.url}
                  onChange={e => { updateForm('url', e.target.value); setPreviewResult(null); }}
                  required
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-secondary" onClick={handlePreview}
                  disabled={previewing} title="Preview what the AI will see">
                  {previewing ? <FiLoader size={14} className="animate-spin" /> : <FiEye size={14} />}
                </button>
              </div>
              <div className="form-hint">Click the eye icon to preview what content the AI will read from this page.</div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Description <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
              <input placeholder="e.g., Track 22KT gold price on malabar site"
                value={form.description} onChange={e => updateForm('description', e.target.value)} />
            </div>
          </div>

          {/* Preview result */}
          {previewResult && (
            <div style={{
              marginBottom: 24, padding: 16, borderRadius: 'var(--radius-sm)',
              background: previewResult.success ? 'var(--success-dim)' : 'var(--danger-dim)',
              border: `1px solid ${previewResult.success ? 'var(--success)' : 'var(--danger)'}44`
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                color: previewResult.success ? 'var(--success)' : 'var(--danger)',
                fontWeight: 600, fontSize: 12
              }}>
                {previewResult.success ? <><FiCheck size={13} /> Page content fetched — AI will read this</> : <><FiX size={13} /> Failed to fetch page</>}
              </div>
              <pre style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'pre-wrap',
                wordBreak: 'break-all', color: 'var(--text-secondary)',
                maxHeight: 180, overflow: 'auto', margin: 0
              }}>
                {previewResult.success
                  ? (previewResult.value || '').substring(0, 800) + (previewResult.value?.length > 800 ? '\n…' : '')
                  : previewResult.error}
              </pre>
            </div>
          )}

          {/* AI Condition */}
          <div style={section}>
            <div style={sectionHeader}><FiZap size={16} /> AI Alert Condition</div>
            <div className="form-group">
              <label>What should trigger the alert?</label>
              <textarea
                rows={4}
                placeholder="Describe in plain English what you're watching for…"
                value={form.aiPrompt}
                onChange={e => updateForm('aiPrompt', e.target.value)}
                style={{ fontFamily: 'inherit', fontSize: 14, resize: 'vertical', lineHeight: 1.6 }}
                required
              />
              <div className="form-hint" style={{ marginTop: 8 }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Examples:</strong>
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {EXAMPLES.map((ex, i) => (
                    <span
                      key={i}
                      onClick={() => updateForm('aiPrompt', ex)}
                      style={{
                        cursor: 'pointer', color: 'var(--accent)', fontSize: 12,
                        fontStyle: 'italic', opacity: 0.8,
                        textDecoration: 'underline dotted'
                      }}
                    >
                      "{ex}"
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex', gap: 10, padding: '10px 14px',
              background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)'
            }}>
              <FiZap size={14} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent)' }} />
              <span>The AI reads the full page text and evaluates your condition on every check. Be specific — include the exact value, unit, and comparison you want (e.g. "below 350,000 LKR" not just "low price").</span>
            </div>
          </div>

          {/* Check Frequency */}
          <div style={section}>
            <div style={sectionHeader}><FiClock size={16} /> Check Frequency</div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>How often to check</label>
              <select value={form.interval} onChange={e => updateForm('interval', e.target.value)}>
                {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
              <div className="form-hint">More frequent checks use more resources. Use 1h or longer for stable pages.</div>
            </div>
          </div>

          {/* Notifications */}
          <div>
            <div style={sectionHeader}><FiBell size={16} /> Notifications</div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
              {[
                { value: 'email', label: 'Email' },
                { value: 'inapp', label: 'In-App' }
              ].map(opt => (
                <label key={opt.value} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer'
                }}>
                  <input type="checkbox" checked={form.notifyVia.includes(opt.value)}
                    onChange={e => updateForm('notifyVia',
                      e.target.checked
                        ? [...form.notifyVia, opt.value]
                        : form.notifyVia.filter(v => v !== opt.value)
                    )}
                    style={{ width: 15, height: 15 }} />
                  {opt.label}
                </label>
              ))}
            </div>

            {form.notifyVia.includes('email') && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Alert Email Recipients</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    type="email"
                    placeholder="Add email address and press Enter…"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-secondary" onClick={addEmail}>
                    <FiPlus size={14} />
                  </button>
                </div>
                {form.notificationEmails.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {form.notificationEmails.map((addr, i) => (
                      <span key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        borderRadius: 20, padding: '3px 10px', fontSize: 12,
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
                    ? 'No emails added — alerts will go to your account email.'
                    : `Alerts will be sent to ${form.notificationEmails.length} email(s) above.`}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}
            style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? 'Saving…' : <><FiSave size={15} /> {isEditing ? 'Update Monitor' : 'Create Monitor'}</>}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default MonitorFormPage;
