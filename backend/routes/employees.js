const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM employees WHERE is_active = 1 ORDER BY name').all());
});

router.get('/all', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM employees ORDER BY name').all());
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  res.json(emp);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name, employee_id, role, department, joining_date, base_salary, bank_account, bank_name, ifsc_code, phone, email, pay_type, per_visit_rate } = req.body;
  if (!name || !employee_id || !role) return res.status(400).json({ error: 'Name, employee ID, and role are required' });
  try {
    const result = db.prepare(`
      INSERT INTO employees (name, employee_id, role, department, joining_date, base_salary, bank_account, bank_name, ifsc_code, phone, email, pay_type, per_visit_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, employee_id, role, department || null, joining_date || null, base_salary || 0, bank_account || null, bank_name || null, ifsc_code || null, phone || null, email || null, pay_type || 'monthly', per_visit_rate || 0);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Employee ID already exists' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, role, department, joining_date, base_salary, bank_account, bank_name, ifsc_code, phone, email, pay_type, per_visit_rate } = req.body;
  db.prepare(`
    UPDATE employees SET name=?, role=?, department=?, joining_date=?, base_salary=?, bank_account=?, bank_name=?, ifsc_code=?, phone=?, email=?, pay_type=?, per_visit_rate=?
    WHERE id=?
  `).run(name, role, department || null, joining_date || null, base_salary, bank_account || null, bank_name || null, ifsc_code || null, phone || null, email || null, pay_type, per_visit_rate, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE employees SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Attendance
router.get('/:id/attendance', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM attendance WHERE employee_id = ? ORDER BY year DESC, month DESC').all(req.params.id));
});

router.post('/:id/attendance', (req, res) => {
  const db = getDb();
  const { month, year, days_present, lop_days } = req.body;
  try {
    // Check if exists
    const existing = db.prepare('SELECT id FROM attendance WHERE employee_id = ? AND month = ? AND year = ?').get(req.params.id, month, year);
    if (existing) {
      db.prepare('UPDATE attendance SET days_present=?, lop_days=? WHERE employee_id=? AND month=? AND year=?').run(days_present, lop_days || 0, req.params.id, month, year);
    } else {
      db.prepare('INSERT INTO attendance (employee_id, month, year, days_present, lop_days) VALUES (?, ?, ?, ?, ?)').run(req.params.id, month, year, days_present, lop_days || 0);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Advances
router.get('/:id/advances', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM advances WHERE employee_id = ? ORDER BY request_date DESC').all(req.params.id));
});

router.post('/:id/advances', (req, res) => {
  const db = getDb();
  const { request_date, amount, reason, month, year } = req.body;
  const result = db.prepare('INSERT INTO advances (employee_id, request_date, amount, reason, month, year) VALUES (?, ?, ?, ?, ?, ?)').run(req.params.id, request_date, amount, reason || null, month || null, year || null);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/advances/:advId/settle', (req, res) => {
  const db = getDb();
  const { repaid_amount, repaid_date } = req.body;
  const adv = db.prepare('SELECT * FROM advances WHERE id = ?').get(req.params.advId);
  if (!adv) return res.status(404).json({ error: 'Advance not found' });
  const totalRepaid = (adv.repaid_amount || 0) + repaid_amount;
  const status = totalRepaid >= adv.amount ? 'settled' : 'partial';
  db.prepare('UPDATE advances SET repaid_amount=?, repaid_date=?, repayment_status=? WHERE id=?').run(totalRepaid, repaid_date, status, req.params.advId);
  res.json({ success: true });
});

module.exports = router;
