const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Barcha rejalarni ko'rsatish (2 haftalik / 1 oylik / 2 oylik)
router.get('/plans', (req, res) => {
  const data = db.get();
  res.json(data.plans);
});

// Foydalanuvchining joriy obunasi holati
router.get('/status', requireAuth, (req, res) => {
  const data = db.get();
  const activeSub = data.subscriptions.find(
    s => s.user_id === req.user.id && s.status === 'active' && new Date(s.expires_at) > new Date()
  );
  res.json({ is_pro: !!activeSub, subscription: activeSub || null });
});

module.exports = router;
