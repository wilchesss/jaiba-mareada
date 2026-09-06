const CACHE_NAME = 'jaiba-mareada-v2';
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

// Network-first para todo (Supabase y el shell de la app): siempre intenta
// traer la versión más reciente de internet, y solo usa la copia guardada
// si no hay conexión. Así los cambios que subamos se ven de inmediato,
// sin depender de que el teléfono detecte una versión nueva del cache.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.hostname.includes('supabase.co')) {
    return; // dejar pasar directo a la red, sin pasar por cache
  }

  event.respondWith(
    fetch(event.request)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return respuesta;
      })
      .catch(() => caches.match(event.request))
  );
});
