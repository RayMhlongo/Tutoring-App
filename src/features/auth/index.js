import { card, toast } from "../../ui/components/primitives.js";
import { login } from "./service.js";

export function renderAuthGate() {
  return `
    <div class="auth-wrap">
      ${card("Secure Access", `
        <p class="muted">Use your local admin credentials to unlock EduPulse.</p>
        <form id="loginForm" class="form-grid">
          <label class="field"><span>Username</span><input class="input" name="username" value="admin" required></label>
          <label class="field"><span>Passcode</span><input class="input" name="passcode" type="password" required></label>
          <label class="switch"><input type="checkbox" name="remember" checked> Remember this session</label>
          <button class="btn" type="submit">Unlock App</button>
        </form>
      `)}
    </div>
  `;
}

export function bindAuthGate(root, onSuccess) {
  root.querySelector("#loginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await login(String(form.get("username") || ""), String(form.get("passcode") || ""), form.get("remember") === "on");
      onSuccess();
    } catch (error) {
      toast(error.message, "error");
    }
  });
}