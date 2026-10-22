import { describe, expect, it } from 'vitest';
import { addBonuses, emptyBonuses } from './bonuses';
import { computeBonuses } from './character';
import { dropChance, generateItem, RARITY_ORDER, RELICS, rollDrop, rollRarity, slotsForBase } from './loot';
import { seeded } from './random';

describe('drop chance', () => {
  it('scales with quest size and is certain for Bosses', () => {
    const b = emptyBonuses();
    const small = dropChance({ type: 'quest', estMinutes: 5 }, b);
    const big = dropChance({ type: 'quest', estMinutes: 90 }, b);
    expect(big).toBeGreaterThan(small);
    expect(dropChance({ type: 'boss', estMinutes: 5 }, b)).toBe(1);
    expect(dropChance({ type: 'quest', estMinutes: 9999 }, addBonuses(b, { dropPct: 500 }))).toBeLessThanOrEqual(0.95);
  });

  it('respects regional drop bonuses', () => {
    const b = addBonuses(emptyBonuses(), { regionDropPct: { hearth: 50 } });
    expect(dropChance({ type: 'quest', estMinutes: 10, regionId: 'hearth' }, b)).toBeGreaterThan(
      dropChance({ type: 'quest', estMinutes: 10, regionId: 'forge' }, b),
    );
  });
});

describe('pity timer', () => {
  const never = () => 0.999;

  it('guarantees a drop on the 5th quest without loot', () => {
    let pity = 0;
    const results = [];
    for (let i = 0; i < 5; i++) {
      const r = rollDrop(0, pity, 5, never);
      results.push(r.dropped);
      pity = r.pity;
    }
    expect(results).toEqual([false, false, false, false, true]);
    expect(pity).toBe(0);
  });

  it('resets after any natural drop', () => {
    const r = rollDrop(0.5, 3, 5, () => 0.1);
    expect(r).toEqual({ dropped: true, pity: 0, guaranteed: false });
  });

  it('a lower threshold (from gear/tree) guarantees sooner', () => {
    let pity = 0;
    let n = 0;
    do {
      const r = rollDrop(0, pity, 4, never);
      pity = r.pity;
      n++;
      if (r.dropped) break;
    } while (n < 10);
    expect(n).toBe(4);
  });

  it('never goes more than 5 quests without loot over a long random run', () => {
    const rng = seeded(42);
    let pity = 0;
    let since = 0;
    let worst = 0;
    for (let i = 0; i < 2000; i++) {
      const r = rollDrop(0.1, pity, 5, rng);
      pity = r.pity;
      since = r.dropped ? 0 : since + 1;
      worst = Math.max(worst, since);
    }
    expect(worst).toBeLessThanOrEqual(4);
  });
});

describe('rarity and item generation', () => {
  it('respects the minimum rarity', () => {
    const rng = seeded(7);
    for (let i = 0; i < 200; i++) {
      expect(RARITY_ORDER.indexOf(rollRarity(rng, 0, 'enchanted'))).toBeGreaterThanOrEqual(1);
    }
  });

  it('produces roughly the intended spread, and magic find shifts it up', () => {
    const count = (mf: number) => {
      const rng = seeded(1234);
      const c = { worn: 0, enchanted: 0, rare: 0, relic: 0 };
      for (let i = 0; i < 5000; i++) c[rollRarity(rng, mf)]++;
      return c;
    };
    const plain = count(0);
    expect(plain.worn).toBeGreaterThan(plain.enchanted);
    expect(plain.enchanted).toBeGreaterThan(plain.rare);
    expect(plain.rare).toBeGreaterThan(plain.relic);
    expect(plain.relic).toBeGreaterThan(0);
    const lucky = count(100);
    expect(lucky.rare + lucky.relic).toBeGreaterThan(plain.rare + plain.relic);
  });

  it('gives each rarity the right number of affixes', () => {
    const rng = seeded(99);
    for (let i = 0; i < 100; i++) {
      expect(generateItem(rng, 'worn', 0).affixes).toHaveLength(1);
      const e = generateItem(rng, 'enchanted', 0).affixes.length;
      expect(e).toBeGreaterThanOrEqual(1);
      expect(e).toBeLessThanOrEqual(2);
      expect(generateItem(rng, 'rare', 0).affixes).toHaveLength(3);
      const relic = generateItem(rng, 'relic', 0);
      expect(relic.uniqueId).toBeDefined();
      expect(relic.affixes.length + 1).toBe(4);
    }
  });

  it('never rolls the same affix twice on one item', () => {
    const rng = seeded(5);
    for (let i = 0; i < 200; i++) {
      const item = generateItem(rng, 'rare', 0);
      const keys = item.affixes.map((a) => a.stat + (a.regionId ?? ''));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('items fit a paper-doll slot and have a name and flavour', () => {
    const rng = seeded(3);
    for (let i = 0; i < 100; i++) {
      const item = generateItem(rng, 'enchanted', 0);
      expect(slotsForBase(item.base).length).toBeGreaterThan(0);
      expect(item.name.length).toBeGreaterThan(3);
      expect(item.flavour.length).toBeGreaterThan(3);
    }
  });

  it('equipped gear and relic effects feed the bonuses', () => {
    const rng = seeded(11);
    const item = generateItem(rng, 'relic', 0);
    const relic = RELICS.find((r) => r.id === item.uniqueId)!;
    const b = computeBonuses([item], [], null);
    const sum = Object.values(relic.patch).length + item.affixes.length;
    expect(sum).toBeGreaterThan(0);
    expect(computeBonuses([], [], null)).toEqual(emptyBonuses());
    expect(b).not.toEqual(emptyBonuses());
  });
});
