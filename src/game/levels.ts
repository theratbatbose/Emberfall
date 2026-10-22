import type { AttributeKey } from '../db/types';

/** XP needed to go from `level` to `level + 1`. Level 1 → 2 needs 100. */
export function xpToNext(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  into: number;
  /** XP the current level needs in total. */
  needed: number;
  progress: number;
}

export function levelInfo(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  while (remaining >= xpToNext(level) && level < 999) {
    remaining -= xpToNext(level);
    level++;
  }
  const needed = xpToNext(level);
  return { level, into: remaining, needed, progress: remaining / needed };
}

export function totalXpForLevel(level: number): number {
  let sum = 0;
  for (let l = 1; l < level; l++) sum += xpToNext(l);
  return sum;
}

/** Attribute rank from the XP earned in its region: rank n needs 25·n² XP. */
export function attributeLevel(xp: number): number {
  return 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 25));
}

export function attributeProgress(xp: number): number {
  const lvl = attributeLevel(xp);
  const cur = 25 * (lvl - 1) ** 2;
  const next = 25 * lvl ** 2;
  return (xp - cur) / (next - cur);
}

export const ATTRIBUTES: { key: AttributeKey; name: string; blurb: string }[] = [
  { key: 'vitality', name: 'Vitality', blurb: 'Body tended, blood kept warm.' },
  { key: 'might', name: 'Might', blurb: 'Work hammered into shape.' },
  { key: 'fortitude', name: 'Fortitude', blurb: 'A hearth that holds.' },
  { key: 'intellect', name: 'Intellect', blurb: 'Pages turned, lessons kept.' },
  { key: 'spirit', name: 'Spirit', blurb: 'Lanterns lit for others.' },
];

/** Skill points: one per level gained. */
export function skillPointsTotal(level: number): number {
  return Math.max(0, level - 1);
}
