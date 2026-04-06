export async function registerPwa() {
  if (!("serviceWorker" in navigator)) return;
  const isNative = Boolean(
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === "function" &&
    window.Capacitor.isNativePlatform()
  );

  if (isNative) {
    // Capacitor ships local assets; a service worker can trap stale bundles across upgrades.
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
    if (window.caches?.keys) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key)));
    }
    return;
  }

  const reg = await navigator.serviceWorker.register("./service-worker.js");

  if (reg.waiting) {
    window.dispatchEvent(new CustomEvent("edupulse-sw-update"));
  }

  reg.addEventListener("updatefound", () => {
    const worker = reg.installing;
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        window.dispatchEvent(new CustomEvent("edupulse-sw-update"));
      }
    });
  });
}
