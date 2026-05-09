const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

router.post('/login', (req, res) => {
  const db = getDb();
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const user = db.prepare('SELECT id, username, role FROM users WHERE username = ? AND password = ?').get(username, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ success: true, user });
});

router.post('/change-password', (req, res) => {
  const db = getDb();
  const { username, oldPassword, newPassword } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE username = ? AND password = ?').get(username, oldPassword);
  if (!user) return res.status(401).json({ error: 'Invalid current password' });
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newPassword, user.id);
  res.json({ success: true });
});

module.exports = router;
