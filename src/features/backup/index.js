import { card, toast, escapeHtml, table, emptyState } from "../../ui/components/primitives.js";
import { BackupService } from "./service.js";
import { db } from "../../data/db/client.js";

export async function renderBackup() {
  const jobs = await db.backupJobs.toArray();
  const rows = jobs
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 12)
    .map((j) => [escapeHtml(j.createdAt), escapeHtml(j.status), escapeHtml(j.message || "-")]);

  return `
    ${card("Backup & Restore", `
      <form id="localBackupForm" class="form-grid">
        <label class="switch"><input type="checkbox" name="encrypted"> Encrypt backup</label>
        <label class="field"><span>Passphrase (required if encrypted)</span><input class="input" name="passphrase" type="password"></label>
        <button class="btn" type="submit">Back Up Now</button>
      </form>
      <hr>
      <form id="restoreForm" class="form-grid">
        <label class="field"><span>Backup file</span><input class="input" name="file" type="file" accept="application/json,.json" required></label>
        <label class="field"><span>Passphrase (if encrypted)</span><input class="input" name="passphrase" type="password"></label>
        <button class="btn" type="button" id="previewRestoreBtn">Preview restore</button>
        <label class="switch"><input type="checkbox" name="confirmOverwrite" required> Confirm overwrite existing data</label>
        <button class="btn btn-danger" type="submit">Restore backup</button>
      </form>
      <pre id="restorePreview" class="pre">No restore preview yet.</pre>
      <hr>
      <div class="toolbar">
        <button id="queueCloudBtn" class="btn" type="button">Queue Cloud Backup</button>
        <button id="processQueueBtn" class="btn btn-ghost" type="button">Run Queue</button>
        <button id="restoreDriveBtn" class="btn btn-ghost" type="button">Restore Latest From Drive</button>
      </div>
    `)}
    ${card("Backup Queue", rows.length ? table(["Created", "Status", "Message"], rows) : emptyState("No backup jobs yet."))}
  `;
}

export function bindBackup(root, rerender) {
  root.querySelector("#localBackupForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      await BackupService.downloadBackup({
        encrypted: form.get("encrypted") === "on",
        passphrase: String(form.get("passphrase") || "")
      });
      toast("Backup downloaded.", "success");
    } catch (error) {
      toast(error.message, "error");
    }
  });

  root.querySelector("#previewRestoreBtn")?.addEventListener("click", async () => {
    try {
      const formEl = root.querySelector("#restoreForm");
      const form = new FormData(formEl);
      const file = form.get("file");
      if (!(file instanceof File)) throw new Error("Select a backup file first.");
      const preview = await BackupService.previewRestore(file);
      root.querySelector("#restorePreview").textContent = JSON.stringify(preview, null, 2);
      toast("Restore preview generated.", "success");
    } catch (error) {
      toast(error.message, "error");
    }
  });

  root.querySelector("#restoreForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      const file = form.get("file");
      if (!(file instanceof File)) throw new Error("Select a backup file.");
      const overwrite = form.get("confirmOverwrite") === "on";
      await BackupService.restore(file, {
        overwrite,
        passphrase: String(form.get("passphrase") || "")
      });
      toast("Restore completed.", "success");
      await rerender();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  root.querySelector("#queueCloudBtn")?.addEventListener("click", async () => {
    try {
      await BackupService.queueCloudBackup();
      toast("Cloud backup queued.", "success");
      await rerender();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  root.querySelector("#processQueueBtn")?.addEventListener("click", async () => {
    const out = await BackupService.processQueue();
    toast(`Queue processed. Success: ${out.processed}, Failed: ${out.failed}`, out.failed ? "warn" : "success");
    await rerender();
  });

  root.querySelector("#restoreDriveBtn")?.addEventListener("click", async () => {
    try {
      const ok = window.confirm("Restore latest backup from Google Drive and overwrite local data?");
      if (!ok) return;
      const passphrase = window.prompt("Enter passphrase if backup is encrypted (leave blank if not encrypted):", "") || "";
      const result = await BackupService.restoreLatestFromDrive({ overwrite: true, passphrase });
      toast(`Drive restore completed from ${result.file?.name || "latest backup"}.`, "success");
      await rerender();
    } catch (error) {
      toast(error.message, "error");
    }
  });
}