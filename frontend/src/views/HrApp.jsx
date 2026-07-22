import React, { useState, useEffect } from 'react';
import { 
  Building2, Calendar, Users, AlertTriangle, CheckCircle, 
  Mail, Search, LogOut, Info, ArrowRight, ShieldCheck 
} from 'lucide-react';

export default function HrApp({ user, onLogout }) {
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState(user.company_id);
  const [managersData, setManagersData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Companies list
  const companies = [
    { id: 'ashoka', name: 'Ashoka Textiles' },
    { id: 'brightpath', name: 'Bright Path Consulting' }
  ];

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchCycles = async () => {
    try {
      const res = await fetch('/api/cycles');
      const data = await res.json();
      setCycles(data);
      if (data.length > 0) {
        setSelectedCycleId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load cycles', err);
    }
  };

  // Fetch managers submission status
  useEffect(() => {
    if (selectedCycleId && selectedCompanyId) {
      fetchMissingFeedback();
    }
  }, [selectedCycleId, selectedCompanyId]);

  const fetchMissingFeedback = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/missing-feedback?cycleId=${selectedCycleId}&companyId=${selectedCompanyId}`);
      const data = await res.json();
      setManagersData(data);
    } catch (err) {
      console.error('Failed to load missing feedback data', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSendReminder = (manager, pendingReports) => {
    const reportNames = pendingReports.map(r => r.name).join(', ');
    showToast(`Simulation: Email reminder sent to ${manager.name} (${manager.email}) to submit reviews for [${reportNames}]!`);
  };

  // Filter managers by search term
  const filteredManagers = managersData.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compute overall stats
  const totalManagers = managersData.length;
  const fullyCompletedManagers = managersData.filter(m => m.submittedReports === m.totalReports).length;
  const pendingManagersCount = totalManagers - fullyCompletedManagers;

  return (
    <div className="hr-layout animate-fade-in">
      <style>{`
        .hr-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .filter-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
          margin-bottom: 2rem;
          align-items: flex-end;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-icon.blue { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
        .stat-icon.green { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .stat-icon.orange { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }

        .stat-num {
          font-family: var(--font-heading);
          font-size: 1.75rem;
          font-weight: 800;
          line-height: 1.2;
        }
        .stat-lbl {
          font-size: 0.8rem;
          color: 'var(--text-secondary)';
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .manager-card {
          margin-bottom: 1.5rem;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.015);
        }
        .manager-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 1rem;
          margin-bottom: 1rem;
        }
        .manager-name {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 600;
          color: #fff;
        }
        .manager-email {
          font-size: 0.8rem;
          color: 'var(--text-secondary)';
        }
        .pending-list {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .pending-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.6rem 1rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          border-left: 3px solid var(--danger);
        }
        .pending-item.draft {
          border-left-color: var(--warning);
        }
        .pending-item-name {
          font-size: 0.9rem;
          font-weight: 500;
        }
        .pending-item-role {
          font-size: 0.75rem;
          color: 'var(--text-secondary)';
        }
        .progress-track {
          width: 100%;
          max-width: 250px;
          background: rgba(255,255,255,0.05);
          height: 8px;
          border-radius: 999px;
          overflow: hidden;
          margin-top: 0.35rem;
        }
        .progress-thumb {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--primary), var(--secondary));
          transition: width 0.4s ease;
        }
        .progress-text {
          font-size: 0.8rem;
          font-weight: 600;
          color: 'var(--text-secondary)';
        }
        .toast-container {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          z-index: 2000;
          animation: slideUp 0.3s forwards;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <header className="main-header">
        <div className="header-content" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div className="logo-section">
            <ShieldCheck className="logo-icon" size={24} color="#6366f1" />
            <span className="logo-text">Performify <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>HR Admin</span></span>
          </div>

          <div className="user-profile-menu">
            <div className="user-info-text">
              <div className="user-name">{user.name}</div>
              <div className="user-company">{user.company_name} • HR Lead</div>
            </div>
            <button className="btn btn-secondary" onClick={onLogout} style={{ padding: '0.5rem 1rem' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-container">
        {/* Filters */}
        <div className="filter-bar card">
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
            <label htmlFor="company-select">Pilot Client Company</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} color="#9ca3af" />
              <select
                id="company-select"
                className="form-control"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
            <label htmlFor="cycle-select">Evaluation Cycle</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="#9ca3af" />
              <select
                id="cycle-select"
                className="form-control"
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
              >
                {cycles.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0, flex: 1.5, minWidth: '260px' }}>
            <label htmlFor="search-input">Search Managers</label>
            <div style={{ position: 'relative' }}>
              <input
                id="search-input"
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Search by manager name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          {/* Card 1: Active Managers */}
          <div className="card stat-card">
            <div className="stat-icon blue">
              <Users size={24} />
            </div>
            <div>
              <div className="stat-num">{totalManagers}</div>
              <div className="stat-lbl">Active Managers</div>
            </div>
          </div>

          <div className="card stat-card">
            <div className="stat-icon green">
              <CheckCircle size={24} />
            </div>
            <div>
              <div className="stat-num">{fullyCompletedManagers}</div>
              <div className="stat-lbl">100% Completed</div>
            </div>
          </div>

          <div className="card stat-card">
            <div className="stat-icon orange">
              <AlertTriangle size={24} />
            </div>
            <div>
              <div className="stat-num">{pendingManagersCount}</div>
              <div className="stat-lbl">Submissions Pending</div>
            </div>
          </div>
        </div>

        {/* Managers Status List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 className="parameter-title" style={{ fontSize: '1.25rem' }}>
            Feedback Submission Report
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              Loading report details...
            </div>
          ) : filteredManagers.length > 0 ? (
            filteredManagers.map(mgr => {
              const pct = (mgr.submittedReports / mgr.totalReports) * 100;
              const isCompleted = mgr.submittedReports === mgr.totalReports;

              return (
                <div key={mgr.id} className="card manager-card">
                  <div className="manager-card-header">
                    <div>
                      <h4 className="manager-name">{mgr.name}</h4>
                      <p className="manager-email">{mgr.email}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                      {/* Progress bar */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="progress-text">Submission Progress</span>
                          <span className="progress-text" style={{ color: isCompleted ? '#34d399' : '#fbbf24', marginLeft: '1rem' }}>
                            {mgr.submittedReports} / {mgr.totalReports}
                          </span>
                        </div>
                        <div className="progress-track">
                          <div 
                            className="progress-thumb" 
                            style={{ 
                              width: `${pct}%`,
                              background: isCompleted ? 'var(--success)' : 'linear-gradient(90deg, var(--primary), var(--secondary))' 
                            }} 
                          />
                        </div>
                      </div>

                      {/* Reminder Action */}
                      {!isCompleted ? (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', gap: '0.4rem' }}
                          onClick={() => handleSendReminder(mgr, mgr.pendingReports)}
                        >
                          <Mail size={14} /> Remind Manager
                        </button>
                      ) : (
                        <span className="badge badge-success" style={{ display: 'flex', gap: '0.25rem', padding: '0.4rem 0.85rem' }}>
                          <CheckCircle size={12} /> All Done
                        </span>
                      )}
                    </div>
                  </div>

                  {/* List of Pending feedback for this manager */}
                  {!isCompleted ? (
                    <div>
                      <h5 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        Pending Feedback Details
                      </h5>
                      <div className="pending-list">
                        {mgr.pendingReports.map(rep => (
                          <div key={rep.id} className={`pending-item ${rep.status === 'draft' ? 'draft' : ''}`}>
                            <div>
                              <span className="pending-item-name">{rep.name}</span>
                              <span className="pending-item-role" style={{ marginLeft: '1rem' }}>({rep.email})</span>
                            </div>
                            <span 
                              className={`badge ${rep.status === 'draft' ? 'badge-warning' : 'badge-danger'}`}
                              style={{ padding: '0.15rem 0.6rem', fontSize: '0.7rem' }}
                            >
                              {rep.status === 'draft' ? 'Draft Saved' : 'Not Started'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontSize: '0.85rem' }}>
                      <Info size={14} />
                      <span>Manager has successfully submitted monthly reviews for all team members.</span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="card" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No managers found matching the filters.
            </div>
          )}
        </div>
      </main>

      {/* Toast Alert */}
      {toast && (
        <div className="toast-container">
          <div
            className="card"
            style={{
              padding: '1.25rem 1.75rem',
              background: '#1e1b4b',
              borderColor: 'var(--primary)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: '#c7d2fe',
              maxWidth: '500px'
            }}
          >
            <Mail size={22} color="#818cf8" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
