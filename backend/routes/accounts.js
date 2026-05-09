const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

function padMonth(m) { return String(m).padStart(2, '0'); }

router.get('/monthly-summary/:month/:year', (req, res) => {
  const db = getDb();
  const { month, year } = req.params;
  const m = +month; const y = +year;

  const salaryRows = db.prepare(`SELECT status, SUM(net_payable) as total FROM salary_records WHERE month=? AND year=? GROUP BY status`).all(m, y);
  let salary_paid = 0, salary_pending = 0;
  for (const r of salaryRows) {
    if (r.status === 'paid') salary_paid = r.total || 0;
    else salary_pending += r.total || 0;
  }

  const mm = padMonth(m);
  const vpRows = db.prepare(`SELECT SUM(amount) as total FROM vendor_payments WHERE payment_date LIKE ?`).get(`${y}-${mm}-%`);
  const vendor_paid = vpRows?.total || 0;

  const byRole = db.prepare(`SELECT e.role, COUNT(*) as count, SUM(sr.net_payable) as total_payable FROM salary_records sr JOIN employees e ON sr.employee_id = e.id WHERE sr.month=? AND sr.year=? GROUP BY e.role`).all(m, y);

  const allVendors = db.prepare(`SELECT v.contact_category, COUNT(*) as vendor_count FROM vendors v WHERE v.is_active=1 GROUP BY v.contact_category`).all();
  const vendorPayByCategory = db.prepare(`SELECT v.contact_category, SUM(vp.amount) as total_paid FROM vendor_payments vp JOIN vendors v ON vp.vendor_id = v.id WHERE vp.payment_date LIKE ? GROUP BY v.contact_category`).all(`${y}-${mm}-%`);
  const catMap = Object.fromEntries(vendorPayByCategory.map(r => [r.contact_category, r.total_paid || 0]));
  const by_vendor_category = allVendors.map(v => ({ contact_category: v.contact_category, vendor_count: v.vendor_count, total_paid: catMap[v.contact_category] || 0 }));

  res.json({ salary_paid, salary_pending, vendor_paid, total_outflow: salary_paid + vendor_paid, by_role: byRole, by_vendor_category });
});

router.get('/pending-advances', (req, res) => {
  const db = getDb();
  const emp_advances = db.prepare(`SELECT a.*, e.name as employee_name, e.role, e.department FROM advances a JOIN employees e ON a.employee_id = e.id WHERE a.repayment_status IN ('pending','partial') ORDER BY a.request_date DESC`).all();
  const vendor_advances = db.prepare(`SELECT vi.*, v.name as vendor_name, v.contact_category FROM vendor_invoices vi JOIN vendors v ON vi.vendor_id = v.id WHERE vi.advance_paid > 0 AND vi.status != 'paid' ORDER BY vi.invoice_date DESC`).all();
  res.json({ employee_advances: emp_advances, vendor_advances });
});

router.get('/alerts', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const overdue_invoices = db.prepare(`SELECT vi.*, v.name as vendor_name, v.contact_category FROM vendor_invoices vi JOIN vendors v ON vi.vendor_id = v.id WHERE vi.status != 'paid' AND vi.due_date IS NOT NULL AND vi.due_date < ? ORDER BY vi.due_date ASC`).all(today);
  const high_advances = db.prepare(`SELECT a.*, e.name as employee_name, e.role, e.base_salary, ROUND((a.amount - a.repaid_amount) * 100.0 / e.base_salary, 1) as advance_pct FROM advances a JOIN employees e ON a.employee_id = e.id WHERE a.repayment_status IN ('pending','partial') AND (a.amount - a.repaid_amount) > e.base_salary * 0.5`).all();
  res.json({ overdue_invoices, high_advances });
});

router.get('/payment-history', (req, res) => {
  const db = getDb();
  const { type, filter, month, year } = req.query;

  if (type === 'staff') {
    let sql = `SELECT sr.*, e.name, e.role, e.department, e.employee_id as emp_code FROM salary_records sr JOIN employees e ON sr.employee_id = e.id WHERE 1=1`;
    const params = [];
    if (filter) { sql += ' AND e.role = ?'; params.push(filter); }
    if (month) { sql += ' AND sr.month = ?'; params.push(+month); }
    if (year) { sql += ' AND sr.year = ?'; params.push(+year); }
    sql += ' ORDER BY sr.year DESC, sr.month DESC, e.name';
    return res.json(db.prepare(sql).all(...params));
  }

  if (type === 'vendor') {
    let sql = `SELECT vp.*, v.name as vendor_name, v.contact_category, vi.invoice_number, vi.total_amount FROM vendor_payments vp JOIN vendors v ON vp.vendor_id = v.id JOIN vendor_invoices vi ON vp.invoice_id = vi.id WHERE 1=1`;
    const params = [];
    if (filter) { sql += ' AND v.contact_category = ?'; params.push(filter); }
    if (month && year) { sql += ' AND vp.payment_date LIKE ?'; params.push(`${year}-${padMonth(month)}-%`); }
    sql += ' ORDER BY vp.payment_date DESC';
    return res.json(db.prepare(sql).all(...params));
  }

  res.json([]);
});

router.get('/export/:month/:year', (req, res) => {
  const db = getDb();
  const { month, year } = req.params;
  const mm = padMonth(month);
  const salaries = db.prepare(`SELECT e.name, e.employee_id as emp_code, e.role, e.department, sr.base_salary, sr.days_worked, sr.gross_salary, sr.incentive, sr.advance_deduction, sr.other_deduction, sr.net_payable, sr.payment_mode, sr.status, sr.payment_date FROM salary_records sr JOIN employees e ON sr.employee_id = e.id WHERE sr.month=? AND sr.year=? ORDER BY e.name`).all(+month, +year);
  const vendor_payments = db.prepare(`SELECT v.name as vendor_name, v.contact_category, vi.invoice_number, vi.invoice_date, vi.total_amount, vi.advance_paid, vi.remaining_balance, vi.status, vp.payment_date, vp.amount as paid_amount, vp.payment_mode FROM vendor_payments vp JOIN vendor_invoices vi ON vp.invoice_id = vi.id JOIN vendors v ON vp.vendor_id = v.id WHERE vp.payment_date LIKE ? ORDER BY v.name`).all(`${year}-${mm}-%`);
  res.json({ salaries, vendor_payments, month, year });
});

module.exports = router;
