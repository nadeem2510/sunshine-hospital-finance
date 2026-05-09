const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'sunshine_finance.db');

let _sqlDb = null;

function save() {
  const data = _sqlDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function createWrapper(sqlDb) {
  _sqlDb = sqlDb;

  return {
    prepare: (sql) => ({
      run: (...params) => {
        sqlDb.run(sql, params.map(p => p === undefined ? null : p));
        save();
        try {
          const r = sqlDb.exec('SELECT last_insert_rowid()');
          return { lastInsertRowid: r[0]?.values[0][0] ?? null, changes: 1 };
        } catch { return { lastInsertRowid: null, changes: 1 }; }
      },
      get: (...params) => {
        try {
          const res = sqlDb.exec(sql, params.map(p => p === undefined ? null : p));
          if (!res.length || !res[0].values.length) return undefined;
          const cols = res[0].columns;
          return Object.fromEntries(cols.map((c, i) => [c, res[0].values[0][i]]));
        } catch { return undefined; }
      },
      all: (...params) => {
        try {
          const res = sqlDb.exec(sql, params.map(p => p === undefined ? null : p));
          if (!res.length) return [];
          const cols = res[0].columns;
          return res[0].values.map(row => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
        } catch { return []; }
      }
    }),
    exec: (sql) => { sqlDb.run(sql); save(); }
  };
}

let db = null;

async function initializeDatabase() {
  const SQL = await initSqlJs();

  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  db = createWrapper(sqlDb);

  // Create tables one at a time to avoid sql.js multi-statement issues
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'staff', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS employees (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, employee_id TEXT UNIQUE NOT NULL, role TEXT NOT NULL, department TEXT, joining_date DATE, base_salary REAL NOT NULL DEFAULT 0, bank_account TEXT, bank_name TEXT, ifsc_code TEXT, phone TEXT, email TEXT, pay_type TEXT NOT NULL DEFAULT 'monthly', per_visit_rate REAL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, month INTEGER NOT NULL, year INTEGER NOT NULL, days_present REAL NOT NULL DEFAULT 0, lop_days REAL NOT NULL DEFAULT 0, UNIQUE(employee_id, month, year))`,
    `CREATE TABLE IF NOT EXISTS advances (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, request_date DATE NOT NULL, amount REAL NOT NULL, reason TEXT, repayment_status TEXT NOT NULL DEFAULT 'pending', repaid_amount REAL NOT NULL DEFAULT 0, repaid_date DATE, month INTEGER, year INTEGER)`,
    `CREATE TABLE IF NOT EXISTS salary_records (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, month INTEGER NOT NULL, year INTEGER NOT NULL, base_salary REAL NOT NULL, days_worked REAL NOT NULL, gross_salary REAL NOT NULL, advance_deduction REAL NOT NULL DEFAULT 0, incentive REAL NOT NULL DEFAULT 0, other_deduction REAL NOT NULL DEFAULT 0, net_payable REAL NOT NULL, payment_date DATE, payment_mode TEXT, status TEXT NOT NULL DEFAULT 'draft', notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(employee_id, month, year))`,
    `CREATE TABLE IF NOT EXISTS vendors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, contact_category TEXT NOT NULL, contact_person TEXT, phone TEXT, email TEXT, address TEXT, gst_number TEXT, bank_account TEXT, bank_name TEXT, ifsc_code TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS vendor_invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, vendor_id INTEGER NOT NULL, invoice_number TEXT NOT NULL, invoice_date DATE NOT NULL, due_date DATE, total_amount REAL NOT NULL, advance_paid REAL NOT NULL DEFAULT 0, remaining_balance REAL NOT NULL, status TEXT NOT NULL DEFAULT 'unpaid', description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS vendor_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL, vendor_id INTEGER NOT NULL, payment_date DATE NOT NULL, amount REAL NOT NULL, payment_mode TEXT NOT NULL, reference_number TEXT, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`
  ];

  for (const sql of tables) {
    _sqlDb.run(sql);
  }

  // Migrations — add columns that didn't exist in earlier schema
  const migrations = [
    'ALTER TABLE salary_records ADD COLUMN paid_amount REAL DEFAULT 0',
  ];
  for (const m of migrations) {
    try { _sqlDb.run(m); } catch (_) {}
  }

  save();

  // Seed default users
  const adminExists = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
  if (!adminExists) {
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run('admin', 'sunshine@2024', 'admin');
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run('staff', 'staff@123', 'staff');
  }

  console.log('Database ready at', DB_PATH);
}

function getDb() { return db; }

module.exports = { initializeDatabase, getDb };
