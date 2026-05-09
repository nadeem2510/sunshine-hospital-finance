const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM vendors WHERE is_active = 1 ORDER BY name').all());
});

router.get('/:id', (req, res) => {
  const db = getDb();
  if (isNaN(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(+req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  res.json(vendor);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name, contact_category, contact_person, phone, email, address, gst_number, bank_account, bank_name, ifsc_code } = req.body;
  if (!name || !contact_category) return res.status(400).json({ error: 'Name and category are required' });
  const result = db.prepare(`INSERT INTO vendors (name, contact_category, contact_person, phone, email, address, gst_number, bank_account, bank_name, ifsc_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(name, contact_category, contact_person || null, phone || null, email || null, address || null, gst_number || null, bank_account || null, bank_name || null, ifsc_code || null);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, contact_category, contact_person, phone, email, address, gst_number, bank_account, bank_name, ifsc_code } = req.body;
  db.prepare(`UPDATE vendors SET name=?, contact_category=?, contact_person=?, phone=?, email=?, address=?, gst_number=?, bank_account=?, bank_name=?, ifsc_code=? WHERE id=?`)
    .run(name, contact_category, contact_person || null, phone || null, email || null, address || null, gst_number || null, bank_account || null, bank_name || null, ifsc_code || null, +req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE vendors SET is_active = 0 WHERE id = ?').run(+req.params.id);
  res.json({ success: true });
});

// Invoices - must be before /:id routes
router.get('/invoices/:invoiceId/payments', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM vendor_payments WHERE invoice_id = ? ORDER BY payment_date DESC').all(+req.params.invoiceId));
});

router.post('/invoices/:invoiceId/payments', (req, res) => {
  const db = getDb();
  const { vendor_id, payment_date, amount, payment_mode, reference_number, notes } = req.body;
  const invoice = db.prepare('SELECT * FROM vendor_invoices WHERE id = ?').get(+req.params.invoiceId);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  db.prepare(`INSERT INTO vendor_payments (invoice_id, vendor_id, payment_date, amount, payment_mode, reference_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(+req.params.invoiceId, vendor_id || invoice.vendor_id, payment_date, +amount, payment_mode, reference_number || null, notes || null);

  const newRemaining = invoice.remaining_balance - +amount;
  const status = newRemaining <= 0 ? 'paid' : 'partial';
  db.prepare('UPDATE vendor_invoices SET remaining_balance=?, status=? WHERE id=?').run(Math.max(0, newRemaining), status, +req.params.invoiceId);

  res.json({ success: true });
});

router.put('/invoices/:invoiceId', (req, res) => {
  const db = getDb();
  const { invoice_number, invoice_date, due_date, total_amount, advance_paid, description } = req.body;
  const remaining = (+total_amount || 0) - (+advance_paid || 0);
  const status = remaining <= 0 ? 'paid' : advance_paid > 0 ? 'partial' : 'unpaid';
  db.prepare(`UPDATE vendor_invoices SET invoice_number=?, invoice_date=?, due_date=?, total_amount=?, advance_paid=?, remaining_balance=?, status=?, description=? WHERE id=?`)
    .run(invoice_number, invoice_date, due_date || null, +total_amount, +advance_paid || 0, remaining, status, description || null, +req.params.invoiceId);
  res.json({ success: true });
});

router.get('/:id/invoices', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM vendor_invoices WHERE vendor_id = ? ORDER BY invoice_date DESC').all(+req.params.id));
});

router.post('/:id/invoices', (req, res) => {
  const db = getDb();
  const { invoice_number, invoice_date, due_date, total_amount, advance_paid, description } = req.body;
  const remaining = (+total_amount || 0) - (+advance_paid || 0);
  const status = remaining <= 0 ? 'paid' : +advance_paid > 0 ? 'partial' : 'unpaid';
  try {
    const result = db.prepare(`INSERT INTO vendor_invoices (vendor_id, invoice_number, invoice_date, due_date, total_amount, advance_paid, remaining_balance, status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(+req.params.id, invoice_number, invoice_date, due_date || null, +total_amount, +advance_paid || 0, remaining, status, description || null);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
