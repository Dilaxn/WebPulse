import React, { useState, useEffect } from 'react';
import { getNotifications, markAllRead, markRead, deleteNotification } from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { FiBell, FiCheck, FiCheckCircle, FiTrash2, FiMail, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications({ limit: 100 });
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All marked as read');
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  const handleMarkRead = async (id) => {
    try {
      await markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  if (loading) return <div className="animate-pulse" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>Alerts</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={handleMarkAllRead}>
            <FiCheckCircle size={14} /> Mark All Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state card">
          <FiBell size={48} />
          <h3>No alerts yet</h3>
          <p>You'll see alerts here when your monitors detect changes</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map(n => (
            <div key={n._id} className="card" style={{
              padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14,
              opacity: n.isRead ? 0.6 : 1,
              borderLeft: n.isRead ? 'none' : '3px solid var(--accent)'
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: n.type === 'error' ? 'var(--danger-dim)' : 'var(--success-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                {n.type === 'error'
                  ? <FiAlertCircle size={18} color="var(--danger)" />
                  : <FiBell size={18} color="var(--accent)" />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{n.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.message}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                  {n.emailSent && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><FiMail size={10} /> Email sent</span>}
                  {n.monitor && <span>{n.monitor.name}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                {!n.isRead && (
                  <button className="btn btn-secondary btn-icon btn-sm" title="Mark read"
                    onClick={() => handleMarkRead(n._id)}>
                    <FiCheck size={14} />
                  </button>
                )}
                <button className="btn btn-danger btn-icon btn-sm" title="Delete"
                  onClick={() => handleDelete(n._id)}>
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
