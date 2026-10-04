import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { FiArrowRight, FiPlus, FiExternalLink, FiCheckCircle, FiAlertCircle, FiClock } from 'react-icons/fi';
import { getStats, getMonitors } from '../utils/api';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getMonitors()])
      .then(([s, m]) => { setStats(s.data); setMonitors(m.data); })
      .finally(() => setLoading(false));
  }, []);

  const active = monitors.filter(m => m.isActive && !m.isPaused).length;
  const latest = monitors.filter(m => m.lastChecked).sort((a, b) => new Date(b.lastChecked) - new Date(a.lastChecked))[0];

  return (
    <div className="dashboard animate-in">
      <div className="page-eyebrow"><span className="eyebrow-dot" /> YOUR MONITORING SPACE</div>
      <div className="dashboard-intro">
        <div>
          <h1>Stay a step ahead.</h1>
          <p>Tell WebPulse what matters. We’ll keep an eye on the web for you.</p>
        </div>
        <Link to="/monitors/new" className="btn btn-primary"><FiPlus size={16} /> Create monitor</Link>
      </div>

      <div className="dashboard-hero">
        <div className="hero-copy">
          <span className="hero-kicker">A quieter way to stay informed</span>
          <h2>Every change.<br /><span>Right on time.</span></h2>
          <p>Watch prices, availability, announcements, and more. Describe a condition in your own words and get a clear answer on every check.</p>
          <Link to="/monitors/new" className="hero-link">Set up a monitor <FiArrowRight size={17} /></Link>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orb orb-one" /><div className="orb orb-two" />
          <div className="floating-card floating-card-top"><span className="mini-icon">↗</span><span>Page checked</span><span className="tiny-check">✓</span></div>
          <div className="floating-card floating-card-main"><span className="float-label">YOUR CONDITION</span><strong>22KT gold below LKR 320,000</strong><div className="float-rule" /><span className="float-result"><span className="result-dot" /> Monitoring on schedule</span></div>
          <div className="floating-card floating-card-bottom"><FiClock size={16} /><span>Next check, right on schedule</span></div>
        </div>
      </div>

      <div className="dashboard-metrics">
        <div><span className="metric-label">TOTAL MONITORS</span><strong>{loading ? '—' : stats?.totalMonitors ?? monitors.length}</strong><small>Across all your sites</small></div>
        <div><span className="metric-label">ACTIVE WATCHES</span><strong>{loading ? '—' : active}</strong><small>Checking on schedule</small></div>
        <div><span className="metric-label">ALERTS TO READ</span><strong>{loading ? '—' : stats?.unreadAlerts ?? 0}</strong><small><Link to="/notifications">View notifications <FiArrowRight size={12} /></Link></small></div>
        <div><span className="metric-label">LAST CHECK</span><strong className="metric-time">{latest ? formatDistanceToNow(new Date(latest.lastChecked), { addSuffix: true }) : 'Not yet'}</strong><small>Most recent activity</small></div>
      </div>

      <div className="section-heading"><div><span className="page-eyebrow">YOUR WATCHLIST</span><h2>Monitors</h2></div><Link to="/monitors">View all <FiArrowRight size={15} /></Link></div>
      {monitors.length === 0 ? (
        <div className="watch-empty"><div className="empty-symbol">◎</div><h3>Nothing to watch yet.</h3><p>Your first monitor takes less than a minute to set up.</p><Link to="/monitors/new" className="btn btn-secondary">Create your first monitor <FiArrowRight size={15} /></Link></div>
      ) : (
        <div className="watch-list">
          {monitors.slice(0, 5).map(m => (
            <Link className="watch-row" to={`/monitors/${m._id}`} key={m._id}>
              <span className={`watch-icon ${m.lastStatus === 'error' ? 'watch-error' : ''}`}>{m.lastStatus === 'error' ? <FiAlertCircle size={19} /> : <FiCheckCircle size={19} />}</span>
              <span className="watch-name"><strong>{m.name}</strong><small>{(() => { try { return new URL(m.url).hostname; } catch { return m.url; } })()} <FiExternalLink size={11} /></small></span>
              <span className="watch-condition">{m.aiPrompt}</span>
              <span className={`watch-status ${m.lastStatus === 'error' ? 'is-error' : m.isPaused ? 'is-paused' : ''}`}>{m.isPaused ? 'Paused' : m.lastStatus === 'error' ? 'Needs attention' : m.lastResult === true ? 'True' : m.lastResult === false ? 'False' : 'Watching'}</span>
              <FiArrowRight size={17} className="watch-arrow" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
