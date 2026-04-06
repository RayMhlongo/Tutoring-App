export async function registerPwa() {
  if (!("serviceWorker" in navigator)) return;
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