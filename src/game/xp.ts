import type { Bonuses } from './bonuses';
import type { EnergyTag, QuestType } from '../db/types';

export const TYPE_MULTIPLIER: Record<QuestType, number> = { habit: 1, daily: 1, quest: 1.2, boss: 2 };
export const ENERGY_MULTIPLIER: Record<EnergyTag, number> = { low: 1, med: 1.2, high: 1.5 };

/** Regions that aren't blighted get this "Kindled" bonus. Blight only ever removes it. */
export const KINDLED_REGION_BONUS_PCT = 10;

export interface XpInput {
  type: QuestType;
  energyTag: EnergyTag;
  estMinutes: number;
  regionId: string;
}

/**
 * Base XP = (10 + 4·√minutes) × type × energy.
 * The flat 10 means even a 1-minute low-energy task is always worth doing.
 */
export function baseQuestXp(q: Omit<XpInput, 'regionId'>): number {
  const minutes = Math.min(Math.max(q.estMinutes || 0, 0), 240);
  return (10 + 4 * Math.sqrt(minutes)) * TYPE_MULTIPLIER[q.type] * ENERGY_MULTIPLIER[q.energyTag];
}

export function questXp(q: XpInput, bonuses: Bonuses, opts: { blighted: boolean }): number {
  let pct = bonuses.xpPct + (bonuses.regionXpPct[q.regionId] ?? 0);
  if (!opts.blighted) pct += KINDLED_REGION_BONUS_PCT;
  if (q.energyTag === 'low') pct += bonuses.lowEnergyXpPct;
  if (q.type === 'boss') pct += bonuses.bossXpPct;
  return Math.max(1, Math.round(baseQuestXp(q) * (1 + pct / 100)));
}

/** Gold is half the XP, boosted by gold bonuses. */
export function questGold(xp: number, bonuses: Bonuses): number {
  return Math.max(1, Math.round(xp * 0.5 * (1 + bonuses.goldPct / 100)));
}

/** Dungeon Run XP: 5 + 2 per focused minute. Partial runs earn for the minutes they did. */
export function runXp(minutes: number, bonuses: Bonuses): number {
  const m = Math.max(0, minutes);
  if (m < 0.5) return 0;
  return Math.max(1, Math.round((5 + 2 * m) * (1 + (bonuses.runXpPct + bonuses.xpPct) / 100)));
}
