# AVTOTEST — PDD imtihoniga tayyorgarlik dasturi

To'liq boshlang'ich (starter) loyiha: Google login, telefon+SMS tasdiqlash,
Click/Payme orqali pullik obuna (2 haftalik / 1 oylik / 2 oylik), PWA
(mobil ilova kabi o'rnatiladigan, offline ishlaydigan) frontend va admin panel.

## Loyiha tuzilishi

```
avtotest-app/
├── backend/          # Node.js + Express API server
│   ├── server.js
│   ├── db.js         # Oddiy JSON-fayl baza (boshida yetarli)
│   ├── routes/        # auth, payments, subscriptions, tests
│   ├── services/       # sms.js (Eskiz), click.js, payme.js
│   └── .env.example
└── frontend/         # Vanilla HTML/CSS/JS, PWA
    ├── index.html, login.html, tests.html, quiz.html, pricing.html, admin.html
    ├── manifest.json, sw.js   # PWA fayllari
    ├── css/style.css
    └── js/
```

---

## 1-QADAM: Backendni ishga tushirish

```bash
cd backend
npm install
cp .env.example .env
```

`.env` faylini oching va quyidagilarni to'ldiring (pastdagi bo'limlarda har biri
qanday olinishi tushuntirilgan):

- `JWT_SECRET` — o'zingiz uzun tasodifiy satr o'ylab toping
- `ADMIN_SECRET` — admin panelga kirish uchun parol
- `GOOGLE_CLIENT_ID`
- `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`
- `CLICK_*` va `PAYME_*` kalitlar

So'ng ishga tushiring:

```bash
npm start
```

Server `http://localhost:4000` da ishga tushadi. Tekshirish uchun brauzerda
`http://localhost:4000/api/health` ni oching — `{"ok":true}` chiqishi kerak.

> **Eslatma:** Agar `ESKIZ_EMAIL` sozlanmagan bo'lsa, dastur "dev rejim"da
> ishlaydi — SMS kod real yuborilmaydi, balki server konsolida chiqadi.
> Shu holatda ham to'liq test qilishingiz mumkin.

---

## 2-QADAM: Frontendni ishga tushirish

Frontend — oddiy statik fayllar, hech qanday build kerak emas. Eng oson yo'l:

```bash
cd frontend
npx serve . -p 5500
```

yoki VS Code'dagi **Live Server** kengaytmasidan foydalaning. Brauzerda
`http://localhost:5500` oching.

`frontend/js/app.js` faylidagi `API_BASE` o'zgaruvchisi avtomatik
`localhost:4000`ga ulanadi (development uchun). **Productionga chiqarganda**
shu faylni ochib, `API_BASE` ni o'z domeningizga almashtiring:

```js
const API_BASE = 'https://api.sizningdomeningiz.uz/api';
```

---

## 3-QADAM: Google OAuth sozlash

1. https://console.cloud.google.com ga kiring, yangi loyiha yarating
2. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
3. Application type: **Web application**
4. **Authorized JavaScript origins** ga qo'shing:
   - `http://localhost:5500` (development uchun)
   - `https://sizningdomeningiz.uz` (production uchun)
5. Olingan Client ID'ni ikkita joyga qo'ying:
   - `backend/.env` → `GOOGLE_CLIENT_ID`
   - `frontend/login.html` → `data-client_id="..."` (Ctrl+F qilib toping)

> **Sizning joriy sozlamangizda tuzatish kerak bo'lgan joy:**
> Google Console'dagi `javascript_origins` da `http://Suhrob1.uz` deb turibdi —
> bu ishlamaydi, chunki:
> 1. Google login SSL talab qiladi → `http://` emas, **`https://`** bo'lishi kerak
> 2. Domenlar odatda kichik harfda yoziladi → `suhrob1.uz`
>
> Google Console → Credentials → shu OAuth Client → **Authorized JavaScript
> origins** bo'limiga borib, quyidagilarni qo'shing (eskisini o'chirmasdan,
> qo'shimcha qatorlar sifatida):
> ```
> https://suhrob1.uz
> https://www.suhrob1.uz
> http://localhost:5500
> ```
> `redirect_uris` maydoni (hozir `https://Suhrob1.uz`) bu loyihada ishlatilmaydi
> — biz Google Identity Services'ning "one-tap / client-side" oqimidan
> foydalanamiz, redirect kerak emas — shuning uchun uni o'zgartirmasangiz ham
> bo'ladi, lekin xato bermasligi uchun tekshirib qo'ying.
>
> **client_secret haqida:** bu loyihada client_secret ishlatilmaydi (faqat
> client_id kerak). Agar client_secretni allaqachon biror joyda oshkor
> qilgan bo'lsangiz (masalan chatda, GitHub'da), Google Console'da
> **"Reset secret"** tugmasi orqali uni bekor qilib, yangisini generatsiya
> qiling — bu ixtiyoriy ehtiyot chorasi, lekin tavsiya etiladi.

---

## 4-QADAM: Eskiz.uz SMS sozlash

