import React, { useState, useEffect } from 'react';
import { Shield, Key, Building2, UserCheck, ArrowRight, Activity } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState([]);
  const [showDemoList, setShowDemoList] = useState(true);

  // Fetch all users to populate the Quick Login selector
  useEffect(() => {
    fetch('/api/auth/users')
      .then(res => res.json())
      .then(data => {
        setDemoUsers(data);
      })
      .catch(err => console.error('Failed to load demo users', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLoginSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (user) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: 'password123' })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Quick login failed');
      }
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Group users by company for presentation
  const ashokaUsers = demoUsers.filter(u => u.company_id === 'ashoka');
  const bpUsers = demoUsers.filter(u => u.company_id === 'brightpath');

  return (
    <div className="login-page-container">
      <style>{`
        .login-page-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
        }
        .login-grid {
          display: grid;
          grid-template-columns: 1fr;
          max-width: 1100px;
          width: 100%;
          background: rgba(17, 24, 39, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--border-color);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
        }
        @media (min-width: 992px) {
          .login-grid {
            grid-template-columns: 1.1fr 0.9fr;
          }
        }
        .login-left {
          padding: 3rem 2.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        @media (min-width: 992px) {
          .login-left {
            border-bottom: none;
            border-right: 1px solid var(--border-color);
          }
        }
        .login-right {
          padding: 3rem 2.5rem;
          background: rgba(10, 15, 30, 0.4);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .login-tagline {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 0.5rem;
        }
        .login-title {
          font-family: var(--font-heading);
          font-size: 2.25rem;
          font-weight: 800;
          margin-bottom: 1.5rem;
          line-height: 1.2;
          background: linear-gradient(135deg, #fff 40%, var(--text-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .login-desc {
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.6;
          margin-bottom: 2rem;
        }
        .company-group {
          margin-bottom: 2rem;
        }
        .company-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding-bottom: 0.5rem;
        }
        .demo-user-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 0.75rem;
        }
        .demo-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          padding: 0.75rem 1rem;
          border-radius: 12px;
          text-align: left;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .demo-btn:hover {
          background: rgba(99, 102, 241, 0.06);
          border-color: rgba(99, 102, 241, 0.4);
          transform: translateY(-2px);
        }
        .demo-btn-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .demo-btn-role {
          font-size: 0.7rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .demo-btn-email {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .error-message {
          background: var(--danger-glow);
          color: #f87171;
          border: 1px solid var(--danger);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          font-size: 0.85rem;
        }
        .footer-note {
          text-align: center;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 1.5rem;
        }
      `}</style>

      <div className="login-grid animate-fade-in">
        <div className="login-left">
          <div className="logo-section" style={{ marginBottom: '2.5rem' }}>
            <Activity className="logo-icon" size={28} color="#6366f1" />
            <span className="logo-text">Performify</span>
          </div>

          <p className="login-tagline">Pilot Pilot Program</p>
          <h2 className="login-title">Multi-Company Evaluation</h2>
          <p className="login-desc">
            Welcome to the pilot platform. Check out the two active test companies below. Click any demo user card to instantly log in and test their specific workflow.
          </p>

          {showDemoList && (
            <div className="demo-users-wrapper">
              <div className="company-group">
                <h4 className="company-title">
                  <Building2 size={16} color="#a855f7" /> Ashoka Textiles (Hierarchical Setup)
                </h4>
                <div className="demo-user-buttons">
                  {ashokaUsers.map(user => (
                    <button
                      key={user.id}
                      className="demo-btn"
                      onClick={() => handleQuickLogin(user)}
                      disabled={loading}
                    >
                      <span className="demo-btn-name">{user.name}</span>
                      <span className="demo-btn-role">{user.role}</span>
                      <span className="demo-btn-email">{user.email}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="company-group">
                <h4 className="company-title">
                  <Building2 size={16} color="#10b981" /> Bright Path Consulting (Flat Setup)
                </h4>
                <div className="demo-user-buttons">
                  {bpUsers.map(user => (
                    <button
                      key={user.id}
                      className="demo-btn"
                      onClick={() => handleQuickLogin(user)}
                      disabled={loading}
                    >
                      <span className="demo-btn-name">{user.name}</span>
                      <span className="demo-btn-role">{user.role}</span>
                      <span className="demo-btn-email">{user.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="login-right">
          <h3 className="parameter-title" style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>
            Sign In
          </h3>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Work Email</label>
              <input
                id="email"
                type="email"
                className="form-control"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem', padding: '0.9rem' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'} <ArrowRight size={18} />
            </button>
          </form>

          <p className="footer-note">
            Default Demo Password: <strong>password123</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
