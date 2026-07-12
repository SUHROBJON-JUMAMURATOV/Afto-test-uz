require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const subscriptionRoutes = require('./routes/subscriptions');
const testRoutes = require('./routes/tests');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/tests', testRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Avtotest backend ishga tushdi: http://localhost:${PORT}`);
  console.log(`   Click webhook:  http://localhost:${PORT}/api/payments/click/webhook`);
  console.log(`   Payme webhook:  http://localhost:${PORT}/api/payments/payme/webhook`);
});
