import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMonitors, deleteMonitor, toggleMonitor, runMonitor } from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import {
  FiPlus, FiTrash2, FiPlay, FiPause, FiRefreshCw,
  FiExternalLink, FiClock, FiMonitor
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const MonitorsPage = () => {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState(null);

  const fetchMonitors = async () => {
    try {
      const res = await getMonitors();
      setMonitors(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchMonitors(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteMonitor(id);
      setMonitors(prev => prev.filter(m => m._id !== id));
      toast.success('Monitor deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleToggle = async (id) => {
    try {
      const res = await toggleMonitor(id);
      setMonitors(prev => prev.map(m => m._id === id ? res.data.monitor : m));
      toast.success(res.data.isPaused ? 'Monitor paused' : 'Monitor resumed');
    } catch { toast.error('Failed to toggle'); }
  };

  const handleRun = async (id) => {
    setRunningId(id);
    try {
      const res = await runMonitor(id);
      setMonitors(prev => prev.map(m => m._id === id ? { ...m, ...res.data.monitor } : m));
      toast.success('Check completed!');
    } catch { toast.error('Check failed'); }
    setRunningId(null);
  };

  if (loading) return <div className="animate-pulse" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>Monitors</h1>
        <Link to="/monitors/new" className="btn btn-primary"><FiPlus size={16} /> New Monitor</Link>
      </div>

      {monitors.length === 0 ? (
        <div className="empty-state card">
          <FiMonitor size={48} />
          <h3>No monitors yet</h3>
          <p>Start tracking web pages by creating your first monitor</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {monitors.map((m) => (
            <div key={m._id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, padding: '16px 20px' }}>
                <Link to={`/monitors/${m._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span className={`status-dot ${m.isPaused ? 'paused' : m.lastStatus === 'error' ? 'error' : 'active'}`} style={{ marginTop: 6 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{m.name}</div>
                      <div style={{
                        fontSize: 12, color: 'var(--accent-blue)',
                        fontFamily: 'var(--font-mono)', wordBreak: 'break-all'
                      }}>
                        {m.url.substring(0, 80)}{m.url.length > 80 ? '...' : ''}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <span className={`badge ${m.isPaused ? 'badge-warning' : 'badge-success'}`}>
                          {m.isPaused ? 'Paused' : 'Active'}
                        </span>
                        <span className="badge badge-muted"><FiClock size={10} /> {m.interval}</span>
                        <span className="badge badge-muted">AI Monitor</span>
                        {m.triggerCount > 0 && (
                          <span className="badge badge-info">{m.triggerCount} triggers</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>

                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <button className="btn btn-secondary btn-icon btn-sm" title="Run now"
                    onClick={() => handleRun(m._id)} disabled={runningId === m._id}>
                    <FiRefreshCw size={14} className={runningId === m._id ? 'animate-spin' : ''} />
                  </button>
                  <button className="btn btn-secondary btn-icon btn-sm" title={m.isPaused ? 'Resume' : 'Pause'}
                    onClick={() => handleToggle(m._id)}>
                    {m.isPaused ? <FiPlay size={14} /> : <FiPause size={14} />}
                  </button>
                  <a href={m.url} target="_blank" rel="noopener noreferrer"
                    className="btn btn-secondary btn-icon btn-sm" title="Open URL">
                    <FiExternalLink size={14} />
                  </a>
                  <button className="btn btn-danger btn-icon btn-sm" title="Delete"
                    onClick={() => handleDelete(m._id, m.name)}>
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Last check info */}
              <div style={{
                borderTop: '1px solid var(--border)', padding: '8px 20px',
                display: 'flex', justifyContent: 'space-between',
                fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-secondary)'
              }}>
                <span>
                  {m.lastChecked
                    ? `Last checked ${formatDistanceToNow(new Date(m.lastChecked), { addSuffix: true })}`
                    : 'Never checked'}
                </span>
                {m.lastValue && (
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    Value: {m.lastValue.substring(0, 50)}{m.lastValue.length > 50 ? '...' : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MonitorsPage;
