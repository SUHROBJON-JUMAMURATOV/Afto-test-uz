const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Tizimga kirish talab qilinadi' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, phone, is_admin }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sessiya muddati tugagan, qayta kiring' });
  }
}

function requireAdmin(req, res, next) {
  // Admin panel uchun: yoki JWT'dagi is_admin=true, yoki maxsus ADMIN_SECRET header orqali
  const adminHeader = req.headers['x-admin-secret'];
  if (adminHeader && adminHeader === process.env.ADMIN_SECRET) {
    return next();
  }
  if (req.user && req.user.is_admin) {
    return next();
  }
  return res.status(403).json({ error: 'Admin huquqi kerak' });
}

// Admin panel route'lari uchun: ADMIN_SECRET header bo'lsa JWT talab qilinmaydi,
// bo'lmasa oddiy requireAuth + requireAdmin zanjiriga o'tadi.
function adminOnly(req, res, next) {
  const adminHeader = req.headers['x-admin-secret'];
  if (adminHeader && adminHeader === process.env.ADMIN_SECRET) {
    return next();
  }
  return requireAuth(req, res, () => requireAdmin(req, res, next));
}

module.exports = { requireAuth, requireAdmin, adminOnly };
