import { db, getMeta, SCHEMA_VERSION, setMeta } from '../db/db';
import { defaultCharacter, defaultRegions, defaultSettings } from '../db/seed';

/** First launch: create the character, regions and settings. Safe to call every launch. */
export async function ensureInitialized(now = Date.now()) {
  await db.transaction('rw', db.character, db.regions, db.settings, db.meta, async () => {
    if (!(await db.character.get('me'))) await db.character.put(defaultCharacter(now));
    if ((await db.regions.count()) === 0) await db.regions.bulkPut(defaultRegions(now));
    if (!(await db.settings.get('settings'))) await db.settings.put(defaultSettings());
    if ((await getMeta('schemaVersion')) === undefined) await setMeta('schemaVersion', SCHEMA_VERSION);
  });
}
