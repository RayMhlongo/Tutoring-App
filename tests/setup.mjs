import "fake-indexeddb/auto";
import Dexie from "dexie";

if (!globalThis.window) {
  globalThis.window = globalThis;
}

window.Dexie = Dexie;

if (!globalThis.localStorage) {
  const map = new Map();
  globalThis.localStorage = {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(String(key), String(value));
    },
    removeItem(key) {
      map.delete(String(key));
    },
    clear() {
      map.clear();
    }
  };
}

if (!globalThis.atob) {
  globalThis.atob = (input) => Buffer.from(String(input), "base64").toString("binary");
}

if (!globalThis.btoa) {
  globalThis.btoa = (input) => Buffer.from(String(input), "binary").toString("base64");
}

if (!globalThis.navigator) {
  globalThis.navigator = {
    onLine: true,
    mediaDevices: {
      async getUserMedia() {
        return {
          getTracks() {
            return [];
          }
        };
      }
    }
  };
}

window.QRCode = {
  async toDataURL(value) {
    return `data:image/png;base64,${Buffer.from(String(value)).toString("base64")}`;
  },
  async toCanvas(canvas, value) {
    const ctx = canvas?.getContext?.("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#0e3a67";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(String(value || ""), 5, 20);
    }
  }
};
