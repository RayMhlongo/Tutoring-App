import { sanitizeText } from "../../utils/common.js";

export function buildStudentQrPayload(studentId) {
  return `EDUPULSE:${sanitizeText(studentId, 80)}`;
}

export function parseStudentQrPayload(value) {
  const text = sanitizeText(value, 120);
  if (!text.startsWith("EDUPULSE:")) return "";
  return sanitizeText(text.slice("EDUPULSE:".length), 80);
}

export async function renderQr(canvas, value) {
  if (!window.QRCode?.toCanvas) throw new Error("QR generator unavailable.");
  await window.QRCode.toCanvas(canvas, value, { width: 240, margin: 1 });
}

export async function startQrScanner(elementId, onDecoded, onError) {
  if (!window.Html5Qrcode) throw new Error("QR scanner unavailable.");
  const scanner = new window.Html5Qrcode(elementId);
  await scanner.start(
    { facingMode: "environment" },
    { fps: 8, qrbox: { width: 220, height: 220 } },
    (text) => onDecoded(text, scanner),
    () => {}
  );
  scanner.__onError = onError;
  return scanner;
}