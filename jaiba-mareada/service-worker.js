const CACHE_NAME = 'jaiba-mareada-v1';
const ARCHIVOS_CORE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/calendario.js',
  '/js/modal.js',
  '/js/reglas.js',
  '/js/supabase-client.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_CORE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first para llamadas a Supabase (datos siempre frescos),
// cache-first para el shell de la app (assets estáticos).
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.hostname.includes('supabase.co')) {
    return; // dejar pasar directo a la red
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
