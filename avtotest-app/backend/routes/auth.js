const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { sendSms, generateCode } = require('../services/sms');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, phone: user.phone, is_admin: !!user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// ============ GOOGLE ORQALI KIRISH ============
// Frontend Google Identity Services orqali id_token oladi va bu yerga yuboradi
router.post('/google', async (req, res) => {
  try {
    const { id_token } = req.body;
    if (!id_token) return res.status(400).json({ error: 'id_token kerak' });

    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    const data = db.get();
    let user = data.users.find(u => u.google_id === googleId || u.email === email);

    if (!user) {
      user = {
        id: uuidv4(),
        name,
        email,
        picture,
        google_id: googleId,
        phone: null,
        phone_verified: false,
        is_admin: false,
        created_at: new Date().toISOString()
      };
      data.users.push(user);
      db.set(data);
    }

    const token = signToken(user);
    res.json({ token, user });
  } catch (e) {
    console.error(e);
    res.status(401).json({ error: 'Google orqali kirish muvaffaqiyatsiz' });
  }
});

// ============ TELEFON RAQAM ORQALI SMS KOD YUBORISH ============
const smsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 daqiqa
  max: 1,              // bitta raqamga 1 daqiqada 1 marta (IP bo'yicha, qo'shimcha himoya kerak bo'lsa phone bo'yicha ham cheklang)
  message: { error: "SMS juda tez-tez so'ralmoqda. 1 daqiqadan keyin qayta urinib ko'ring" }
});

router.post('/send-code', smsLimiter, async (req, res) => {
  try {
    const { phone } = req.body; // format: 998901234567
    if (!phone || !/^998\d{9}$/.test(phone)) {
      return res.status(400).json({ error: "Telefon raqam formati: 998901234567" });
    }

    const data = db.get();

    // Kuniga 5 martadan ko'p SMS yuborilmasin (soddalashtirilgan cheklov)
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = data.pending_codes.filter(c => c.phone === phone && c.created_date === today).length;
    if (todayCount >= 5) {
      return res.status(429).json({ error: "Bugun bu raqamga limit tugadi, ertaga urinib ko'ring" });
    }

    const code = generateCode();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 daqiqa

    // Eski kodlarni tozalab, yangisini qo'shamiz
    data.pending_codes = data.pending_codes.filter(c => c.phone !== phone);
    data.pending_codes.push({ phone, code, expires_at: expiresAt, created_date: today });
    db.set(data);

    // ESKIZ sozlanmagan bo'lsa (development uchun) - konsolga chiqaramiz
    if (!process.env.ESKIZ_EMAIL || process.env.ESKIZ_EMAIL.includes('example')) {
      console.log(`[DEV MODE] ${phone} uchun SMS kod: ${code}`);
      return res.json({ ok: true, dev_note: 'ESKIZ sozlanmagan, kod konsolda chiqdi' });
    }

    await sendSms(phone, `Avtotest tasdiqlash kodi: ${code}`);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SMS yuborishda xatolik' });
  }
});

// ============ SMS KODNI TASDIQLASH ============
router.post('/verify-code', async (req, res) => {
  try {
    const { phone, code, name } = req.body;
    const data = db.get();

    const pending = data.pending_codes.find(c => c.phone === phone);
    if (!pending) return res.status(400).json({ error: 'Avval kod so\'rang' });
    if (Date.now() > pending.expires_at) return res.status(400).json({ error: 'Kod muddati tugagan' });
    if (pending.code !== code) return res.status(400).json({ error: "Kod noto'g'ri" });

    // Kod to'g'ri - foydalanuvchini topamiz yoki yaratamiz
    let user = data.users.find(u => u.phone === phone);
    if (!user) {
      user = {
        id: uuidv4(),
        name: name || 'Foydalanuvchi',
        email: null,
        phone,
        phone_verified: true,
        google_id: null,
        is_admin: false,
        created_at: new Date().toISOString()
      };
      data.users.push(user);
    } else {
      user.phone_verified = true;
    }

    data.pending_codes = data.pending_codes.filter(c => c.phone !== phone);
    db.set(data);

    const token = signToken(user);
    res.json({ token, user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Tasdiqlashda xatolik' });
  }
});

// ============ JORIY FOYDALANUVCHI MA'LUMOTI ============
router.get('/me', require('../middleware/auth').requireAuth, (req, res) => {
  const data = db.get();
  const user = data.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Topilmadi' });

  const activeSub = data.subscriptions.find(
    s => s.user_id === user.id && s.status === 'active' && new Date(s.expires_at) > new Date()
  );

  res.json({ user, active_subscription: activeSub || null });
});

module.exports = router;
