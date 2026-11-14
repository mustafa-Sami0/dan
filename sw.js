// Service Worker — سجل المدرس الإلكتروني (2.7.5)
const CACHE = 'teacher-register-v26-firebase-2.7.5';
const CORE = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

// لا نرجّع استجابة محوّلة (redirect) لطلب تنقّل: المتصفح يرفضها ويعطي ERR_FAILED
async function clean(res) {
  if (!res || !res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(CORE.map(u => fetch(u).then(r => clean(r)).then(r => r && r.ok ? c.put(u, r) : null).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = req.url;
  if (req.method !== 'GET' || !url.startsWith('http') || url.includes('firestore.googleapis.com') || url.includes('identitytoolkit.googleapis.com') || url.includes('securetoken.googleapis.com')) return;

  // صفحة التطبيق: الشبكة أولاً (يصل كل تحديث فور الاتصال)، وعند انقطاع الإنترنت النسخة المخزنة
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(clean)
        .then(out => {
          if (out && out.ok) { const copy = out.clone(); caches.open(CACHE).then(c => c.put('./', copy)); }
          return out;
        })
        .catch(() => caches.match('./').then(r => r || Response.error()))
    );
    return;
  }

  // بقية الملفات والمكتبات: من الكاش أولاً مع تحديث بالخلفية
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.status !== 206 && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached || Response.error());
      return cached || network;
    })
  );
});
