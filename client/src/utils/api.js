import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/profile', data);

// Monitors
export const getMonitors = () => api.get('/monitors');
export const getMonitor = (id) => api.get(`/monitors/${id}`);
export const createMonitor = (data) => api.post('/monitors', data);
export const updateMonitor = (id, data) => api.put(`/monitors/${id}`, data);
export const deleteMonitor = (id) => api.delete(`/monitors/${id}`);
export const runMonitor = (id) => api.post(`/monitors/${id}/run`);
export const toggleMonitor = (id) => api.post(`/monitors/${id}/toggle`);
export const testScrape = (data) => api.post('/monitors/test-scrape', data);

// Notifications
export const getNotifications = (params) => api.get('/notifications', { params });
export const markAllRead = () => api.put('/notifications/read-all');
export const markRead = (id) => api.put(`/notifications/${id}/read`);
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);
export const testEmail = () => api.post('/notifications/test-email');

// Stats
export const getStats = () => api.get('/stats');

// Health
export const getHealth = () => api.get('/health');

export default api;
