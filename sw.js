// Service Worker — سجل المدرس الإلكتروني
const CACHE = 'teacher-register-v22-firebase-2.5.5';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// الملفات المحلية والمكتبات الخارجية (Tailwind, الخطوط, الأيقونات): من الكاش أولاً مع تحديث بالخلفية
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.url.includes('firestore.googleapis.com') || req.url.includes('identitytoolkit.googleapis.com')) return;
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
      return cached || network;
    })
  );
});
