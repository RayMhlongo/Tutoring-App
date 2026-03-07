import { sanitizeText } from "./utils.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildQrValue(qrFormat, studentId) {
  const format = sanitizeText(qrFormat || "XFACTOR:{id}", 120);
  if (!format.includes("{id}")) return `XFACTOR:${studentId}`;
  return format.replace("{id}", studentId);
}

export function parseStudentIdFromQr(scannedValue, qrFormat) {
  const value = sanitizeText(scannedValue, 220);
  const format = sanitizeText(qrFormat || "XFACTOR:{id}", 120);
  if (!value) return "";

  if (format.includes("{id}")) {
    const regexText = `^${escapeRegex(format).replace("\\{id\\}", "(.+?)")}$`;
    const match = value.match(new RegExp(regexText));
    if (match?.[1]) {
      return sanitizeText(match[1], 120);
    }
  }

  if (value.startsWith("XFACTOR:")) {
    return sanitizeText(value.slice(8), 120);
  }
  return sanitizeText(value, 120);
}

export async function generateQrToCanvas(canvasElement, value) {
  if (!window.QRCode?.toCanvas) {
    throw new Error("QR generation library unavailable.");
  }
  await window.QRCode.toCanvas(canvasElement, value, {
    width: 240,
    margin: 2,
    color: {
      dark: "#0e3a67",
      light: "#ffffff"
    }
  });
}

export function downloadCanvasPng(canvasElement, filename) {
  const dataUrl = canvasElement.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function printCanvas(canvasElement, title = "Student QR Code") {
  const dataUrl = canvasElement.toDataURL("image/png");
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; margin-top: 32px; }
          img { width: 280px; height: 280px; border: 1px solid #ddd; padding: 12px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <img src="${dataUrl}" alt="QR Code">
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export class StudentQrScanner {
  constructor(regionId) {
    if (!window.Html5Qrcode) {
      throw new Error("QR scanner library unavailable.");
    }
    this.scanner = new window.Html5Qrcode(regionId);
    this.running = false;
  }

  async start(onSuccess, onError) {
    if (this.running) return;
    await this.scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 230 },
      (decodedText) => onSuccess(decodedText),
      (errorMessage) => {
        if (typeof onError === "function") onError(errorMessage);
      }
    );
    this.running = true;
  }

  async stop() {
    if (!this.running) return;
    try {
      await this.scanner.stop();
      await this.scanner.clear();
    } finally {
      this.running = false;
    }
  }
}
