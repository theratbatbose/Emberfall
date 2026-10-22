import { describe, expect, it } from 'vitest';
import { addBonuses, emptyBonuses } from './bonuses';
import { levelInfo, totalXpForLevel, xpToNext, attributeLevel } from './levels';
import { baseQuestXp, questGold, questXp, runXp, KINDLED_REGION_BONUS_PCT } from './xp';

const q = (over: Partial<Parameters<typeof questXp>[0]> = {}) => ({
  type: 'quest' as const,
  energyTag: 'med' as const,
  estMinutes: 30,
  regionId: 'forge',
  ...over,
});

describe('XP formula', () => {
  it('matches (10 + 4√min) × type × energy', () => {
    expect(baseQuestXp({ type: 'habit', energyTag: 'low', estMinutes: 0 })).toBe(10);
    expect(baseQuestXp({ type: 'quest', energyTag: 'med', estMinutes: 25 })).toBeCloseTo((10 + 20) * 1.2 * 1.2);
    expect(baseQuestXp({ type: 'boss', energyTag: 'high', estMinutes: 100 })).toBeCloseTo((10 + 40) * 2 * 1.5);
  });

  it('always gives meaningful XP for tiny low-energy tasks', () => {
    const xp = questXp(q({ type: 'habit', energyTag: 'low', estMinutes: 2 }), emptyBonuses(), { blighted: true });
    expect(xp).toBeGreaterThanOrEqual(15);
  });

  it('grows with size, type and energy', () => {
    const b = emptyBonuses();
    const small = questXp(q({ estMinutes: 5 }), b, { blighted: false });
    const big = questXp(q({ estMinutes: 60 }), b, { blighted: false });
    const boss = questXp(q({ estMinutes: 60, type: 'boss' }), b, { blighted: false });
    const high = questXp(q({ estMinutes: 60, energyTag: 'high' }), b, { blighted: false });
    expect(big).toBeGreaterThan(small);
    expect(boss).toBeGreaterThan(big);
    expect(high).toBeGreaterThan(big);
  });

  it('caps minutes so a typo cannot explode XP', () => {
    expect(baseQuestXp({ type: 'quest', energyTag: 'low', estMinutes: 100000 })).toBe(baseQuestXp({ type: 'quest', energyTag: 'low', estMinutes: 240 }));
  });

  it('Blight only removes the Kindled region bonus', () => {
    const b = emptyBonuses();
    const base = baseQuestXp(q());
    expect(questXp(q(), b, { blighted: true })).toBe(Math.round(base));
    expect(questXp(q(), b, { blighted: false })).toBe(Math.round(base * (1 + KINDLED_REGION_BONUS_PCT / 100)));
  });

  it('applies global, regional, low-energy and boss bonuses', () => {
    const b = addBonuses(emptyBonuses(), { xpPct: 10, regionXpPct: { forge: 20 }, lowEnergyXpPct: 50, bossXpPct: 100 });
    const base = baseQuestXp(q());
    expect(questXp(q(), b, { blighted: true })).toBe(Math.round(base * 1.3));
    expect(questXp(q({ regionId: 'hearth' }), b, { blighted: true })).toBe(Math.round(base * 1.1));
    const low = q({ energyTag: 'low' });
    expect(questXp(low, b, { blighted: true })).toBe(Math.round(baseQuestXp(low) * 1.8));
  });

  it('gold is half XP plus gold bonus', () => {
    expect(questGold(40, emptyBonuses())).toBe(20);
    expect(questGold(40, addBonuses(emptyBonuses(), { goldPct: 50 }))).toBe(30);
  });

  it('run XP scales with minutes and gives nothing for an instant abandon', () => {
    const b = emptyBonuses();
    expect(runXp(0, b)).toBe(0);
    expect(runXp(5, b)).toBe(15);
    expect(runXp(25, b)).toBe(55);
    expect(runXp(25, addBonuses(b, { runXpPct: 20 }))).toBe(66);
  });
});

describe('levels', () => {
  it('level 2 needs 100 XP and the curve rises', () => {
    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(2)).toBeGreaterThan(xpToNext(1));
    expect(levelInfo(0)).toMatchObject({ level: 1, into: 0, needed: 100 });
    expect(levelInfo(99).level).toBe(1);
    expect(levelInfo(100)).toMatchObject({ level: 2, into: 0 });
  });

  it('totalXpForLevel and levelInfo agree', () => {
    for (const lvl of [2, 5, 10, 20]) {
      expect(levelInfo(totalXpForLevel(lvl)).level).toBe(lvl);
      expect(levelInfo(totalXpForLevel(lvl) - 1).level).toBe(lvl - 1);
    }
  });

  it('attribute ranks grow with region XP', () => {
    expect(attributeLevel(0)).toBe(1);
    expect(attributeLevel(25)).toBe(2);
    expect(attributeLevel(100)).toBe(3);
  });
});
