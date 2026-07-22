# Performify - Performance Evaluation Tool

Performify is a multi-tenant monthly performance evaluation tool designed for manager-to-employee feedback across 5 fixed parameters:
1. **Ownership**
2. **Communication**
3. **Quality of Work**
4. **Teamwork**
5. **Initiative**

This pilot application demonstrates how the data model and application workflows support different company hierarchies, detailed reporting lines, draft/submit statuses, and HR tracking.

---

## 🛠️ Data Model & Scenario Alignment

The system uses an **SQLite Relational Database** which guarantees data integrity, relational constraints, and efficient query execution. Here is how the schema maps to the pilot requirements:

### 1. Ashoka Textiles (Hierarchical Setup)
* **Scenario**: Priya gives feedback to her 6 team members. Priya herself reports to Rohan, who reports to the COO.
* **Database Alignment**: 
  - The `users` table utilizes a self-referencing relationship `manager_id REFERENCES users(id)`.
  - For Ashoka Textiles:
    - **6 Employees** have `manager_id = 'priya_mgr'`.
    - **Priya** has `manager_id = 'rohan_mgr'`.
    - **Rohan** has `manager_id = 'coo_alok'`.
    - **Alok (COO)** has `manager_id = NULL`.
  - This allows arbitrary depths of hierarchical reporting lines.

### 2. Bright Path Consulting (Flat Setup)
* **Scenario**: The founder gives feedback directly to 8 people with no middle management layers.
* **Database Alignment**:
  - The founder (**Sanjay**) has `manager_id = NULL`.
  - All **8 Employees** have `manager_id = 'sanjay_founder'`.
  - Because the manager relation is defined dynamically on the user row, the system easily accommodates both flat and deep reporting hierarchies without requiring any schema changes.

### 3. HR Lead (Kavita) - Submission Tracking
* **Scenario**: Kavita wants to track each month who hasn't submitted feedback for their team.
* **Database Alignment**:
  - A manager is defined as any user who has one or more direct reports (i.e. is referenced by another user's `manager_id`).
  - HR tracking utilizes a `LEFT OUTER JOIN` between the active reporting lines and the `feedbacks` table for the selected cycle.
  - **SQL Query**:
    ```sql
    SELECT 
      m.id AS manager_id, m.name AS manager_name, m.email AS manager_email,
      r.id AS report_id, r.name AS report_name, r.email AS report_email,
      f.status AS feedback_status, f.submitted_at AS feedback_submitted_at
    FROM users m
    JOIN users r ON r.manager_id = m.id
    LEFT JOIN feedbacks f ON f.reviewer_id = m.id AND f.reviewee_id = r.id AND f.cycle_id = :cycleId
    WHERE m.company_id = :companyId
    ```
  - If `feedback_status` is `NULL`, the review is **Not Started**.
  - If it is `'draft'`, the review is in **Draft** state.
  - If it is `'submitted'`, the review is **Completed**.
  - Kavita can see exactly which employees are still pending feedback for every manager in the company.

### 4. Employee Performance History Trends
* **Scenario**: Employees want to track their scores per parameter over the past few months.
* **Database Alignment**:
  - The `feedbacks` table tracks submissions by `cycle_id` (e.g. `'2026-05'`, `'2026-06'`, `'2026-07'`).
  - The `feedback_details` table stores the `score` and `comment` for each `parameter_id`.
  - Querying `WHERE reviewee_id = :userId AND status = 'submitted'` retrieves the scores ordered by cycle date. The frontend renders these as interactive monthly trend bars with comment history cards.

---

## 💡 Assumptions Made

1. **Self-Evaluations**: Employees do not perform self-evaluations. Only managers evaluate their direct reports.
2. **Evaluation Cycle**: A cycle represents a calendar month. Only one evaluation per reviewer-reviewee pair is allowed in a single cycle (enforced by a `UNIQUE(cycle_id, reviewer_id, reviewee_id)` constraint).
3. **Visibility**: Feedback scores and comments only become visible to the employee *after* the manager changes the feedback status from `'draft'` to `'submitted'` (locking it from further edits).
4. **HR Role**: The HR lead (Kavita) belongs to a company (`ashoka`) but has access to the missing feedback reports dashboard. In this pilot, the HR dashboard lets Kavita select either company to examine.
5. **Authentication**: For pilot convenience, the login page features a **Quick Demo Login** section showing key users. Standard email and password sign-in is also supported. (Default password: `password123`).

---

## 🚀 Getting Started

### 📋 Prerequisites
* [Node.js](https://nodejs.org/) (v16 or higher)
* npm (v8 or higher)

### 📦 Installation
From the repository root, install dependencies for both the frontend and backend:
```bash
npm run install-all
```

### 🗄️ Database Seeding
Initialize the SQLite schema and populate it with historical data for May, June, and July:
```bash
npm run seed
```

### 💻 Running the Application
To run the backend API server (port 5000) and frontend development server (port 3000) concurrently:
```bash
npm start
```
Once started, open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Demo Logins
Feel free to click the Quick Login buttons on the login screen, or type the following credentials (Password is `password123` for all):

| User | Email | Role / Purpose |
| --- | --- | --- |
| **Kavita** | `kavita@ashoka.com` | **HR Lead** (Tracks missing feedback submissions) |
| **Priya** | `priya@ashoka.com` | **Manager** (Evaluates 6 reports; gets feedback from Rohan) |
| **Rohan** | `rohan@ashoka.com` | **Manager** (Evaluates Priya; reports to COO) |
| **Alok** | `alok@ashoka.com` | **COO** (Rohan reports to Alok) |
| **Sanjay** | `sanjay@brightpath.com` | **Founder** (Bright Path; evaluates 8 reports directly) |
| **Amit Kumar** | `amit@ashoka.com` | **Employee** (Priya's team; views historical trend charts) |
| **Rahul Sen** | `rahul@brightpath.com` | **Employee** (Sanjay's team; views historical reviews) |
