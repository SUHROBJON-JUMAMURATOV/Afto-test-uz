const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth, adminOnly } = require('../middleware/auth');

const router = express.Router();

function hasActivePro(data, userId) {
  return !!data.subscriptions.find(
    s => s.user_id === userId && s.status === 'active' && new Date(s.expires_at) > new Date()
  );
}

// ============ OMMAVIY: KATEGORIYALAR VA TESTLAR RO'YXATI ============
router.get('/categories', (req, res) => {
  const data = db.get();
  res.json(data.categories);
});

router.get('/', (req, res) => {
  const data = db.get();
  // Savol matnlarini yubormaymiz, faqat ro'yxat uchun meta ma'lumot
  const list = data.tests.map(t => ({
    ...t,
    question_count: data.questions.filter(q => q.test_id === t.id).length
  }));
  res.json(list);
});

// ============ TEST YECHISH UCHUN SAVOLLARNI OLISH ============
router.get('/:testId/questions', requireAuth, (req, res) => {
  const data = db.get();
  const test = data.tests.find(t => t.id === req.params.testId);
  if (!test) return res.status(404).json({ error: 'Test topilmadi' });

  if (test.is_premium && !hasActivePro(data, req.user.id)) {
    return res.status(402).json({ error: 'Bu test faqat Pro foydalanuvchilar uchun', requires_pro: true });
  }

  const questions = data.questions
    .filter(q => q.test_id === test.id)
    .sort((a, b) => a.order_num - b.order_num)
    .map(q => ({
      id: q.id,
      question_text: q.question_text,
      image_url: q.image_url,
      answers: data.answers
        .filter(a => a.question_id === q.id)
        .map(a => ({ id: a.id, answer_text: a.answer_text })) // is_correct YUBORILMAYDI!
    }));

  res.json({ test, questions });
});

// ============ TEST NATIJASINI TOPSHIRISH ============
router.post('/:testId/submit', requireAuth, (req, res) => {
  const { answers } = req.body; // [{ question_id, answer_id }]
  const data = db.get();
  const test = data.tests.find(t => t.id === req.params.testId);
  if (!test) return res.status(404).json({ error: 'Test topilmadi' });

  const questions = data.questions.filter(q => q.test_id === test.id);
  let correctCount = 0;
  const detailedResults = [];

  for (const q of questions) {
    const userAnswer = answers.find(a => a.question_id === q.id);
    const correctAnswer = data.answers.find(a => a.question_id === q.id && a.is_correct);
    const isCorrect = userAnswer && correctAnswer && userAnswer.answer_id === correctAnswer.id;
    if (isCorrect) correctCount++;

    detailedResults.push({
      question_id: q.id,
      correct_answer_id: correctAnswer ? correctAnswer.id : null,
      user_answer_id: userAnswer ? userAnswer.answer_id : null,
      is_correct: !!isCorrect
    });
  }

  const total = questions.length;
  const passed = total > 0 && correctCount / total >= 0.9; // PDD standarti: 90%+ o'tish

  const session = {
    id: uuidv4(),
    user_id: req.user.id,
    test_id: test.id,
    score: correctCount,
    total,
    passed,
    created_at: new Date().toISOString()
  };
  data.exam_sessions.push(session);
  db.set(data);

  res.json({ score: correctCount, total, passed, details: detailedResults });
});

// ============ FOYDALANUVCHI STATISTIKASI (ko'p xato qilingan savollar) ============
router.get('/my/weak-questions', requireAuth, (req, res) => {
  const data = db.get();
  const mySessions = data.exam_sessions.filter(s => s.user_id === req.user.id);
  // Bu yerda oddiy misol - real loyihada har savol bo'yicha xato statistikasi alohida jadvalda saqlanadi
  res.json({ sessions: mySessions });
});

// ============================================================
// ============ ADMIN QISM: TEST VA SAVOL QO'SHISH ============
// ============================================================

router.post('/admin/categories', adminOnly, (req, res) => {
  const { name } = req.body;
  const data = db.get();
  const category = { id: uuidv4(), name };
  data.categories.push(category);
  db.set(data);
  res.json(category);
});

router.post('/admin/tests', adminOnly, (req, res) => {
  const { category_id, title, is_premium } = req.body;
  const data = db.get();
  const test = { id: uuidv4(), category_id, title, is_premium: !!is_premium };
  data.tests.push(test);
  db.set(data);
  res.json(test);
});

// Savol qo'shish: answers massivida is_correct: true bo'lgan javob to'g'ri javob bo'ladi
router.post('/admin/questions', adminOnly, (req, res) => {
  const { test_id, question_text, image_url, order_num, answers } = req.body;
  const data = db.get();

  const question = {
    id: uuidv4(),
    test_id,
    question_text,
    image_url: image_url || null,
    order_num: order_num || 0
  };
  data.questions.push(question);

  const createdAnswers = (answers || []).map(a => ({
    id: uuidv4(),
    question_id: question.id,
    answer_text: a.answer_text,
    is_correct: !!a.is_correct
  }));
  data.answers.push(...createdAnswers);

  db.set(data);
  res.json({ question, answers: createdAnswers });
});

router.delete('/admin/questions/:id', adminOnly, (req, res) => {
  const data = db.get();
  data.questions = data.questions.filter(q => q.id !== req.params.id);
  data.answers = data.answers.filter(a => a.question_id !== req.params.id);
  db.set(data);
  res.json({ ok: true });
});

module.exports = router;
