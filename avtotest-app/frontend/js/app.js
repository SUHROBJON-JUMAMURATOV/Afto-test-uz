// app.js — umumiy yordamchi funksiyalar

// Backend manzili — agar backendni boshqa subdomenga (masalan api.suhrob1.uz)
// deploy qilsangiz shu yerni o'zgartiring. Hozircha backend bilan bir xil
// domenda "/api" yo'li orqali ishlashga sozlangan (Nginx reverse-proxy bilan).
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:4000/api'
  : window.location.hostname.includes('suhrob1.uz')
    ? 'https://api.suhrob1.uz/api'
    : `${window.location.origin}/api`;

function getToken() {
  return localStorage.getItem('avtotest_token');
}
function setToken(token) {
  localStorage.setItem('avtotest_token', token);
}
function clearToken() {
  localStorage.removeItem('avtotest_token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
  return data;
}

function requireLoginOrRedirect() {
  if (!getToken()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function logout() {
  clearToken();
  window.location.href = 'login.html';
}

// PWA: service worker ro'yxatdan o'tkazish
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW error', e));
  });
}
