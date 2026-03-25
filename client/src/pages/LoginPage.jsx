import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { login, register } from '../utils/api';
import { FiZap, FiMail, FiLock, FiUser, FiArrowRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = isRegister ? await register(form) : await login(form);
      loginUser(res.data.token, res.data.user);
      toast.success(isRegister ? 'Account created!' : 'Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }}>
      <div style={{ width: '100%', maxWidth: 420 }} className="animate-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-blue))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 30px var(--accent-dim)'
          }}>
            <FiZap size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px' }}>WebPulse</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Intelligent Web Monitoring Agent
          </p>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
            {isRegister ? 'Create Account' : 'Sign In'}
          </h2>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="form-group">
                <label>Name</label>
                <div style={{ position: 'relative' }}>
                  <FiUser size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                  <input
                    type="text" placeholder="Your name"
                    style={{ paddingLeft: 38 }}
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <div style={{ position: 'relative' }}>
                <FiMail size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type="email" placeholder="you@example.com"
                  style={{ paddingLeft: 38 }}
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <FiLock size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type="password" placeholder="Min 6 characters"
                  style={{ paddingLeft: 38 }}
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  required minLength={6}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '12px 20px' }}>
              {loading ? 'Loading...' : (isRegister ? 'Create Account' : 'Sign In')}
              <FiArrowRight size={16} />
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => setIsRegister(!isRegister)}
              style={{
                background: 'none', border: 'none', color: 'var(--accent)',
                cursor: 'pointer', fontWeight: 600, marginLeft: 6, fontSize: 14
              }}
            >
              {isRegister ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
