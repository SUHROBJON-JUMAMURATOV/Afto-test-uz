// services/click.js
// Click Merchant API. Hujjat: https://docs.click.uz
const crypto = require('crypto');

// Click sizga "Prepare" va "Complete" so'rovlarini yuboradi, sign_string ni tekshirish shart
function verifyClickSignature(body) {
  const {
    click_trans_id, service_id, orig_amount, amount, action,
    error, sign_time, merchant_trans_id, merchant_prepare_id, sign_string
  } = body;

  const secret = process.env.CLICK_SECRET_KEY;

  // Prepare bosqichida merchant_prepare_id bo'lmaydi, Complete bosqichida bo'ladi
  let signSource;
  if (action == 0) {
    // Prepare
    signSource = `${click_trans_id}${service_id}${secret}${merchant_trans_id}${amount}${action}${sign_time}`;
  } else {
    // Complete
    signSource = `${click_trans_id}${service_id}${secret}${merchant_trans_id}${merchant_prepare_id}${amount}${action}${sign_time}`;
  }

  const computedSign = crypto.createHash('md5').update(signSource).digest('hex');
  return computedSign === sign_string;
}

// To'lov sahifasiga yo'naltirish uchun URL yaratish
function buildClickPaymentUrl({ amount, transactionId, returnUrl }) {
  const serviceId = process.env.CLICK_SERVICE_ID;
  const merchantId = process.env.CLICK_MERCHANT_ID;
  const params = new URLSearchParams({
    service_id: serviceId,
    merchant_id: merchantId,
    amount: amount,
    transaction_param: transactionId,
    return_url: returnUrl || ''
  });
  return `https://my.click.uz/services/pay?${params.toString()}`;
}

module.exports = { verifyClickSignature, buildClickPaymentUrl };
