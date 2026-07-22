import React, { useState, useEffect } from 'react';
import { 
  User, Calendar, TrendingUp, Edit3, ClipboardList, CheckCircle2, 
  AlertCircle, ChevronRight, Save, Send, LogOut, Award, BarChart3, MessageSquare 
} from 'lucide-react';

const PARAMETERS = [
  { id: 'ownership', name: 'Ownership', desc: 'Takes responsibility for outcomes, acts proactively, and follows through on commitments.' },
  { id: 'communication', name: 'Communication', desc: 'Expresses ideas clearly, listens actively, and collaborates effectively with team members.' },
  { id: 'quality_of_work', name: 'Quality of Work', desc: 'Delivers accurate, thorough, and high-standard output with attention to detail.' },
  { id: 'teamwork', name: 'Teamwork', desc: 'Supports colleagues, contributes positively to team dynamics, and shares knowledge.' },
  { id: 'initiative', name: 'Initiative', desc: 'Identifies opportunities for improvement, learns new skills, and drives solutions.' }
];

export default function EmployeeApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('my-performance'); // 'my-performance' or 'team-feedback'
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  
  // My Performance states
  const [history, setHistory] = useState([]);
  const [selectedHistoryParam, setSelectedHistoryParam] = useState('ownership');
  const [currentFeedback, setCurrentFeedback] = useState(null);

  // Team Feedback states
  const [teamCycleId, setTeamCycleId] = useState('');
  const [reportsStatus, setReportsStatus] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null); // Reportee user object
  const [formScores, setFormScores] = useState({
    ownership: { score: 0, comment: '' },
    communication: { score: 0, comment: '' },
    quality_of_work: { score: 0, comment: '' },
    teamwork: { score: 0, comment: '' },
    initiative: { score: 0, comment: '' }
  });
  const [formStatus, setFormStatus] = useState('not_started'); // 'not_started', 'draft', 'submitted'
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const isManager = ['manager', 'founder', 'coo'].includes(user.role);

  // Load initial data
  useEffect(() => {
    fetchCycles();
    fetchHistory();
  }, []);

  // Fetch cycles
  const fetchCycles = async () => {
    try {
      const res = await fetch('/api/cycles');
      const data = await res.json();
      setCycles(data);
      if (data.length > 0) {
        setSelectedCycleId(data[0].id);
        setTeamCycleId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load cycles', err);
    }
  };

  // Fetch my history
  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/feedback/history?userId=${user.id}`);
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load feedback history', err);
    }
  };

  // Fetch reviews received for the selected cycle
  useEffect(() => {
    if (selectedCycleId && history.length > 0) {
      const found = history.find(h => h.cycleId === selectedCycleId);
      setCurrentFeedback(found || null);
    } else {
      setCurrentFeedback(null);
    }
  }, [selectedCycleId, history]);

  // Fetch team reports feedback status
  useEffect(() => {
    if (isManager && teamCycleId) {
      fetchTeamStatus();
    }
  }, [teamCycleId, activeTab]);

  const fetchTeamStatus = async () => {
    try {
      const res = await fetch(`/api/feedback/status?cycleId=${teamCycleId}&reviewerId=${user.id}`);
      const data = await res.json();
      setReportsStatus(data);
    } catch (err) {
      console.error('Failed to load team feedback status', err);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Open feedback form for a direct report
  const handleOpenReview = (reportStatusItem) => {
    const reportee = reportStatusItem.reportee;
    setSelectedReport(reportee);
    setFormStatus(reportStatusItem.status);
    
    const initialScores = {};
    PARAMETERS.forEach(p => {
      const saved = reportStatusItem.scores[p.id];
      initialScores[p.id] = {
        score: saved ? saved.score : 0,
        comment: saved ? saved.comment : ''
      };
    });
    setFormScores(initialScores);
  };

  // Handle Score Input
  const handleScoreChange = (paramId, score) => {
    if (formStatus === 'submitted') return;
    setFormScores(prev => ({
      ...prev,
      [paramId]: { ...prev[paramId], score }
    }));
  };

  // Handle Comment Input
  const handleCommentChange = (paramId, comment) => {
    if (formStatus === 'submitted') return;
    setFormScores(prev => ({
      ...prev,
      [paramId]: { ...prev[paramId], comment }
    }));
  };

  // Submit/Save Feedback Form
  const handleSaveFeedback = async (submitStatus) => {
    // Validate scores and comments if submitting
    if (submitStatus === 'submitted') {
      const missingScores = PARAMETERS.some(p => formScores[p.id].score === 0);
      const missingComments = PARAMETERS.some(p => !formScores[p.id].comment.trim());
      if (missingScores || missingComments) {
        showToast('Please provide a score and reasoning for all 5 parameters before submitting.', 'danger');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId: teamCycleId,
          reviewerId: user.id,
          revieweeId: selectedReport.id,
          status: submitStatus,
          scores: formScores
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      showToast(submitStatus === 'submitted' ? 'Feedback submitted and locked!' : 'Draft saved successfully!');
      setSelectedReport(null);
      fetchTeamStatus();
      fetchHistory(); // in case user gave feedback to someone who also reports to them, or updates history
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  // Compute stats for progress
  const submittedCount = reportsStatus.filter(r => r.status === 'submitted').length;
  const totalCount = reportsStatus.length;

  return (
    <div className="employee-layout">
      <style>{`
        .employee-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .app-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.5rem;
        }
        .tab-btn {
          background: none;
          border: none;
          padding: 0.75rem 1.25rem;
          color: 'var(--text-secondary)';
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          position: relative;
          transition: color var(--transition-fast);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .tab-btn:hover {
          color: var(--text-primary);
        }
        .tab-btn.active {
          color: var(--primary);
        }
        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -0.6rem;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--primary), var(--secondary));
          border-radius: 999px;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        @media (min-width: 992px) {
          .dashboard-grid {
            grid-template-columns: 2.2fr 0.8fr;
          }
        }
        .performance-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .param-score-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .score-pill-large {
          font-size: 2.25rem;
          font-weight: 800;
          font-family: var(--font-heading);
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 10px rgba(99, 102, 241, 0.15);
        }
        .rating-badge {
          align-self: flex-start;
          padding: 0.35rem 0.85rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 1.25rem;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rating-1 { background-color: #ef4444; }
        .rating-2 { background-color: #f59e0b; }
        .rating-3 { background-color: #fbbf24; color: #111827; }
        .rating-4 { background-color: #34d399; color: #111827; }
        .rating-5 { background-color: #10b981; }

        .trend-chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .trend-comments-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .trend-comment-item {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.25rem;
        }
        .report-avatar {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #fff;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(4, 6, 12, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
          overflow-y: auto;
        }
        .modal-container {
          background: #0d1220;
          border: 1px solid var(--border-color);
          border-radius: 20px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 15px 40px rgba(0,0,0,0.6);
        }
        .modal-header {
          padding: 1.5rem 2rem;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          background: #0d1220;
          z-index: 10;
        }
        .modal-body {
          padding: 2rem;
        }
        .modal-footer {
          padding: 1.5rem 2rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          position: sticky;
          bottom: 0;
          background: #0d1220;
          z-index: 10;
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
            <BarChart3 className="logo-icon" size={24} color="#6366f1" />
            <span className="logo-text">Performify</span>
          </div>

          <div className="user-profile-menu">
            <div className="user-info-text">
              <div className="user-name">{user.name}</div>
              <div className="user-company">{user.company_name} • <span style={{ textTransform: 'capitalize' }}>{user.role}</span></div>
            </div>
            <button className="btn btn-secondary" onClick={onLogout} style={{ padding: '0.5rem 1rem' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-container">
        {/* Navigation Tabs */}
        {isManager && (
          <div className="app-tabs">
            <button 
              className={`tab-btn ${activeTab === 'my-performance' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-performance')}
            >
              <User size={18} /> My Performance
            </button>
            <button 
              className={`tab-btn ${activeTab === 'team-feedback' ? 'active' : ''}`}
              onClick={() => setActiveTab('team-feedback')}
            >
              <ClipboardList size={18} /> Give Team Feedback
            </button>
          </div>
        )}

        {/* Tab 1: My Performance (Received reviews & trends) */}
        {activeTab === 'my-performance' && (
          <div className="dashboard-grid animate-fade-in">
            {/* Left: Feedback Details / History */}
            <div className="performance-section">
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 className="parameter-title" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Award size={20} color="#a855f7" /> Reviews Received
                  </h3>
                  <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} color="#9ca3af" />
                    <select
                      className="form-control"
                      style={{ padding: '0.4rem 2rem 0.4rem 0.8rem', width: 'auto' }}
                      value={selectedCycleId}
                      onChange={(e) => setSelectedCycleId(e.target.value)}
                    >
                      {cycles.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {currentFeedback ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Reviewed by: <strong style={{ color: '#fff' }}>{currentFeedback.reviewerName}</strong>
                      </p>
                      <span className="badge badge-success">Submitted</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {PARAMETERS.map(p => {
                        const scoreData = currentFeedback.scores[p.id];
                        return (
                          <div key={p.id} className="param-score-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <h4 className="parameter-title">{p.name}</h4>
                                <p className="parameter-desc" style={{ margin: 0 }}>{p.desc}</p>
                              </div>
                              {scoreData && (
                                <div className={`rating-badge rating-${scoreData.score}`}>
                                  {scoreData.score}
                                </div>
                              )}
                            </div>
                            {scoreData && (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'rgba(0,0,0,0.15)', padding: '0.85rem 1.1rem', borderRadius: '8px' }}>
                                <MessageSquare size={16} color="#a855f7" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                                <p style={{ fontSize: '0.9rem', color: '#e5e7eb', fontStyle: 'italic', lineHeight: '1.5' }}>
                                  "{scoreData.comment}"
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <AlertCircle size={40} color="#6b7280" style={{ marginBottom: '1rem' }} />
                    <p style={{ fontSize: '0.95rem' }}>No feedback submitted for this cycle yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: History Trends */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'fit-content' }}>
              <div className="card" style={{ width: '100%' }}>
                <h3 className="parameter-title" style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={20} color="#10b981" /> Parameter History
                </h3>

                <div className="form-group">
                  <label htmlFor="paramSelector">Select Parameter</label>
                  <select
                    id="paramSelector"
                    className="form-control"
                    value={selectedHistoryParam}
                    onChange={(e) => setSelectedHistoryParam(e.target.value)}
                  >
                    {PARAMETERS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {history.length > 0 ? (
                  <div>
                    {/* CSS Custom Trend Chart */}
                    <div className="trend-chart-container" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
                      <div className="chart-bars">
                        {history.map(h => {
                          const scoreVal = h.scores[selectedHistoryParam]?.score || 0;
                          const heightPct = (scoreVal / 5) * 100;
                          return (
                            <div className="chart-bar-group" key={h.cycleId}>
                              <div 
                                className="chart-bar-fill" 
                                style={{ height: `${heightPct}%`, display: scoreVal > 0 ? 'flex' : 'none' }}
                              >
                                <span className="chart-bar-value">{scoreVal}</span>
                              </div>
                              <span className="chart-bar-label">{h.cycleName.split(' ')[0]}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="trend-comments-list">
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Comments History
                      </h4>
                      {history.map(h => {
                        const paramFeedback = h.scores[selectedHistoryParam];
                        if (!paramFeedback) return null;
                        return (
                          <div className="trend-comment-item" key={h.cycleId}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{h.cycleName}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>Score: {paramFeedback.score}/5</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#d1d5db', lineHeight: '1.4' }}>
                              "{paramFeedback.comment}"
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '0.85rem' }}>No history records available yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Give Feedback (Manager flow) */}
        {activeTab === 'team-feedback' && isManager && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div>
                  <h3 className="parameter-title" style={{ fontSize: '1.4rem' }}>Feedback Dashboard</h3>
                  <p className="parameter-desc" style={{ margin: 0 }}>Review performance of your team members.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} color="#9ca3af" />
                    <select
                      className="form-control"
                      style={{ padding: '0.4rem 2rem 0.4rem 0.8rem', width: 'auto' }}
                      value={teamCycleId}
                      onChange={(e) => setTeamCycleId(e.target.value)}
                    >
                      {cycles.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  {totalCount > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SUBMISSIONS</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                        {submittedCount} <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>/ {totalCount}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {reportsStatus.length > 0 ? (
                <div className="table-container">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Role</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsStatus.map(item => (
                        <tr key={item.reportee.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div className="report-avatar">
                                {item.reportee.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <strong style={{ color: '#fff' }}>{item.reportee.name}</strong>
                            </div>
                          </td>
                          <td><span style={{ textTransform: 'capitalize' }}>{item.reportee.role}</span></td>
                          <td>{item.reportee.email}</td>
                          <td>
                            {item.status === 'submitted' && <span className="badge badge-success">Submitted</span>}
                            {item.status === 'draft' && <span className="badge badge-warning">Draft</span>}
                            {item.status === 'not_started' && <span className="badge badge-danger" style={{ opacity: 0.7 }}>Not Started</span>}
                          </td>
                          <td>
                            <button
                              className={`btn ${item.status === 'submitted' ? 'btn-secondary' : 'btn-primary'}`}
                              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                              onClick={() => handleOpenReview(item)}
                            >
                              {item.status === 'submitted' ? 'View Review' : 'Give Review'}
                              <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <AlertCircle size={40} color="#6b7280" style={{ marginBottom: '1rem' }} />
                  <p>No team members reporting to you were found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Review Modal Form */}
      {selectedReport && (
        <div className="modal-overlay">
          <div className="modal-container animate-fade-in">
            <div className="modal-header">
              <div>
                <h3 className="parameter-title" style={{ fontSize: '1.25rem', marginBottom: '0.1rem' }}>
                  {formStatus === 'submitted' ? 'Monthly Feedback (Read-Only)' : 'Evaluate Team Member'}
                </h3>
                <p className="parameter-desc" style={{ margin: 0 }}>
                  Reviewee: <strong style={{ color: '#fff' }}>{selectedReport.name}</strong> | Cycle: <strong style={{ color: '#fff' }}>{cycles.find(c => c.id === teamCycleId)?.name}</strong>
                </p>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={() => setSelectedReport(null)}
                style={{ padding: '0.4rem 0.8rem' }}
              >
                ✕ Close
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {formStatus === 'submitted' && (
                <div className="notification-banner" style={{ margin: 0 }}>
                  <CheckCircle2 size={20} />
                  <span>This feedback has been submitted. It is now locked and viewable by the employee.</span>
                </div>
              )}

              {PARAMETERS.map(p => {
                const item = formScores[p.id];
                return (
                  <div key={p.id} className="parameter-card">
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h4 className="parameter-title">{p.name}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {item.score > 0 ? `Selected Score: ${item.score}/5` : 'Score Required *'}
                      </span>
                    </div>
                    <p className="parameter-desc">{p.desc}</p>

                    {/* Interactive Score Selector */}
                    <div className="score-selector">
                      {[1, 2, 3, 4, 5].map(score => {
                        const isSelected = item.score === score;
                        return (
                          <button
                            key={score}
                            type="button"
                            className={`score-btn ${isSelected ? `selected-${score}` : ''}`}
                            onClick={() => handleScoreChange(p.id, score)}
                            disabled={formStatus === 'submitted'}
                          >
                            {score}
                          </button>
                        );
                      })}
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label htmlFor={`comment-${p.id}`}>Explanation / Specific Examples *</label>
                      <textarea
                        id={`comment-${p.id}`}
                        rows={3}
                        className="form-control"
                        placeholder="Provide concrete reasons or observations for giving this score..."
                        value={item.comment}
                        onChange={(e) => handleCommentChange(p.id, e.target.value)}
                        disabled={formStatus === 'submitted'}
                        required
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="modal-footer">
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => setSelectedReport(null)}
                disabled={saving}
              >
                Cancel
              </button>
              {formStatus !== 'submitted' && (
                <>
                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    onClick={() => handleSaveFeedback('draft')}
                    disabled={saving}
                    style={{ display: 'flex', gap: '0.5rem' }}
                  >
                    <Save size={16} /> Save Draft
                  </button>
                  <button 
                    type="button"
                    className="btn btn-primary" 
                    onClick={() => {
                      if(window.confirm("Are you sure you want to SUBMIT? This will finalize the scores and make them visible to the employee. You won't be able to edit this feedback later.")) {
                        handleSaveFeedback('submitted');
                      }
                    }}
                    disabled={saving}
                    style={{ display: 'flex', gap: '0.5rem' }}
                  >
                    <Send size={16} /> Submit Feedback
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Alert */}
      {toast && (
        <div className="toast-container">
          <div 
            className="card animate-fade-in" 
            style={{ 
              padding: '1rem 1.5rem', 
              background: toast.type === 'danger' ? '#7f1d1d' : '#064e3b',
              borderColor: toast.type === 'danger' ? '#f87171' : '#34d399',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: '#fff'
            }}
          >
            {toast.type === 'danger' ? <AlertCircle size={20} color="#f87171" /> : <CheckCircle2 size={20} color="#34d399" />}
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
