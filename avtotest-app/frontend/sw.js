// sw.js - PWA offline keshlash
const CACHE_NAME = 'avtotest-v1';
const APP_SHELL = [
  '/index.html',
  '/login.html',
  '/tests.html',
  '/quiz.html',
  '/pricing.html',
  '/css/style.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/quiz.js',
  '/js/payments.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API so'rovlari uchun: internet bo'lsa tarmoqdan, bo'lmasa xato qaytadi (offline'da test yechish uchun
  // savollar avval keshlanadi, lekin natija yuborish internet talab qiladi)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Internet aloqasi yo\'q' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // App shell uchun: avval keshdan, keyin tarmoqdan (cache-first)
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
