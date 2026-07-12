// services/payme.js
// Payme Merchant API (JSON-RPC). Hujjat: https://developer.help.paycom.uz

// Payme so'rovlari "Authorization: Basic base64(Paycom:SECRET_KEY)" header bilan keladi
function verifyPaymeAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) return false;
  const decoded = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf-8');
  const [login, key] = decoded.split(':');
  return login === 'Paycom' && key === process.env.PAYME_SECRET_KEY;
}

// To'lov sahifasiga yo'naltirish uchun URL yaratish (checkout.paycom.uz)
function buildPaymePaymentUrl({ amount, transactionId }) {
  const merchantId = process.env.PAYME_MERCHANT_ID;
  // amount tiyinda bo'lishi kerak (so'm * 100)
  const amountTiyin = amount * 100;
  const params = `m=${merchantId};ac.transaction_id=${transactionId};a=${amountTiyin}`;
  const encoded = Buffer.from(params).toString('base64');
  return `https://checkout.paycom.uz/${encoded}`;
}

// Payme xatolik kodlari standarti
const PaymeErrors = {
  INVALID_AMOUNT: { code: -31001, message: { uz: "Noto'g'ri summa", ru: "Неверная сумма", en: 'Invalid amount' } },
  TRANSACTION_NOT_FOUND: { code: -31003, message: { uz: 'Tranzaksiya topilmadi', ru: 'Транзакция не найдена', en: 'Transaction not found' } },
  ORDER_NOT_FOUND: { code: -31050, message: { uz: 'Buyurtma topilmadi', ru: 'Заказ не найден', en: 'Order not found' } },
  ALREADY_DONE: { code: -31060, message: { uz: 'Allaqachon amalga oshirilgan', ru: 'Уже выполнено', en: 'Already done' } }
};

module.exports = { verifyPaymeAuth, buildPaymePaymentUrl, PaymeErrors };
