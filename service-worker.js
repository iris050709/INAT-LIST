const CACHE_NAME = "tkd-cache-v1";
const URLS_TO_CACHE = [
  "/",
  "/admin.html",
  "/alumno.html",
  "/index.html",
  "/app.js",
  "/styles.css",
  "/escudo.png",
  "/manifest.json"
];

// Instalación del service worker
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// Activación
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
});

// Interceptar peticiones
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return (
        response ||
        fetch(event.request).catch(() => caches.match("/admin.html"))
      );
    })
  );
});
