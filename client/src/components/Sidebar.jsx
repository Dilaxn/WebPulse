import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getNotifications } from '../utils/api';
import {
  FiActivity, FiMonitor, FiBell, FiSettings,
  FiLogOut, FiPlus, FiZap
} from 'react-icons/fi';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  // Close drawer when navigating (mobile)
  useEffect(() => {
    onClose?.();
  }, [location.pathname]);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await getNotifications({ unreadOnly: 'true', limit: 1 });
        setUnreadCount(res.data.unreadCount);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const navStyle = {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 24px', color: 'var(--text-secondary)',
    fontSize: '14px', fontWeight: 500, transition: 'all 0.15s',
    textDecoration: 'none', position: 'relative'
  };

  const activeStyle = {
    color: 'var(--accent)', background: 'var(--accent-dim)',
    borderRight: '3px solid var(--accent)'
  };

  return (
    <div className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
      {/* Logo */}
      <div style={{ padding: '0 24px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-blue))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FiZap size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.5px' }}>WebPulse</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Monitor Agent</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '16px 0' }}>
        <NavLink to="/dashboard" style={({ isActive }) => ({ ...navStyle, ...(isActive ? activeStyle : {}) })}>
          <FiActivity size={16} /> Dashboard
        </NavLink>
        <NavLink to="/monitors" end style={({ isActive }) => ({ ...navStyle, ...(isActive ? activeStyle : {}) })}>
          <FiMonitor size={16} /> Monitors
        </NavLink>
        <NavLink to="/monitors/new" style={({ isActive }) => ({ ...navStyle, ...(isActive ? activeStyle : {}) })}>
          <FiPlus size={16} /> New Monitor
        </NavLink>
        <NavLink to="/notifications" style={({ isActive }) => ({ ...navStyle, ...(isActive ? activeStyle : {}) })}>
          <FiBell size={16} /> Alerts
          {unreadCount > 0 && (
            <span style={{
              background: 'var(--danger)', color: '#fff', borderRadius: 10,
              fontSize: 10, fontWeight: 700, padding: '1px 7px',
              position: 'absolute', right: 20
            }}>{unreadCount}</span>
          )}
        </NavLink>
        <NavLink to="/settings" style={({ isActive }) => ({ ...navStyle, ...(isActive ? activeStyle : {}) })}>
          <FiSettings size={16} /> Settings
        </NavLink>
      </nav>

      {/* User section */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '16px 24px', borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)'
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{user?.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>{user?.email}</div>
        <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
          <FiLogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
