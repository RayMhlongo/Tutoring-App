const VERSION = "edupulse-v7";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.json",
  "./styles/main.css",
  "./src/main.js",
  "./src/core/constants.js",
  "./src/core/helpers.js",
  "./src/core/store.js",
  "./src/features/pages.js",
  "./src/ui/render.js",
  "./assets/vendor/dexie.min.js",
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png",
  "./icons/icon-maskable-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL_CACHE, RUNTIME_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put("./index.html", copy));
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("./index.html")) || (await caches.match("./offline.html")) || Response.error())
    );
    return;
  }

  if (url.pathname.includes("/src/") || url.pathname.includes("/styles/") || url.pathname.includes("/icons/") || url.pathname.includes("/assets/")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
            return res;
          })
          .catch(() => cached || Response.error());
        return cached || networkFetch;
      })
    );
  }
});
