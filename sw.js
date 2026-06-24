/* Mindset VBC — Nationals Hub service worker */
/* IMPORTANT: bump this version string on every deploy to bust the cache for installed users */
const DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const CACHE = '1782259923';
const CORE = [
  '/',
  '/14red',
  '/15red',
  '/css/index.css',
  '/css/hub.css',
  '/css/14red.css',
  '/css/15red.css',
  '/css/modern-scroll.css',
  '/css/player-spotlight.css',
  '/css/gallery-lightbox.css',
  '/js/modern-scroll.js',
  '/js/photo-lightbox.js',
  '/js/player-spotlight.js',
  '/js/swipe.js',
  '/js/tabbar.js',
  '/14red-data.json',
  '/15red-data.json',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  if (DEV) return;
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(CORE.map((u) => c.add(u))))
  );
});

self.addEventListener('activate', (e) => {
  if (DEV) { e.waitUntil(self.clients.claim()); return; }
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

const DATA_FILES = ['/14red-data.json', '/15red-data.json'];

self.addEventListener('fetch', (e) => {
  if (DEV) return; // pass all requests straight to the network in dev
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Let external origins (fonts, CDNs, weather API, GitHub raw) hit the network directly.
  if (url.origin !== self.location.origin) return;

  // Network-first for data files so edits made via GitHub API are always fresh.
  if (DATA_FILES.some((p) => url.pathname === p)) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
