import { bootstrap } from "./app/bootstrap.js";

bootstrap().catch((error) => {
  const root = document.getElementById("app");
  if (root) {
    root.innerHTML = `<div class="fatal"><h1>Startup Error</h1><p>${error.message}</p></div>`;
  }
  // eslint-disable-next-line no-console
  console.error(error);
});