const CACHE_NAME = 'kkvh-gold-v2';
const PRECACHE_ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon.svg',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

// Install: Cache critical shell assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('Precache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-only for live proxy requests, Network-first for gold.json & HTML, SWR for static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Chỉ xử lý các request GET
  if (event.request.method !== 'GET') return;

  // Các request lấy giá trực tiếp (kimkhanhviethung hoặc qua proxy CORS): luôn lấy thẳng từ mạng, KHÔNG cache
  if (
    url.href.includes('kimkhanhviethung') ||
    url.hostname.includes('jina.ai') ||
    url.hostname.includes('allorigins') ||
    url.hostname.includes('codetabs') ||
    url.hostname.includes('corsfix')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Đối với data/gold.json: Network-first để luôn có giá mới nhất (chuẩn hóa key bỏ ?t=...)
  if (url.pathname.endsWith('data/gold.json')) {
    const cleanKey = new Request(url.origin + url.pathname);
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(cleanKey, clone));
          }
          return response;
        })
        .catch(() => caches.match(cleanKey))
    );
    return;
  }

  // Đối với trang HTML chính: Network-first để luôn nhận code mới nhất khi online
  if (
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/index.html')
  ) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request) || caches.match('index.html'))
    );
    return;
  }

  // Đối với các file tĩnh (icons, chart.js...): Stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
