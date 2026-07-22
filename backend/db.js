const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const hashPassword = (password) => {
  return bcrypt.hashSync(password, 8);
};

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

async function initDb(forceSeed = false) {
  // Check if tables already exist
  const tableCheck = await getQuery("SELECT name FROM sqlite_master WHERE type='table' AND name='companies'");
  
  if (tableCheck && !forceSeed) {
    console.log('Database already exists. Skipping initialization.');
    return;
  }

  console.log('Initializing database schema...');

  // Enable foreign keys
  await runQuery('PRAGMA foreign_keys = ON;');

  // Drop tables if forcing seed
  if (forceSeed) {
    await runQuery('DROP TABLE IF EXISTS feedback_details;');
    await runQuery('DROP TABLE IF EXISTS feedbacks;');
    await runQuery('DROP TABLE IF EXISTS feedback_cycles;');
    await runQuery('DROP TABLE IF EXISTS parameters;');
    await runQuery('DROP TABLE IF EXISTS users;');
    await runQuery('DROP TABLE IF EXISTS companies;');
  }

  // Create tables
  await runQuery(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      company_id TEXT NOT NULL,
      manager_id TEXT,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (manager_id) REFERENCES users(id)
    );
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS parameters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL
    );
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS feedback_cycles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL
    );
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS feedbacks (
      id TEXT PRIMARY KEY,
      cycle_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      reviewee_id TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      submitted_at TEXT,
      FOREIGN KEY (cycle_id) REFERENCES feedback_cycles(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id),
      FOREIGN KEY (reviewee_id) REFERENCES users(id),
      UNIQUE(cycle_id, reviewer_id, reviewee_id)
    );
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS feedback_details (
      id TEXT PRIMARY KEY,
      feedback_id TEXT NOT NULL,
      parameter_id TEXT NOT NULL,
      score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
      comment TEXT NOT NULL,
      FOREIGN KEY (feedback_id) REFERENCES feedbacks(id) ON DELETE CASCADE,
      FOREIGN KEY (parameter_id) REFERENCES parameters(id)
    );
  `);

  console.log('Seeding initial data...');

  // Seed Companies
  await runQuery(`INSERT INTO companies (id, name) VALUES ('ashoka', 'Ashoka Textiles')`);
  await runQuery(`INSERT INTO companies (id, name) VALUES ('brightpath', 'Bright Path Consulting')`);

  // Seed Parameters
  const parameters = [
    { id: 'ownership', name: 'Ownership', desc: 'Takes responsibility for outcomes, acts proactively, and follows through on commitments.' },
    { id: 'communication', name: 'Communication', desc: 'Expresses ideas clearly, listens actively, and collaborates effectively with team members.' },
    { id: 'quality_of_work', name: 'Quality of Work', desc: 'Delivers accurate, thorough, and high-standard output with attention to detail.' },
    { id: 'teamwork', name: 'Teamwork', desc: 'Supports colleagues, contributes positively to team dynamics, and shares knowledge.' },
    { id: 'initiative', name: 'Initiative', desc: 'Identifies opportunities for improvement, learns new skills, and drives solutions.' }
  ];
  for (const p of parameters) {
    await runQuery(`INSERT INTO parameters (id, name, description) VALUES (?, ?, ?)`, [p.id, p.name, p.desc]);
  }

  // Seed Cycles
  const cycles = [
    { id: '2026-05', name: 'May 2026', start: '2026-05-01', end: '2026-05-31' },
    { id: '2026-06', name: 'June 2026', start: '2026-06-01', end: '2026-06-30' },
    { id: '2026-07', name: 'July 2026', start: '2026-07-01', end: '2026-07-31' }
  ];
  for (const c of cycles) {
    await runQuery(`INSERT INTO feedback_cycles (id, name, start_date, end_date) VALUES (?, ?, ?, ?)`, [c.id, c.name, c.start, c.end]);
  }

  // Seed Users
  const defaultPwHash = hashPassword('password123');

  // Ashoka Textiles users
  const ashokaUsers = [
    { id: 'coo_alok', name: 'Alok (COO)', email: 'alok@ashoka.com', role: 'coo', mgr: null },
    { id: 'rohan_mgr', name: 'Rohan', email: 'rohan@ashoka.com', role: 'manager', mgr: 'coo_alok' },
    { id: 'priya_mgr', name: 'Priya', email: 'priya@ashoka.com', role: 'manager', mgr: 'rohan_mgr' },
    { id: 'kavita_hr', name: 'Kavita (HR Lead)', email: 'kavita@ashoka.com', role: 'hr', mgr: null },
    // Priya's 6 team members
    { id: 'amit_emp', name: 'Amit Kumar', email: 'amit@ashoka.com', role: 'employee', mgr: 'priya_mgr' },
    { id: 'sunita_emp', name: 'Sunita Sharma', email: 'sunita@ashoka.com', role: 'employee', mgr: 'priya_mgr' },
    { id: 'vikram_emp', name: 'Vikram Singh', email: 'vikram@ashoka.com', role: 'employee', mgr: 'priya_mgr' },
    { id: 'neha_emp', name: 'Neha Gupta', email: 'neha@ashoka.com', role: 'employee', mgr: 'priya_mgr' },
    { id: 'rajesh_emp', name: 'Rajesh Patel', email: 'rajesh@ashoka.com', role: 'employee', mgr: 'priya_mgr' },
    { id: 'deepa_emp', name: 'Deepa Nair', email: 'deepa@ashoka.com', role: 'employee', mgr: 'priya_mgr' }
  ];

  for (const u of ashokaUsers) {
    await runQuery(
      `INSERT INTO users (id, name, email, password_hash, role, company_id, manager_id) VALUES (?, ?, ?, ?, ?, 'ashoka', ?)`,
      [u.id, u.name, u.email, defaultPwHash, u.role, u.mgr]
    );
  }

  // Bright Path Consulting users
  const bpUsers = [
    { id: 'sanjay_founder', name: 'Sanjay (Founder)', email: 'sanjay@brightpath.com', role: 'founder', mgr: null },
    // 8 direct reports
    { id: 'rahul_bp', name: 'Rahul Sen', email: 'rahul@brightpath.com', role: 'employee', mgr: 'sanjay_founder' },
    { id: 'anjali_bp', name: 'Anjali Das', email: 'anjali@brightpath.com', role: 'employee', mgr: 'sanjay_founder' },
    { id: 'karan_bp', name: 'Karan Malhotra', email: 'karan@brightpath.com', role: 'employee', mgr: 'sanjay_founder' },
    { id: 'pooja_bp', name: 'Pooja Joshi', email: 'pooja@brightpath.com', role: 'employee', mgr: 'sanjay_founder' },
    { id: 'sameer_bp', name: 'Sameer Verma', email: 'sameer@brightpath.com', role: 'employee', mgr: 'sanjay_founder' },
    { id: 'ritu_bp', name: 'Ritu Kapoor', email: 'ritu@brightpath.com', role: 'employee', mgr: 'sanjay_founder' },
    { id: 'dev_bp', name: 'Dev Adhikari', email: 'dev@brightpath.com', role: 'employee', mgr: 'sanjay_founder' },
    { id: 'meera_bp', name: 'Meera Iyer', email: 'meera@brightpath.com', role: 'employee', mgr: 'sanjay_founder' }
  ];

  for (const u of bpUsers) {
    await runQuery(
      `INSERT INTO users (id, name, email, password_hash, role, company_id, manager_id) VALUES (?, ?, ?, ?, ?, 'brightpath', ?)`,
      [u.id, u.name, u.email, defaultPwHash, u.role, u.mgr]
    );
  }

  // Seed Historical Feedbacks for May 2026 (2026-05) - All complete
  console.log('Seeding feedback for May 2026...');
  
  // Rohan -> Priya (May)
  await seedFeedback('2026-05', 'rohan_mgr', 'priya_mgr', {
    ownership: { score: 4, comment: 'Priya showed strong ownership of the summer production scheduling.' },
    communication: { score: 4, comment: 'Communicated risks in fiber delivery very early.' },
    quality_of_work: { score: 5, comment: 'Output reports were flawless and well-analyzed.' },
    teamwork: { score: 4, comment: 'Supported other department heads during planning.' },
    initiative: { score: 4, comment: 'Proposed a new waste reduction method.' }
  });

  // Priya -> 6 Team Members (May)
  const priyaReports = ['amit_emp', 'sunita_emp', 'vikram_emp', 'neha_emp', 'rajesh_emp', 'deepa_emp'];
  const scoresPriyaMay = [
    { ownership: 4, communication: 3, quality_of_work: 4, teamwork: 5, initiative: 3 }, // amit
    { ownership: 5, communication: 5, quality_of_work: 5, teamwork: 4, initiative: 4 }, // sunita
    { ownership: 3, communication: 4, quality_of_work: 3, teamwork: 3, initiative: 4 }, // vikram
    { ownership: 4, communication: 4, quality_of_work: 4, teamwork: 4, initiative: 4 }, // neha
    { ownership: 5, communication: 4, quality_of_work: 5, teamwork: 5, initiative: 5 }, // rajesh
    { ownership: 3, communication: 3, quality_of_work: 4, teamwork: 4, initiative: 3 }  // deepa
  ];
  for (let i = 0; i < priyaReports.length; i++) {
    const report = priyaReports[i];
    const sc = scoresPriyaMay[i];
    await seedFeedback('2026-05', 'priya_mgr', report, {
      ownership: { score: sc.ownership, comment: `Good performance in ownership for May.` },
      communication: { score: sc.communication, comment: `Active communicator with the client.` },
      quality_of_work: { score: sc.quality_of_work, comment: `Consistent work quality on assignments.` },
      teamwork: { score: sc.teamwork, comment: `Very collaborative, helped team members resolve blockers.` },
      initiative: { score: sc.initiative, comment: `Took extra tasks when required.` }
    });
  }

  // Bright Path Sanjay -> 8 reports (May)
  const bpReports = ['rahul_bp', 'anjali_bp', 'karan_bp', 'pooja_bp', 'sameer_bp', 'ritu_bp', 'dev_bp', 'meera_bp'];
  for (const report of bpReports) {
    await seedFeedback('2026-05', 'sanjay_founder', report, {
      ownership: { score: 4, comment: 'Took ownership of client delivery milestones.' },
      communication: { score: 4, comment: 'Clear presentations during weekly standups.' },
      quality_of_work: { score: 4, comment: 'High quality slide decks and analytical insights.' },
      teamwork: { score: 4, comment: 'Engaged constructively in client brainstorming session.' },
      initiative: { score: 4, comment: 'Identified an automation opportunity in reports.' }
    });
  }

  // Seed Historical Feedbacks for June 2026 (2026-06) - Partially complete
  console.log('Seeding feedback for June 2026...');

  // Rohan -> Priya (June)
  await seedFeedback('2026-06', 'rohan_mgr', 'priya_mgr', {
    ownership: { score: 5, comment: 'Excellent leadership in handling the plant power failure emergency.' },
    communication: { score: 4, comment: 'Detailed daily status updates during recovery.' },
    quality_of_work: { score: 4, comment: 'Recovery plans were well structured.' },
    teamwork: { score: 5, comment: 'Collaborated with engineering to quickly restore operations.' },
    initiative: { score: 5, comment: 'Designed backup system protocols to avoid future outages.' }
  });

  // Priya -> 4 out of 6 team members (June) - Neha and Rajesh are missing!
  const priyaReportsJune = ['amit_emp', 'sunita_emp', 'vikram_emp', 'deepa_emp'];
  const scoresPriyaJune = [
    { ownership: 4, communication: 4, quality_of_work: 4, teamwork: 5, initiative: 4 }, // amit
    { ownership: 5, communication: 5, quality_of_work: 4, teamwork: 5, initiative: 5 }, // sunita
    { ownership: 4, communication: 3, quality_of_work: 4, teamwork: 3, initiative: 3 }, // vikram
    { ownership: 4, communication: 4, quality_of_work: 3, teamwork: 4, initiative: 3 }  // deepa
  ];
  for (let i = 0; i < priyaReportsJune.length; i++) {
    const report = priyaReportsJune[i];
    const sc = scoresPriyaJune[i];
    await seedFeedback('2026-06', 'priya_mgr', report, {
      ownership: { score: sc.ownership, comment: `Good performance in ownership for June.` },
      communication: { score: sc.communication, comment: `Proactive communication during team standups.` },
      quality_of_work: { score: sc.quality_of_work, comment: `High standards kept across deliverables.` },
      teamwork: { score: sc.teamwork, comment: `Reliable peer support and helpful behavior.` },
      initiative: { score: sc.initiative, comment: `Took charge of some sprint backlogs.` }
    });
  }

  // Sanjay -> 6 out of 8 reports (June) - Dev and Meera are missing!
  const bpReportsJune = ['rahul_bp', 'anjali_bp', 'karan_bp', 'pooja_bp', 'sameer_bp', 'ritu_bp'];
  for (const report of bpReportsJune) {
    await seedFeedback('2026-06', 'sanjay_founder', report, {
      ownership: { score: 5, comment: 'Took ownership of client delivery milestones.' },
      communication: { score: 4, comment: 'Clear presentations during weekly standups.' },
      quality_of_work: { score: 4, comment: 'High quality slide decks and analytical insights.' },
      teamwork: { score: 4, comment: 'Engaged constructively in client brainstorming session.' },
      initiative: { score: 5, comment: 'Identified an automation opportunity in reports.' }
    });
  }

  // Seed Draft Feedbacks for July 2026 (2026-07) - Some drafts, mostly missing
  console.log('Seeding draft feedback for July 2026...');

  // Priya -> Amit (July) - Draft
  await seedFeedback('2026-07', 'priya_mgr', 'amit_emp', {
    ownership: { score: 4, comment: 'Draft comment on Amit\'s July ownership...' },
    communication: { score: 4, comment: 'Draft comment on Amit\'s July communication...' },
    quality_of_work: { score: 4, comment: 'Draft comment on Amit\'s July quality of work...' },
    teamwork: { score: 4, comment: 'Draft comment on Amit\'s July teamwork...' },
    initiative: { score: 4, comment: 'Draft comment on Amit\'s July initiative...' }
  }, 'draft');

  console.log('Database seeding complete successfully.');
}

async function seedFeedback(cycleId, reviewerId, revieweeId, details, status = 'submitted') {
  const feedbackId = `${cycleId}_${reviewerId}_${revieweeId}`;
  const submittedAt = status === 'submitted' ? new Date().toISOString() : null;

  await runQuery(
    `INSERT INTO feedbacks (id, cycle_id, reviewer_id, reviewee_id, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [feedbackId, cycleId, reviewerId, revieweeId, status, submittedAt]
  );

  for (const paramId of Object.keys(details)) {
    const detailId = `${feedbackId}_${paramId}`;
    const item = details[paramId];
    await runQuery(
      `INSERT INTO feedback_details (id, feedback_id, parameter_id, score, comment) VALUES (?, ?, ?, ?, ?)`,
      [detailId, feedbackId, paramId, item.score, item.comment]
    );
  }
}

// Support running directly to seed
if (require.main === module) {
  const force = process.argv.includes('--seed') || process.argv.includes('--reset');
  initDb(force).catch(err => {
    console.error('Error seeding database:', err);
    process.exit(1);
  });
}

module.exports = {
  db,
  initDb,
  runQuery,
  allQuery,
  getQuery
};
