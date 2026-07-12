// auth.js — Google va SMS orqali kirish logikasi

// ===== GOOGLE LOGIN =====
// Google Identity Services SDK index.html/login.html da <script src="https://accounts.google.com/gsi/client">
// orqali ulanadi. handleGoogleCredential shu SDK tomonidan chaqiriladi.
async function handleGoogleCredential(response) {
  try {
    const data = await apiFetch('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: response.credential })
    });
    setToken(data.token);
    window.location.href = 'tests.html';
  } catch (e) {
    document.getElementById('authError').textContent = e.message;
  }
}
window.handleGoogleCredential = handleGoogleCredential;

// ===== SMS ORQALI KIRISH =====
let currentPhone = null;

async function sendSmsCode() {
  const phoneInput = document.getElementById('phoneInput');
  const errorEl = document.getElementById('phoneError');
  errorEl.textContent = '';

  let phone = phoneInput.value.replace(/\D/g, '');
  if (phone.startsWith('998') === false) phone = '998' + phone;

  if (!/^998\d{9}$/.test(phone)) {
    errorEl.textContent = "To'g'ri raqam kiriting: 90 123 45 67";
    return;
  }

  try {
    document.getElementById('sendCodeBtn').disabled = true;
    await apiFetch('/auth/send-code', { method: 'POST', body: JSON.stringify({ phone }) });
    currentPhone = phone;
    document.getElementById('step-phone').style.display = 'none';
    document.getElementById('step-code').style.display = 'block';
  } catch (e) {
    errorEl.textContent = e.message;
    document.getElementById('sendCodeBtn').disabled = false;
  }
}

async function verifySmsCode() {
  const code = document.getElementById('codeInput').value.trim();
  const name = document.getElementById('nameInput')?.value.trim();
  const errorEl = document.getElementById('codeError');
  errorEl.textContent = '';

  try {
    const data = await apiFetch('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ phone: currentPhone, code, name })
    });
    setToken(data.token);
    window.location.href = 'tests.html';
  } catch (e) {
    errorEl.textContent = e.message;
  }
}

window.sendSmsCode = sendSmsCode;
window.verifySmsCode = verifySmsCode;
