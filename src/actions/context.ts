import { db, getMeta } from '../db/db';
import { defaultCharacter, defaultRegions, defaultSettings } from '../db/seed';
import type { Character, Item, Region, Settings } from '../db/types';
import { blightStage, effectiveBlightDays } from '../game/blight';
import type { Bonuses } from '../game/bonuses';
import { computeBonuses } from '../game/character';
import { eventForDay, type WorldEvent } from '../game/events';
import { dayKey } from '../game/time';

export interface GameContext {
  character: Character;
  settings: Settings;
  regions: Region[];
  equippedItems: Item[];
  event: WorldEvent | null;
  bonuses: Bonuses;
  blightDays: number;
  pity: number;
}

export async function getCharacter(): Promise<Character> {
  return (await db.character.get('me')) ?? defaultCharacter(Date.now());
}

export async function getSettings(): Promise<Settings> {
  return { ...defaultSettings(), ...((await db.settings.get('settings')) ?? {}) };
}

export async function loadContext(now: number): Promise<GameContext> {
  const character = await getCharacter();
  const settings = await getSettings();
  const regions = await db.regions.orderBy('order').toArray();
  const equippedIds = Object.values(character.equipped).filter((x): x is string => !!x);
  const equippedItems = (await db.items.bulkGet(equippedIds)).filter((x): x is Item => !!x);
  const event = eventForDay(dayKey(now));
  const bonuses = computeBonuses(equippedItems, character.allocatedNodes, event);
  return {
    character,
    settings,
    regions: regions.length ? regions : defaultRegions(now),
    equippedItems,
    event,
    bonuses,
    blightDays: effectiveBlightDays(settings.blightDays, bonuses.blightGraceDays),
    pity: (await getMeta('pityCounter')) ?? 0,
  };
}

export function regionStage(region: Region, ctx: Pick<GameContext, 'blightDays'>, now: number): number {
  if (region.id === 'unsorted') return 0;
  return blightStage(region.lastActivityAt, now, ctx.blightDays);
}
