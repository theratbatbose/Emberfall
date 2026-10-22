import type { BonusPatch } from './bonuses';
import { hashString, seeded } from './random';

/** Rare world events: roughly one day in six has one. Same for the whole day. */
export interface WorldEvent {
  id: string;
  name: string;
  text: string;
  patch: BonusPatch;
}

export const WORLD_EVENTS: WorldEvent[] = [
  { id: 'ember-moon', name: 'Ember Moon', text: 'The moon burns orange. Loot chance +25% today.', patch: { dropPct: 25 } },
  { id: 'caravan', name: 'The Ash Caravan', text: 'Traders roll through. Merchant rewards cost 20% less today.', patch: { merchantDiscountPct: 20 } },
  { id: 'spring', name: 'Bloodwell Spring', text: 'Warm water rises. Bloodwell quests grant +50% XP today.', patch: { regionXpPct: { bloodwell: 50 } } },
  { id: 'bellows', name: 'The Great Bellows', text: 'The Forge roars. Dungeon Runs grant +30% XP today.', patch: { runXpPct: 30 } },
  { id: 'starfall', name: 'Starfall', text: 'Glittering ash. Much finer loot today.', patch: { magicFind: 40 } },
  { id: 'gold-rain', name: 'Gilt Rain', text: 'Coins in the gutters. +40% gold today.', patch: { goldPct: 40 } },
];

export function eventForDay(day: string): WorldEvent | null {
  const rng = seeded(hashString('event:' + day));
  if (rng() >= 1 / 6) return null;
  return WORLD_EVENTS[Math.floor(rng() * WORLD_EVENTS.length)];
}
