// services/sms.js
// Eskiz.uz orqali SMS yuborish. Hujjat: https://documenter.getpostman.com/view/663428/RWaLPzxN
const fetch = require('node-fetch');

let cachedToken = null;
let tokenExpiresAt = 0;

async function getEskizToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;

  const res = await fetch('https://notify.eskiz.uz/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ESKIZ_EMAIL,
      password: process.env.ESKIZ_PASSWORD
    })
  });
  const data = await res.json();
  if (!data || !data.data || !data.data.token) {
    throw new Error('Eskiz.uz token olinmadi. .env dagi ESKIZ_EMAIL/ESKIZ_PASSWORD ni tekshiring');
  }
  cachedToken = data.data.token;
  // Token ~1 oy amal qiladi, biz ehtiyot uchun 25 kunda yangilaymiz
  tokenExpiresAt = now + 25 * 24 * 60 * 60 * 1000;
  return cachedToken;
}

async function sendSms(phone, message) {
  // phone format: 998901234567 (+ belgisisiz)
  const cleanPhone = phone.replace(/\D/g, '');
  const token = await getEskizToken();

  const res = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      mobile_phone: cleanPhone,
      message,
      from: process.env.ESKIZ_FROM || '4546'
    })
  });
  const data = await res.json();
  return data;
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 xonali kod
}

module.exports = { sendSms, generateCode };
