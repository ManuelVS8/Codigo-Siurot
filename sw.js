/* Código Siurot · service worker
   - Las páginas (HTML) se piden SIEMPRE primero a internet: al subir una versión nueva a GitHub,
     la app se actualiza sola sin desinstalar. Sin conexión, se usa la última copia guardada.
   - Iconos, fuentes y librerías de Firebase se guardan para ir más rápido y funcionar sin conexión.
   - Las peticiones a la base de datos (Firestore / inicio de sesión) nunca pasan por aquí. */
const CACHE = 'codigo-siurot-v17';
const BASICOS = ['./index.html', './manifest.json',
  './iconos/icon-192.png', './iconos/icon-512.png', './iconos/icon-maskable-512.png', './iconos/apple-touch-icon.png', './iconos/favicon-32.png', './iconos/favicon-64.png'];
const EXTERNOS = ['https://www.gstatic.com/firebasejs/', 'https://fonts.googleapis.com/', 'https://fonts.gstatic.com/'];

self.addEventListener('install', e => {
  // cada archivo por separado: si falta alguno (un icono sin subir, por ejemplo) el service worker se instala igualmente
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASICOS.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mismoSitio = url.origin === self.location.origin;
  const esPagina = req.mode === 'navigate' || (mismoSitio && url.pathname.endsWith('.html'));
  if (esPagina) {
    e.respondWith(
      fetch(req).then(r => { if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); } return r; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  if (mismoSitio || EXTERNOS.some(p => req.url.startsWith(p))) {
    e.respondWith(
      caches.match(req).then(guardada => {
        const red = fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); } return r; }).catch(() => guardada);
        return guardada || red;
      })
    );
  }
});
