import { db, SCHEMA_VERSION, setMeta, TABLES, type TableName } from './db';
import { migrateSave, type SaveData } from './migrations';

export interface SaveFile {
  app: 'emberfall';
  schemaVersion: number;
  exportedAt: number;
  data: SaveData;
}

export async function exportSave(now = Date.now()): Promise<SaveFile> {
  const data: SaveData = {};
  await db.transaction('r', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) data[t] = await db.table(t).toArray();
  });
  return { app: 'emberfall', schemaVersion: SCHEMA_VERSION, exportedAt: now, data };
}

export function saveFileName(now = Date.now()): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `emberfall-save-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

/** Check a parsed file looks like an Emberfall save before touching the real data. */
export function validateSave(raw: unknown): SaveFile {
  if (!raw || typeof raw !== 'object') throw new Error('That file isn’t an Emberfall save.');
  const f = raw as Partial<SaveFile>;
  if (f.app !== 'emberfall') throw new Error('That file isn’t an Emberfall save.');
  if (typeof f.schemaVersion !== 'number' || !f.data || typeof f.data !== 'object') {
    throw new Error('The save file looks damaged (missing version or data).');
  }
  for (const [k, v] of Object.entries(f.data)) {
    if (!Array.isArray(v)) throw new Error(`The save file looks damaged (${k} isn’t a list).`);
  }
  const data = f.data as SaveData;
  if (!data.character?.length) throw new Error('The save file has no character in it.');
  return f as SaveFile;
}

/** Replace everything with the save's contents, in one transaction (all or nothing). */
export async function importSave(raw: unknown): Promise<void> {
  const file = validateSave(raw);
  const data = migrateSave(file.data, file.schemaVersion);
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      const rows = (data[t as TableName] ?? []) as object[];
      if (rows.length) await db.table(t).bulkPut(rows);
    }
  });
  await setMeta('schemaVersion', SCHEMA_VERSION);
  await setMeta('lastBackupAt', Date.now());
}
