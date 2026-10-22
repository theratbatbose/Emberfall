import Dexie, { type EntityTable } from 'dexie';
import type {
  Character,
  Completion,
  EnergyLog,
  FocusRun,
  Item,
  MetaRow,
  MetaValues,
  Purchase,
  Quest,
  Region,
  Reward,
  Settings,
} from './types';

/**
 * Save-file schema version. Bump this whenever the stored shape changes and add a
 * step to `migrations.ts`. Dexie's own version (below) tracks indexes; this one
 * tracks the data shape and travels inside export files.
 */
export const SCHEMA_VERSION = 1;

export class EmberDB extends Dexie {
  character!: EntityTable<Character, 'id'>;
  regions!: EntityTable<Region, 'id'>;
  quests!: EntityTable<Quest, 'id'>;
  completions!: EntityTable<Completion, 'id'>;
  energyLogs!: EntityTable<EnergyLog, 'id'>;
  focusRuns!: EntityTable<FocusRun, 'id'>;
  items!: EntityTable<Item, 'id'>;
  rewards!: EntityTable<Reward, 'id'>;
  purchases!: EntityTable<Purchase, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  meta!: EntityTable<MetaRow, 'key'>;

  constructor(name = 'emberfall') {
    super(name);
    this.version(1).stores({
      character: 'id',
      regions: 'id, order',
      quests: 'id, regionId, type, status, parentId, dueAt',
      completions: 'id, questId, regionId, at, kind',
      energyLogs: 'id, at, source',
      focusRuns: 'id, questId, startedAt',
      items: 'id, location, rarity, obtainedAt',
      rewards: 'id',
      purchases: 'id, rewardId, at',
      settings: 'id',
      meta: 'key',
    });
  }
}

export let db = new EmberDB();

/** Tests use a fresh database per test. */
export function useDatabase(name: string) {
  db = new EmberDB(name);
  return db;
}

export const TABLES = [
  'character',
  'regions',
  'quests',
  'completions',
  'energyLogs',
  'focusRuns',
  'items',
  'rewards',
  'purchases',
  'settings',
  'meta',
] as const;
export type TableName = (typeof TABLES)[number];

export async function getMeta<K extends keyof MetaValues>(key: K): Promise<MetaValues[K] | undefined> {
  const row = await db.meta.get(key);
  return row?.value as MetaValues[K] | undefined;
}

export async function setMeta<K extends keyof MetaValues>(key: K, value: MetaValues[K]) {
  await db.meta.put({ key, value });
}
