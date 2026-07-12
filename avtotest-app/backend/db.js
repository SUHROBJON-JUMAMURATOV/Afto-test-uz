// db.js
// ODDIY FAYL-ASOSIDAGI BAZA (JSON). Boshlash uchun juda qulay - hech qanday
// tashqi baza server o'rnatish shart emas. Foydalanuvchilar ko'payib,
// loyiha kattalashsa, buni PostgreSQL/MySQL + Prisma ga almashtirish TAVSIYA ETILADI.
// Hozircha bu fayl sizga tez boshlash va tushunish uchun yetarli.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

function defaultData() {
  return {
    users: [],              // { id, name, email, phone, phone_verified, google_id, is_admin, created_at }
    pending_codes: [],       // { phone, code, expires_at }
    plans: [
      { id: 'plan_14', name: "2 haftalik", duration_days: 14, price: 15000 },
      { id: 'plan_30', name: "1 oylik",    duration_days: 30, price: 25000 },
      { id: 'plan_60', name: "2 oylik",    duration_days: 60, price: 40000 }
    ],
    subscriptions: [],       // { id, user_id, plan_id, started_at, expires_at, status }
    payments: [],            // { id, user_id, plan_id, provider, amount, transaction_id, status, click_trans_id, created_at }
    categories: [],          // { id, name }
    tests: [],               // { id, category_id, title, is_premium }
    questions: [],           // { id, test_id, question_text, image_url, order_num }
    answers: [],             // { id, question_id, answer_text, is_correct }
    exam_sessions: []        // { id, user_id, test_id, score, total, passed, time_spent, created_at }
  };
}

function load() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData(), null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Har chaqiriqda fayldan o'qib, yozib turamiz (kichik loyihalar uchun yetarli tez)
const db = {
  get: () => load(),
  set: (data) => save(data)
};

module.exports = db;
