import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getMonitor, deleteMonitor, toggleMonitor, runMonitor } from '../utils/api';
import { formatDistanceToNow, format } from 'date-fns';
import {
  FiArrowLeft, FiEdit, FiTrash2, FiRefreshCw, FiPlay,
  FiPause, FiExternalLink, FiCheck, FiX, FiAlertCircle, FiZap
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const MonitorDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [monitor, setMonitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchMonitor = async () => {
    try {
      const res = await getMonitor(id);
      setMonitor(res.data);
    } catch { toast.error('Failed to load monitor'); navigate('/monitors'); }
    setLoading(false);
  };

  useEffect(() => { fetchMonitor(); }, [id]);

  const handleRun = async () => {
    setRunning(true);
    try {
      await runMonitor(id);
      await fetchMonitor();
      toast.success('Check completed!');
    } catch { toast.error('Check failed'); }
    setRunning(false);
  };

  const handleToggle = async () => {
    try {
      const res = await toggleMonitor(id);
      setMonitor(res.data.monitor);
      toast.success(res.data.isPaused ? 'Paused' : 'Resumed');
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this monitor permanently?')) return;
    try {
      await deleteMonitor(id);
      toast.success('Deleted');
      navigate('/monitors');
    } catch { toast.error('Failed'); }
  };

  if (loading) return <div className="animate-pulse" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!monitor) return null;

  const m = monitor;
  const statusColors = { success: 'var(--success)', error: 'var(--danger)', triggered: 'var(--warning)', pending: 'var(--text-muted)' };

  return (
    <div className="animate-in">
      <button onClick={() => navigate('/monitors')} className="btn btn-secondary btn-sm" style={{ marginBottom: 20 }}>
        <FiArrowLeft size={14} /> Back to Monitors
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <span className={`status-dot ${m.isPaused ? 'paused' : m.lastStatus === 'error' ? 'error' : 'active'}`} />
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>{m.name}</h1>
          </div>
          <a href={m.url} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            {m.url.substring(0, 80)}{m.url.length > 80 ? '...' : ''} <FiExternalLink size={12} />
          </a>
        </div>
        <div className="detail-actions" style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={handleRun} disabled={running}>
            <FiRefreshCw size={14} /> {running ? 'Running...' : 'Run Now'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleToggle}>
            {m.isPaused ? <><FiPlay size={14} /> Resume</> : <><FiPause size={14} /> Pause</>}
          </button>
          <Link to={`/monitors/${id}/edit`} className="btn btn-secondary btn-sm">
            <FiEdit size={14} /> Edit
          </Link>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Interval', value: m.interval },
          { label: 'Total Checks', value: m.checkCount },
          { label: 'Triggers', value: m.triggerCount },
          { label: 'Status', value: m.isPaused ? 'Paused' : m.lastStatus || 'Pending' },
          { label: 'Last Checked', value: m.lastChecked ? formatDistanceToNow(new Date(m.lastChecked), { addSuffix: true }) : 'Never' }
        ].map((item, i) => (
          <div key={i} className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              {item.label}
            </div>
            <div style={{
              fontSize: 14, fontWeight: 600,
              fontFamily: item.mono ? 'var(--font-mono)' : 'inherit',
              wordBreak: 'break-all'
            }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* AI Condition */}
      {m.aiPrompt && (
        <div className="card" style={{ marginBottom: 28, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            <FiZap size={13} style={{ color: 'var(--accent)' }} /> AI Alert Condition
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.6 }}>
            "{m.aiPrompt}"
          </div>
        </div>
      )}

      {/* Current Value */}
      {m.lastValue && (
        <div className="card" style={{ marginBottom: 28, padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            Last Scraped Value
          </div>
          <pre style={{
            fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent)',
            background: 'var(--bg-secondary)', padding: 16, borderRadius: 'var(--radius-sm)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 200, overflow: 'auto'
          }}>
            {m.lastValue}
          </pre>
        </div>
      )}

      {/* Error */}
      {m.lastError && (
        <div style={{
          marginBottom: 28, padding: 16, borderRadius: 'var(--radius)',
          background: 'var(--danger-dim)', border: '1px solid var(--danger)33'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
            <FiAlertCircle size={16} /> Last Error
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{m.lastError}</div>
        </div>
      )}

      {/* History */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Check History</h2>
      {(!m.history || m.history.length === 0) ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          No check history yet. Run a check to see results here.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Time</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {[...m.history].reverse().map((h, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {format(new Date(h.checkedAt), 'MMM dd, HH:mm:ss')}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span className={`badge ${h.status === 'triggered' ? 'badge-warning' : h.status === 'error' ? 'badge-danger' : 'badge-success'}`}>
                      {h.status === 'triggered' ? <FiAlertCircle size={10} /> : h.status === 'error' ? <FiX size={10} /> : <FiCheck size={10} />}
                      {h.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.error || h.value || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitorDetailPage;
