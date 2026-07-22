const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { initDb, allQuery, getQuery, runQuery } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await getQuery('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Get company name
    const company = await getQuery('SELECT name FROM companies WHERE id = ?', [user.company_id]);

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
      company_name: company ? company.name : '',
      manager_id: user.manager_id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (useful for quick-login in demo mode)
app.get('/api/auth/users', async (req, res) => {
  try {
    const users = await allQuery(`
      SELECT u.id, u.name, u.email, u.role, u.company_id, c.name as company_name, u.manager_id
      FROM users u
      JOIN companies c ON u.company_id = c.id
      ORDER BY u.company_id, u.role, u.name
    `);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all evaluation cycles
app.get('/api/cycles', async (req, res) => {
  try {
    const cycles = await allQuery('SELECT * FROM feedback_cycles ORDER BY start_date DESC');
    res.json(cycles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get managers reports and their feedback status for a specific cycle
app.get('/api/feedback/status', async (req, res) => {
  const { cycleId, reviewerId } = req.query;
  if (!cycleId || !reviewerId) {
    return res.status(400).json({ error: 'cycleId and reviewerId are required' });
  }

  try {
    // Get direct reports
    const reports = await allQuery(
      `SELECT id, name, email, role FROM users WHERE manager_id = ? ORDER BY name`,
      [reviewerId]
    );

    // Get feedback status for each report
    const feedbackStatusList = [];
    for (const report of reports) {
      const fb = await getQuery(
        `SELECT id, status, submitted_at FROM feedbacks WHERE cycle_id = ? AND reviewer_id = ? AND reviewee_id = ?`,
        [cycleId, reviewerId, report.id]
      );

      // If feedback exists, get details (scores and comments)
      let details = {};
      if (fb) {
        const rows = await allQuery(
          `SELECT parameter_id, score, comment FROM feedback_details WHERE feedback_id = ?`,
          [fb.id]
        );
        rows.forEach(r => {
          details[r.parameter_id] = { score: r.score, comment: r.comment };
        });
      }

      feedbackStatusList.push({
        reportee: report,
        status: fb ? fb.status : 'not_started',
        submittedAt: fb ? fb.submitted_at : null,
        feedbackId: fb ? fb.id : null,
        scores: details
      });
    }

    res.json(feedbackStatusList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit or save draft feedback
app.post('/api/feedback/submit', async (req, res) => {
  const { cycleId, reviewerId, revieweeId, status, scores } = req.body;

  if (!cycleId || !reviewerId || !revieweeId || !status || !scores) {
    return res.status(400).json({ error: 'Missing required feedback fields' });
  }

  const feedbackId = `${cycleId}_${reviewerId}_${revieweeId}`;
  const submittedAt = status === 'submitted' ? new Date().toISOString() : null;

  try {
    // Start SQLite transaction/write sequence
    await runQuery('BEGIN TRANSACTION;');

    // 1. Delete existing feedback if any (ON DELETE CASCADE will handle feedback_details)
    await runQuery('DELETE FROM feedbacks WHERE id = ?', [feedbackId]);

    // 2. Insert feedback
    await runQuery(
      `INSERT INTO feedbacks (id, cycle_id, reviewer_id, reviewee_id, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [feedbackId, cycleId, reviewerId, revieweeId, status, submittedAt]
    );

    // 3. Insert feedback details
    for (const paramId of Object.keys(scores)) {
      const detailId = `${feedbackId}_${paramId}`;
      const item = scores[paramId];
      await runQuery(
        `INSERT INTO feedback_details (id, feedback_id, parameter_id, score, comment) VALUES (?, ?, ?, ?, ?)`,
        [detailId, feedbackId, paramId, item.score, item.comment]
      );
    }

    await runQuery('COMMIT;');
    res.json({ message: 'Feedback saved successfully', feedbackId });
  } catch (err) {
    await runQuery('ROLLBACK;');
    console.error(err);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// Get feedback history for an employee (scores over past few months)
app.get('/api/feedback/history', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Get all submitted feedbacks for this user
    const feedbacks = await allQuery(`
      SELECT f.id as feedback_id, f.cycle_id, c.name as cycle_name, f.reviewer_id, u.name as reviewer_name, f.submitted_at
      FROM feedbacks f
      JOIN feedback_cycles c ON f.cycle_id = c.id
      JOIN users u ON f.reviewer_id = u.id
      WHERE f.reviewee_id = ? AND f.status = 'submitted'
      ORDER BY c.start_date ASC
    `, [userId]);

    const history = [];
    for (const fb of feedbacks) {
      const details = await allQuery(`
        SELECT fd.parameter_id, p.name as parameter_name, fd.score, fd.comment
        FROM feedback_details fd
        JOIN parameters p ON fd.parameter_id = p.id
        WHERE fd.feedback_id = ?
      `, [fb.feedback_id]);

      const scores = {};
      details.forEach(d => {
        scores[d.parameter_id] = {
          parameterName: d.parameter_name,
          score: d.score,
          comment: d.comment
        };
      });

      history.push({
        cycleId: fb.cycle_id,
        cycleName: fb.cycle_name,
        reviewerId: fb.reviewer_id,
        reviewerName: fb.reviewer_name,
        submittedAt: fb.submitted_at,
        scores
      });
    }

    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// HR Dashboard - Get missing feedback for a cycle and company
app.get('/api/hr/missing-feedback', async (req, res) => {
  const { cycleId, companyId } = req.query;
  if (!cycleId || !companyId) {
    return res.status(400).json({ error: 'cycleId and companyId are required' });
  }

  try {
    // Get all reportee relations and check if feedback exists
    const rows = await allQuery(`
      SELECT 
        m.id AS manager_id, m.name AS manager_name, m.email AS manager_email,
        r.id AS report_id, r.name AS report_name, r.email AS report_email,
        f.status AS feedback_status, f.submitted_at AS feedback_submitted_at
      FROM users m
      JOIN users r ON r.manager_id = m.id
      LEFT JOIN feedbacks f ON f.reviewer_id = m.id AND f.reviewee_id = r.id AND f.cycle_id = ?
      WHERE m.company_id = ?
      ORDER BY m.name, r.name
    `, [cycleId, companyId]);

    // Group by manager to make it clean for the dashboard
    const managers = {};
    rows.forEach(row => {
      if (!managers[row.manager_id]) {
        managers[row.manager_id] = {
          id: row.manager_id,
          name: row.manager_name,
          email: row.manager_email,
          totalReports: 0,
          submittedReports: 0,
          pendingReports: []
        };
      }

      const mgr = managers[row.manager_id];
      mgr.totalReports++;

      const status = row.feedback_status || 'not_started';
      if (status === 'submitted') {
        mgr.submittedReports++;
      } else {
        mgr.pendingReports.push({
          id: row.report_id,
          name: row.report_name,
          email: row.report_email,
          status: status // 'draft' or 'not_started'
        });
      }
    });

    res.json(Object.values(managers));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize database and start server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database on server start:', err);
  });
