import { SCHEMA_VERSION } from './db';

/**
 * Save-data migrations. Each entry upgrades a full export payload from version N to
 * N + 1. Imports run every step from the file's version up to SCHEMA_VERSION.
 * Example for the future:
 *   2: (data) => ({ ...data, quests: data.quests.map((q) => ({ ...q, newField: 0 })) }),
 */
export type SaveData = Record<string, unknown[]>;
type Migration = (data: SaveData) => SaveData;

export const MIGRATIONS: Record<number, Migration> = {};

export function migrateSave(data: SaveData, fromVersion: number, migrations = MIGRATIONS, target = SCHEMA_VERSION): SaveData {
  if (fromVersion > target) {
    throw new Error(`This save comes from a newer version of Emberfall (v${fromVersion}). Update the app first.`);
  }
  let out = data;
  for (let v = fromVersion + 1; v <= target; v++) {
    const step = migrations[v];
    if (!step) throw new Error(`Missing migration to save version ${v}.`);
    out = step(out);
  }
  return out;
}