1. https://eskiz.uz da ro'yxatdan o'ting, biznes profil oching
2. Login/parolni `backend/.env` dagi `ESKIZ_EMAIL` / `ESKIZ_PASSWORD` ga qo'ying
3. Eskiz.uz'da "nomer" (SMS jo'natuvchi nom, masalan "AVTOTEST") ni
   tasdiqlatishingiz kerak bo'ladi — bu 1-3 kun vaqt oladi. Tasdiqlangach,
   `ESKIZ_FROM` ni o'sha nom bilan almashtiring.
4. Eskiz balansingizga pul to'ldirib qo'yishni unutmang — har bir SMS pullik.

---

## 5-QADAM: Click integratsiyasi

1. https://merchant.click.uz da biznes sifatida ro'yxatdan o'ting
2. Yangi xizmat (service) yarating — sizga `service_id`, `merchant_id`,
   `secret_key` beriladi
3. **Muhim:** Click kabinetida "Webhook URL" (ular buni "Callback URL" deb
   ham atashadi) qismiga backend manzilingizni yozing:
   ```
   https://api.sizningdomeningiz.uz/api/payments/click/webhook
   ```
4. Kalitlarni `backend/.env` ga qo'ying

**Sinov (test) rejimi:** Click test kartalari va sandbox muhitini taqdim
etadi — production'ga chiqishdan oldin ular bilan sinab ko'ring.

---

## 6-QADAM: Payme integratsiyasi

1. https://business.payme.uz da ro'yxatdan o'ting
2. Kassa (merchant) yarating — `merchant_id` va `secret_key` olasiz
3. **Webhook URL** qismiga yozing:
   ```
   https://api.sizningdomeningiz.uz/api/payments/payme/webhook
   ```
4. Kalitlarni `.env` ga qo'ying (`PAYME_MERCHANT_ID`, `PAYME_SECRET_KEY`)

---

## 7-QADAM: O'z testlaringizni qo'shish (Admin panel)

1. Brauzerda `frontend/admin.html` sahifasini oching
2. `.env` dagi `ADMIN_SECRET` ni kiriting
3. Tartib: **avval kategoriya** (masalan "Yo'l belgilari") → **keyin test/bilet**
   (masalan "1-bilet") → **keyin har bir savolni** to'g'ri javobi bilan qo'shing

> Savol rasmlari uchun (yo'l belgilari rasmlari) — rasmni biror joyga
> (masalan imgur.com yoki o'z serveringizga) yuklab, uning to'g'ridan-to'g'ri
> URL manzilini "Rasm URL" maydoniga qo'ying.

Ko'p sonli savolni tezroq qo'shish uchun kelajakda `admin.html`'ga
"Excel/CSV import" funksiyasini qo'shishni tavsiya qilaman — hozircha bitta-
bitta qo'shish ko'zda tutilgan.

---

## 8-QADAM: Telefonda ilova sifatida o'rnatish (PWA)

Saytni deploy qilgach, foydalanuvchi:
- **Android (Chrome):** sayt ochilganda "Bosh ekranga qo'shish" bildirishnomasi
  chiqadi, yoki menyu (⋮) → "Ilovani o'rnatish"
- **iPhone (Safari):** Ulashish tugmasi → "Bosh ekranga qo'shish"

Shundan so'ng ilova native ilova kabi ochiladi, offline'da ham (internetsiz)
avval yuklab olingan testlarni yechish imkoniyati bo'ladi.

**Eslatma:** `frontend/manifest.json` dagi `icons` uchun o'zingizning
192x192 va 512x512 o'lchamdagi PNG logotiplaringizni `frontend/icons/`
papkasiga qo'yishingiz kerak (hozircha bu papka bo'sh).

---

## 9-QADAM: Production'ga chiqarish (deploy)

Tavsiya etiladigan sxema:

| Qism | Xizmat |
|---|---|
| Frontend (statik fayllar) | Vercel, Netlify yoki oddiy VPS + Nginx |
| Backend (Node.js) | Railway, Render yoki o'z VPS'ingiz (PM2 bilan) |
| Domen | Sizda bor — DNS orqali frontend/backend'ga yo'naltirasiz |
| SSL | Let's Encrypt (VPS) yoki avtomatik (Vercel/Railway) |

**MUHIM:** Click va Payme webhook manzillari **HTTPS** bo'lishi shart —
localhost yoki HTTP orqali ishlamaydi. Shuning uchun production'da domenga
SSL sertifikat o'rnatilgan bo'lishi kerak.

---

## Muhim xavfsizlik eslatmalari

- `.env` faylini **hech qachon** GitHub'ga yubormang (`.gitignore`ga
  qo'shilgan, tekshirib ko'ring)
- `ADMIN_SECRET`ni faqat o'zingiz biling, admin.html manzilini hech kimga
  tarqatmang
- Productionga chiqishdan oldin `db.js`dagi JSON-fayl bazani albatta
  PostgreSQL yoki MySQL'ga almashtiring — foydalanuvchilar ko'payganda
  JSON fayl sekinlashadi va parallel yozishlarda ma'lumot yo'qolishi mumkin

## Keyingi rivojlantirish g'oyalari

- Xato qilingan savollar bo'yicha "zaif tomonlar" statistikasi sahifasi
- Admin panelga Excel orqali ko'plab savol import qilish
- Push-bildirishnomalar (masalan "3 kundan beri kirmadingiz" eslatmasi)
- Reyting/leaderboard (do'stlar bilan raqobat)
