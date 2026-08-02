import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStats, getMonitors } from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import {
  FiMonitor, FiActivity, FiBell, FiAlertTriangle,
  FiPlay, FiPauseCircle, FiClock, FiZap, FiPlus
} from 'react-icons/fi';

const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <div style={{
      width: 48, height: 48, borderRadius: 12,
      background: `${color}15`, display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  </div>
);

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, monitorsRes] = await Promise.all([getStats(), getMonitors()]);
        setStats(statsRes.data);
        setMonitors(monitorsRes.data);
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div className="animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  const statusColor = (m) => {
    if (m.isPaused) return 'paused';
    if (m.lastStatus === 'error') return 'error';
    if (m.lastStatus === 'triggered') return 'active';
    return m.isActive ? 'active' : 'pending';
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Overview of your monitoring agents</p>
        </div>
        <Link to="/monitors/new" className="btn btn-primary">
          <FiPlus size={16} /> New Monitor
        </Link>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          <StatCard icon={FiMonitor} label="Total Monitors" value={stats.totalMonitors} color="var(--accent-blue)" />
          <StatCard icon={FiActivity} label="Active" value={stats.activeMonitors} color="var(--accent)" />
          <StatCard icon={FiPauseCircle} label="Paused" value={stats.pausedMonitors} color="var(--warning)" />
          <StatCard icon={FiBell} label="Unread Alerts" value={stats.unreadAlerts} color="var(--danger)" />
        </div>
      )}

      {/* Monitors List */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Active Monitors</h2>

      {monitors.length === 0 ? (
        <div className="empty-state card">
          <FiMonitor size={48} />
          <h3>No monitors yet</h3>
          <p>Create your first web monitor to start tracking</p>
          <Link to="/monitors/new" className="btn btn-primary" style={{ marginTop: 16 }}>
            <FiPlus size={16} /> Create Monitor
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {monitors.map((m, i) => (
            <Link
              key={m._id} to={`/monitors/${m._id}`}
              className="card"
              style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto',
                alignItems: 'center', gap: 16, textDecoration: 'none',
                color: 'inherit', animationDelay: `${i * 50}ms`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`status-dot ${statusColor(m)}`} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {m.url.substring(0, 50)}{m.url.length > 50 ? '...' : ''}
                  </div>
                </div>
              </div>

              <div className="monitor-row-badges" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`badge ${m.isPaused ? 'badge-warning' : m.lastStatus === 'error' ? 'badge-danger' : m.lastStatus === 'triggered' ? 'badge-success' : 'badge-info'}`}>
                  {m.isPaused ? 'Paused' : m.lastStatus || 'Pending'}
                </span>
                <span className="badge badge-muted">
                  <FiClock size={10} /> {m.interval}
                </span>
              </div>

              {/* Hidden on mobile to save space */}
              <div className="monitor-row-meta" style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', minWidth: 100 }}>
                {m.lastChecked
                  ? formatDistanceToNow(new Date(m.lastChecked), { addSuffix: true })
                  : 'Never checked'}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Recent Alerts */}
      {stats?.recentAlerts?.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Recent Alerts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.recentAlerts.map(a => (
              <div key={a._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
                <FiBell size={16} color="var(--warning)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.message?.substring(0, 100)}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
