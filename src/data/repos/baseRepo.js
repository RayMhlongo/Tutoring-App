import { nowIso, sanitizeText, uid } from "../../utils/common.js";
import { db } from "../db/client.js";

export function createRepository(tableName, options = {}) {
  const prefix = options.idPrefix || tableName.slice(0, 3);
  const sanitize = options.sanitize || ((value) => value);

  return {
    async create(payload) {
      const now = nowIso();
      const entity = {
        id: payload.id || uid(prefix),
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
        status: sanitizeText(payload.status || "active", 20),
        version: Number(payload.version || 1),
        ...sanitize(payload)
      };
      await db[tableName].put(entity);
      return entity;
    },

    async update(id, patch) {
      const current = await db[tableName].get(id);
      if (!current) throw new Error("Record not found.");
      const next = {
        ...current,
        ...sanitize(patch),
        id: current.id,
        updatedAt: nowIso(),
        version: Number(current.version || 1) + 1
      };
      await db[tableName].put(next);
      return next;
    },

    async archive(id) {
      return this.update(id, { archivedAt: nowIso(), status: "archived" });
    },

    async getById(id) {
      return db[tableName].get(id);
    },

    async list({ includeArchived = false } = {}) {
      const rows = await db[tableName].toArray();
      const filtered = includeArchived ? rows : rows.filter((row) => !row.archivedAt);
      return filtered.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    },

    async search(term) {
      const needle = sanitizeText(term, 120).toLowerCase();
      if (!needle) return this.list();
      const rows = await this.list();
      return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(needle));
    },

    async stats() {
      const rows = await this.list();
      return {
        total: rows.length,
        archived: (await db[tableName].toArray()).filter((row) => Boolean(row.archivedAt)).length
      };
    }
  };
}