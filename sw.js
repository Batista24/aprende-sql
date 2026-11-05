const CACHE = 'aprende-sql-v9';
const FILES = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/lecciones.js', 'js/lecciones2.js','js/lecciones3.js','js/orden.js','js/voz.js','js/ia.js', 'lib/sql-wasm.js', 'lib/sql-wasm.wasm', 'manifest.webmanifest', 'icons/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const c = res.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); }
    return res;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
});
