import { db, initStorage, setSetting } from "../src/storage.js";
import { DEFAULT_SETTINGS, TABLES } from "../src/config.js";

const TABLE_KEYS = [
  TABLES.students,
  TABLES.lessons,
  TABLES.attendance,
  TABLES.payments,
  TABLES.expenses,
  TABLES.schedule,
  TABLES.reports,
  TABLES.syncQueue,
  TABLES.settings
];

export async function resetDatabase() {
  await initStorage();
  await db.transaction("rw", ...TABLE_KEYS.map((table) => db[table]), async () => {
    for (const table of TABLE_KEYS) {
      await db[table].clear();
    }
  });
  await setSetting("appSettings", DEFAULT_SETTINGS);
}
