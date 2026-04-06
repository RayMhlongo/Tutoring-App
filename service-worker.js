const VERSION = "edupulse-v3-20260406-hotfix1";
const STATIC_CACHE = `${VERSION}-static`;

const APP_ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.json",
  "./styles/theme.css",
  "./styles/main.css",
  "./src/main.js",
  "./src/app/bootstrap.js",
  "./src/app/router.js",
  "./src/app/store.js",
  "./src/core/constants.js",
  "./src/core/validation.js",
  "./src/utils/common.js",
  "./src/utils/crypto.js",
  "./src/data/db/client.js",
  "./src/data/db/schema.js",
  "./src/data/repos/baseRepo.js",
  "./src/data/repos/index.js",
  "./src/data/seed/demo.js",
  "./src/ui/components/primitives.js",
  "./src/ui/components/crudView.js",
  "./src/ui/layouts/shell.js",
  "./src/ui/theme/theme.js",
  "./src/features/auth/index.js",
  "./src/features/auth/service.js",
  "./src/features/dashboard/index.js",
  "./src/features/dashboard/service.js",
  "./src/features/students/index.js",
  "./src/features/tutors/index.js",
  "./src/features/schedule/index.js",
  "./src/features/lessons/index.js",
  "./src/features/attendance/index.js",
  "./src/features/payments/index.js",
  "./src/features/expenses/index.js",
  "./src/features/reports/index.js",
  "./src/features/insights/index.js",
  "./src/features/insights/service.js",
  "./src/features/backup/index.js",
  "./src/features/backup/service.js",
  "./src/features/settings/index.js",
  "./src/integrations/ai/aiAdapter.js",
  "./src/integrations/google-drive/driveAdapter.js",
  "./src/integrations/qr/qr.js",
  "./src/pwa/register.js",
  "./assets/vendor/dexie.min.js",
  "./assets/vendor/qrcode.min.js",
  "./assets/vendor/html5-qrcode.min.js",
  "./assets/logo/data-insights-logo.svg",
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png",
  "./icons/icon-maskable-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(async () => (await caches.match("./index.html")) || caches.match("./offline.html"))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && (request.destination === "script" || request.destination === "style" || request.destination === "image")) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      return caches.match("./offline.html");
    }
  })());
});
