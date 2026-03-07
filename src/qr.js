import { sanitizeText } from "./utils.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeCameraError(error) {
  const raw = String(error?.message || error?.name || "").toLowerCase();
  if (raw.includes("notallowed") || raw.includes("permission denied") || raw.includes("denied")) {
    return "Camera permission denied. Allow camera access for this app and try again.";
  }
  if (raw.includes("notfound") || raw.includes("no camera") || raw.includes("overconstrained")) {
    return "No usable camera was found on this device.";
  }
  if (raw.includes("notreadable") || raw.includes("trackstart")) {
    return "Camera is busy in another app. Close other camera apps and retry.";
  }
  return error?.message || "Camera could not start.";
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
    this.region = document.getElementById(regionId);
    if (!this.region) {
      throw new Error("Scanner area not found.");
    }
    this.mode = window.Html5Qrcode ? "html5qrcode" : "native";
    if (this.mode === "html5qrcode") {
      this.scanner = new window.Html5Qrcode(regionId);
    } else if (!navigator.mediaDevices?.getUserMedia || typeof window.BarcodeDetector === "undefined") {
      throw new Error("QR scanner library unavailable.");
    }
    this.running = false;
    this.nativeStream = null;
    this.nativeLoop = null;
    this.nativeVideo = null;
    this.scanLocked = false;
    this.permissionChecked = false;
  }

  async ensureCameraPermission() {
    if (this.permissionChecked) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera API is unavailable on this device.");
    }
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      this.permissionChecked = true;
    } catch (error) {
      throw new Error(normalizeCameraError(error));
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
    }
  }

  async start(onSuccess, onError) {
    if (this.running) return;
    await this.ensureCameraPermission();
    if (this.mode === "html5qrcode") {
      await this.startHtml5Scanner(onSuccess, onError);
    } else {
      await this.startNativeScanner(onSuccess, onError);
    }
    this.running = true;
  }

  async startHtml5Scanner(onSuccess, onError) {
    const successHandler = async (decodedText) => {
      if (this.scanLocked) return;
      this.scanLocked = true;
      try {
        await onSuccess(decodedText);
      } finally {
        window.setTimeout(() => {
          this.scanLocked = false;
        }, 900);
      }
    };
    const errorHandler = (errorMessage) => {
      if (typeof onError === "function") onError(errorMessage);
    };
    const scannerOptions = { fps: 10, qrbox: 230 };
    const attempts = [
      { facingMode: { exact: "environment" } },
      { facingMode: "environment" }
    ];
    let lastError = null;
    for (const camera of attempts) {
      try {
        await this.scanner.start(camera, scannerOptions, successHandler, errorHandler);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    try {
      const cameras = await window.Html5Qrcode.getCameras();
      if (Array.isArray(cameras) && cameras.length) {
        const preferred = cameras.find((cam) => /(back|rear|environment)/i.test(cam.label || "")) || cameras[0];
        await this.scanner.start(preferred.id, scannerOptions, successHandler, errorHandler);
        return;
      }
    } catch (error) {
      lastError = error;
    }
    if (lastError) {
      throw new Error(normalizeCameraError(lastError));
    }
    throw new Error("No camera available.");
  }

  async startNativeScanner(onSuccess, onError) {
    const supportsQr = await window.BarcodeDetector.getSupportedFormats()
      .then((formats) => formats.includes("qr_code"))
      .catch(() => false);
    if (!supportsQr) {
      throw new Error("QR scanning is not supported on this browser.");
    }

    try {
      this.nativeStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
    } catch (error) {
      throw new Error(normalizeCameraError(error));
    }

    const video = document.createElement("video");
    video.setAttribute("playsinline", "true");
    video.autoplay = true;
    video.muted = true;
    video.style.width = "100%";
    video.style.borderRadius = "12px";
    video.srcObject = this.nativeStream;
    this.region.innerHTML = "";
    this.region.appendChild(video);
    await video.play();
    this.nativeVideo = video;

    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    const scanLoop = async () => {
      if (!this.running) return;
      try {
        const found = await detector.detect(video);
        const first = found?.[0]?.rawValue;
        if (first) {
          if (!this.scanLocked) {
            this.scanLocked = true;
            try {
              await onSuccess(first);
            } finally {
              window.setTimeout(() => {
                this.scanLocked = false;
              }, 900);
            }
          }
        }
      } catch (error) {
        if (typeof onError === "function") onError(error?.message || "Scan error");
      }
      this.nativeLoop = window.setTimeout(scanLoop, 180);
    };
    this.nativeLoop = window.setTimeout(scanLoop, 180);
  }

  async stop() {
    if (!this.running) return;
    try {
      if (this.mode === "html5qrcode") {
        try {
          await this.scanner.stop();
        } catch {
          // scanner may already be stopped
        }
        try {
          await this.scanner.clear();
        } catch {
          // scanner view may already be cleared
        }
      } else {
        if (this.nativeLoop) {
          window.clearTimeout(this.nativeLoop);
          this.nativeLoop = null;
        }
        if (this.nativeVideo) {
          this.nativeVideo.pause();
          this.nativeVideo.srcObject = null;
          this.nativeVideo.remove();
          this.nativeVideo = null;
        }
        if (this.nativeStream) {
          this.nativeStream.getTracks().forEach((track) => track.stop());
          this.nativeStream = null;
        }
      }
    } finally {
      this.scanLocked = false;
      this.running = false;
    }
  }
}
