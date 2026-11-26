const CACHE = 'clarity-shell-v7';
const ASSETS = ['./','./index.html','./styles.css?v=2','./pwa.css','./app.js','./intelligence.js?v=2','./missions.js?v=2','./pwa.js','./manifest.webmanifest','./icons/icon-192.svg','./icons/icon-512.svg'];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => Promise.all(ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' }))))).then(() => self.skipWaiting())));
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const request = event.request;
  event.respondWith(fetch(request, { cache: 'no-store' }).then((response) => { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)); return response; }).catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html'))));
});
