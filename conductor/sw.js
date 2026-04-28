// Service Worker — SITIOS HIDALGO Conductor
// Mantiene la app activa y permite GPS en segundo plano
const CACHE = 'sh-conductor-v5';
const ASSETS = ['/'];

// Instalar y cachear
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activar — limpiar caches viejos con prefijo sh-conductor-
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('sh-conductor-') && k !== CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-only para JS; network-first con cache fallback para el resto
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.endsWith('.js')) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Background Sync — si se pierde conexión, reintenta
self.addEventListener('sync', e => {
  if (e.tag === 'gps-sync') {
    console.log('[SW] GPS sync en segundo plano');
  }
});

// Mantener vivo el SW con un ping periódico
self.addEventListener('message', e => {
  if (e.data === 'ping') {
    e.ports[0].postMessage('pong');
  }
});
