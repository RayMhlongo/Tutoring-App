const CACHE_VERSION = "data-insights-v2.2.0";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./env.js",
  "./offline.html",
  "./manifest.json",
  "./styles/theme.css",
  "./styles/main.css",
  "./src/app.js",
  "./src/config.js",
  "./src/env.js",
  "./src/utils.js",
  "./src/validation.js",
  "./src/logger.js",
  "./src/view-utils.js",
  "./src/storage.js",
  "./src/sync.js",
  "./src/api.js",
  "./src/auth.js",
  "./src/google.js",
  "./src/backup.js",
  "./src/analytics.js",
  "./src/charts.js",
  "./src/ai.js",
  "./src/onboarding.js",
  "./src/qr.js",
  "./src/scheduler.js",
  "./src/students.js",
  "./src/tutors.js",
  "./src/lessons.js",
  "./src/attendance.js",
  "./src/payments.js",
  "./src/reports.js",
  "./src/ui.js",
  "./src/theme.js",
  "./components/dashboard.js",
  "./components/auth.js",
  "./components/studentProfile.js",
  "./components/calendar.js",
  "./components/lessonEditor.js",
  "./components/tutors.js",
  "./components/aiAssistant.js",
  "./components/onboarding.js",
  "./components/qrScanner.js",
  "./components/settings.js",
  "./assets/logo/data-insights-logo.svg",
  "./assets/vendor/dexie.min.js",
  "./assets/vendor/qrcode.min.js",
  "./assets/vendor/html5-qrcode.min.js",
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png",
  "./icons/icon-maskable-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => !name.startsWith(CACHE_VERSION))
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  return cached || networkPromise;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  const isNavigation = request.mode === "navigate";
  const isSameOrigin = url.origin === self.location.origin;
  const isStaticAsset = isSameOrigin && (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".json") ||
    url.pathname.endsWith(".html")
  );

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put("./index.html", clone));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(RUNTIME_CACHE);
          return (await cache.match("./index.html")) || (await caches.match("./offline.html"));
        })
    );
    return;
  }

  if (isStaticAsset || url.origin.includes("cdnjs") || url.origin.includes("unpkg") || url.origin.includes("jsdelivr") || url.origin.includes("google.com")) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "data-insights-sync-queue") {
    event.waitUntil((async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      clients.forEach((client) => client.postMessage({ type: "TRIGGER_SYNC_FROM_SW" }));
    })());
  }
});
