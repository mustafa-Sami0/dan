// Service Worker — سجل المدرس الإلكتروني
const CACHE = 'teacher-register-v24-firebase-2.5.6';
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
      .then(c => Promise.all(CORE.map(u => fetch(u).then(r => clean(r)).then(r => r && r.ok ? c.put(u, r) : null))))
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

// الملفات المحلية والمكتبات الخارجية (Tailwind, الخطوط, الأيقونات): من الكاش أولاً مع تحديث بالخلفية
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.url.includes('firestore.googleapis.com') || req.url.includes('identitytoolkit.googleapis.com')) return;
  const isNav = req.mode === 'navigate';
  const key = isNav ? './' : req;
  e.respondWith(
    caches.match(key).then(cached => {
      const network = fetch(req).then(async res => {
        const out = await clean(res);
        if (out && (out.ok || out.type === 'opaque')) {
          const copy = out.clone();
          caches.open(CACHE).then(c => c.put(key, copy));
        }
        return out;
      }).catch(() => cached || (isNav ? caches.match('./') : undefined));
      return cached || network;
    })
  );
});
