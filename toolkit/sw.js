const CACHE = 'dims-toolkit-v3';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Navigasi (buka app / reload): SELALU sajikan index.html dari cache lebih dulu.
  // Ini yang bikin app tetap kebuka walau offline / sinyal jelek.
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html', { ignoreSearch: true })
        .then(cached => cached || fetch(req))
        .catch(() => caches.match('./index.html', { ignoreSearch: true }))
    );
    return;
  }

  // Aset lain: cache-first, lalu isi cache. Jangan pernah balas undefined.
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
    })
  );
});
