import { escapeHtml as baseEscapeHtml } from "./utils.js";

export function escapeHtml(value) {
  return baseEscapeHtml(value);
}

export function renderMaybe(condition, whenTrue, whenFalse = "") {
  return condition ? whenTrue : whenFalse;
}
