const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

router.get('/', (req, res) => {
  const db = getDb();
  const { month, year } = req.query;
  let sql = `SELECT sr.*, e.name, e.employee_id as emp_code, e.role, e.department FROM salary_records sr JOIN employees e ON sr.employee_id = e.id`;
  const params = [];
  if (month && year) { sql += ' WHERE sr.month = ? AND sr.year = ?'; params.push(+month, +year); }
  sql += ' ORDER BY e.name';
  res.json(db.prepare(sql).all(...params));
});

router.get('/summary/:month/:year', (req, res) => {
  const db = getDb();
  const { month, year } = req.params;
  const rows = db.prepare(`SELECT status, COUNT(*) as cnt, SUM(gross_salary) as gross, SUM(net_payable) as net, SUM(advance_deduction) as adv, SUM(incentive) as inc FROM salary_records WHERE month=? AND year=? GROUP BY status`).all(+month, +year);
  let summary = { total_employees: 0, total_gross: 0, total_net: 0, total_advance_deduction: 0, total_incentives: 0, total_paid: 0, total_pending: 0 };
  for (const r of rows) {
    summary.total_employees += r.cnt;
    summary.total_gross += r.gross || 0;
    summary.total_net += r.net || 0;
    summary.total_advance_deduction += r.adv || 0;
    summary.total_incentives += r.inc || 0;
    if (r.status === 'paid') summary.total_paid += r.net || 0;
    else summary.total_pending += r.net || 0;
  }
  res.json(summary);
});

router.get('/:employeeId/:month/:year', (req, res) => {
  const db = getDb();
  const { employeeId, month, year } = req.params;
  const record = db.prepare(`SELECT sr.*, e.name, e.employee_id as emp_code, e.role, e.department, e.base_salary, e.bank_account, e.bank_name FROM salary_records sr JOIN employees e ON sr.employee_id = e.id WHERE sr.employee_id = ? AND sr.month = ? AND sr.year = ?`).get(+employeeId, +month, +year);
  res.json(record || null);
});

router.post('/calculate', (req, res) => {
  const db = getDb();
  const { employee_id, month, year, days_worked, advance_deduction, incentive, other_deduction, notes } = req.body;
  const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(+employee_id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  const gross_salary = parseFloat(((emp.base_salary / 30) * +days_worked).toFixed(2));
  const net_payable = parseFloat((gross_salary + (+incentive || 0) - (+advance_deduction || 0) - (+other_deduction || 0)).toFixed(2));

  try {
    const existing = db.prepare('SELECT id FROM salary_records WHERE employee_id=? AND month=? AND year=?').get(+employee_id, +month, +year);
    if (existing) {
      db.prepare(`UPDATE salary_records SET base_salary=?, days_worked=?, gross_salary=?, advance_deduction=?, incentive=?, other_deduction=?, net_payable=?, notes=? WHERE employee_id=? AND month=? AND year=?`)
        .run(emp.base_salary, +days_worked, gross_salary, +advance_deduction || 0, +incentive || 0, +other_deduction || 0, net_payable, notes || null, +employee_id, +month, +year);
    } else {
      db.prepare(`INSERT INTO salary_records (employee_id, month, year, base_salary, days_worked, gross_salary, advance_deduction, incentive, other_deduction, net_payable, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`)
        .run(+employee_id, +month, +year, emp.base_salary, +days_worked, gross_salary, +advance_deduction || 0, +incentive || 0, +other_deduction || 0, net_payable, notes || null);
    }
    const record = db.prepare('SELECT * FROM salary_records WHERE employee_id=? AND month=? AND year=?').get(+employee_id, +month, +year);
    res.json({ success: true, record, employee: emp });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/pay', (req, res) => {
  const db = getDb();
  const { payment_date, payment_mode } = req.body;
  db.prepare('UPDATE salary_records SET status=?, payment_date=?, payment_mode=? WHERE id=?').run('paid', payment_date, payment_mode, +req.params.id);
  res.json({ success: true });
});

module.exports = router;
