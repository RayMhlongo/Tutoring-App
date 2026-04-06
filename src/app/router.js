export function currentRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "").trim();
  return hash || "dashboard";
}

export function setRoute(route) {
  const next = route || "dashboard";
  if (window.location.hash.replace(/^#\/?/, "") === next) return;
  window.location.hash = `#/${next}`;
}