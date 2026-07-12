const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { verifyClickSignature, buildClickPaymentUrl } = require('../services/click');
const { verifyPaymeAuth, buildPaymePaymentUrl, PaymeErrors } = require('../services/payme');

const router = express.Router();

function activateSubscription(data, userId, planId, paymentId) {
  const plan = data.plans.find(p => p.id === planId);
  if (!plan) throw new Error('Reja topilmadi');

  // Agar foydalanuvchida hali tugamagan faol obuna bo'lsa, muddatni CHO'ZAMIZ (qo'shamiz)
  const now = new Date();
  const existing = data.subscriptions.find(
    s => s.user_id === userId && s.status === 'active' && new Date(s.expires_at) > now
  );

  let startFrom = now;
  if (existing) {
    startFrom = new Date(existing.expires_at);
    existing.status = 'extended'; // eskisini yopamiz, yangi yozuv ochamiz
  }

  const expiresAt = new Date(startFrom.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);

  const subscription = {
    id: uuidv4(),
    user_id: userId,
    plan_id: planId,
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: 'active',
    payment_id: paymentId
  };
  data.subscriptions.push(subscription);
  return subscription;
}

// ============================================================
// 1) TO'LOV BOSHLASH - foydalanuvchi reja tanlab, provider tanlaydi
// ============================================================
router.post('/create-invoice', requireAuth, (req, res) => {
  const { plan_id, provider } = req.body; // provider: 'click' | 'payme'
  const data = db.get();
  const plan = data.plans.find(p => p.id === plan_id);
  if (!plan) return res.status(400).json({ error: 'Reja topilmadi' });
  if (!['click', 'payme'].includes(provider)) return res.status(400).json({ error: "provider 'click' yoki 'payme' bo'lishi kerak" });

  const transactionId = uuidv4();
  const payment = {
    id: transactionId,
    user_id: req.user.id,
    plan_id,
    provider,
    amount: plan.price,
    transaction_id: transactionId,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  data.payments.push(payment);
  db.set(data);

  const returnUrl = `${process.env.FRONTEND_URL}/pricing.html?status=success`;
  let paymentUrl;
  if (provider === 'click') {
    paymentUrl = buildClickPaymentUrl({ amount: plan.price, transactionId, returnUrl });
  } else {
    paymentUrl = buildPaymePaymentUrl({ amount: plan.price, transactionId });
  }

  res.json({ payment_url: paymentUrl, transaction_id: transactionId });
});

// ============================================================
// 2) CLICK WEBHOOK - Click serveri shu manzilga POST qiladi
//    Click PREPARE (action=0) va COMPLETE (action=1) so'rovlarini yuboradi
// ============================================================
router.post('/click/webhook', (req, res) => {
  const body = req.body;

  if (!verifyClickSignature(body)) {
    return res.json({ error: -1, error_note: 'SIGN CHECK FAILED!' });
  }

  const data = db.get();
  const payment = data.payments.find(p => p.transaction_id === body.merchant_trans_id);
  if (!payment) {
    return res.json({ error: -5, error_note: 'Transaction not found' });
  }

  if (Number(body.action) === 0) {
    // ===== PREPARE =====
    if (Number(payment.amount) !== Number(body.amount)) {
      return res.json({ error: -2, error_note: 'Incorrect amount' });
    }
    payment.click_prepare_id = body.click_trans_id;
    db.set(data);

    return res.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      merchant_prepare_id: payment.click_prepare_id,
      error: 0,
      error_note: 'Success'
    });
  }

  if (Number(body.action) === 1) {
    // ===== COMPLETE =====
    if (payment.status === 'success') {
      return res.json({ error: -4, error_note: 'Already paid' });
    }
    payment.status = 'success';
    payment.click_trans_id = body.click_trans_id;
    const sub = activateSubscription(data, payment.user_id, payment.plan_id, payment.id);
    db.set(data);

    return res.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      merchant_confirm_id: sub.id,
      error: 0,
      error_note: 'Success'
    });
  }

  res.json({ error: -3, error_note: 'Action not found' });
});

// ============================================================
// 3) PAYME WEBHOOK - JSON-RPC bitta endpoint, metodga qarab dispatch qilinadi
// ============================================================
router.post('/payme/webhook', (req, res) => {
  if (!verifyPaymeAuth(req.headers.authorization)) {
    return res.status(200).json({ error: { code: -32504, message: 'Authorization required' }, id: req.body.id });
  }

  const { method, params, id } = req.body;
  const data = db.get();

  const payment = data.payments.find(p => p.transaction_id === params?.account?.transaction_id);

  switch (method) {
    case 'CheckPerformTransaction': {
      if (!payment) return res.json({ error: PaymeErrors.ORDER_NOT_FOUND, id });
      if (Number(payment.amount) * 100 !== Number(params.amount)) {
        return res.json({ error: PaymeErrors.INVALID_AMOUNT, id });
      }
      return res.json({ result: { allow: true }, id });
    }

    case 'CreateTransaction': {
      if (!payment) return res.json({ error: PaymeErrors.ORDER_NOT_FOUND, id });
      payment.payme_trans_id = params.id;
      payment.status = 'processing';
      db.set(data);
      return res.json({
        result: {
          create_time: Date.now(),
          transaction: payment.id,
          state: 1
        }, id
      });
    }

    case 'PerformTransaction': {
      if (!payment) return res.json({ error: PaymeErrors.TRANSACTION_NOT_FOUND, id });
      if (payment.status !== 'success') {
        payment.status = 'success';
        activateSubscription(data, payment.user_id, payment.plan_id, payment.id);
        db.set(data);
      }
      return res.json({
        result: {
          transaction: payment.id,
          perform_time: Date.now(),
          state: 2
        }, id
      });
    }

    case 'CancelTransaction': {
      if (!payment) return res.json({ error: PaymeErrors.TRANSACTION_NOT_FOUND, id });
      payment.status = 'cancelled';
      db.set(data);
      return res.json({
        result: {
          transaction: payment.id,
          cancel_time: Date.now(),
          state: -1
        }, id
      });
    }

    case 'CheckTransaction': {
      if (!payment) return res.json({ error: PaymeErrors.TRANSACTION_NOT_FOUND, id });
      return res.json({
        result: {
          create_time: 0,
          perform_time: payment.status === 'success' ? Date.now() : 0,
          cancel_time: payment.status === 'cancelled' ? Date.now() : 0,
          transaction: payment.id,
          state: payment.status === 'success' ? 2 : 1,
          reason: null
        }, id
      });
    }

    default:
      return res.json({ error: { code: -32601, message: 'Method not found' }, id });
  }
});

module.exports = router;
