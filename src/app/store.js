const listeners = new Set();

const state = {
  route: "dashboard",
  filters: {},
  online: navigator.onLine,
  restorePreview: null
};

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((listener) => listener(state));
}

export function updateFilter(key, patch) {
  state.filters[key] = { ...(state.filters[key] || {}), ...patch };
  listeners.forEach((listener) => listener(state));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}