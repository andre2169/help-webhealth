const CACHE_NAME = "helpweb-health-static-v4";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/brand/handshake.png",
  "/brand/logo-full.png",
  "/icons/help-web-health-192.png",
  "/icons/help-web-health-512.png",
  "/icons/help-web-health-maskable-192.png",
  "/icons/help-web-health-maskable-512.png",
  "/icons/help-web-health-apple-touch-180.png",
  "/icons/help-web-health-favicon-32.png",
  "/icons/help-web-health-favicon-16.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("helpweb-health-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Dados de sessão, chamados e notificações continuam sempre fora do cache.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (/^\/api(?:\/|$)/.test(url.pathname) || url.pathname === "/health") return;

  if (request.mode === "navigate") {
    const network = fetch(request);
    event.waitUntil(
      network.then((response) => {
        if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
          const copy = response.clone();
          return caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
        }
      }).catch(() => undefined)
    );
    event.respondWith(network.catch(() => caches.open(CACHE_NAME).then((cache) => cache.match("/"))));
    return;
  }

  if (!["script", "style", "image", "font", "manifest"].includes(request.destination)) {
    return;
  }

  const network = fetch(request);
  event.waitUntil(
    network.then((response) => {
      if (response.ok) {
        const copy = response.clone();
        return caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
    }).catch(() => undefined)
  );
  event.respondWith(caches.open(CACHE_NAME).then((cache) => cache.match(request)).then((cached) => cached || network));
});
