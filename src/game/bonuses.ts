/**
 * All in-app bonuses (from gear, passive tree nodes and world events) collapse into
 * one Bonuses object. Percentages are whole numbers: 10 means +10%.
 */
export interface Bonuses {
  xpPct: number;
  goldPct: number;
  dropPct: number;
  runXpPct: number;
  /** Extra XP for quests in a specific region. */
  regionXpPct: Record<string, number>;
  /** Extra drop chance for quests in a specific region. */
  regionDropPct: Record<string, number>;
  lowEnergyXpPct: number;
  bossXpPct: number;
  /** Shifts rarity rolls upward. */
  magicFind: number;
  /** Extra days before Blight sets in. */
  blightGraceDays: number;
  /** Pity timer guarantees a drop after this many quests without one. */
  pityThreshold: number;
  /** Discount on Merchant rewards. */
  merchantDiscountPct: number;
  themes: string[];
}

export function emptyBonuses(): Bonuses {
  return {
    xpPct: 0,
    goldPct: 0,
    dropPct: 0,
    runXpPct: 0,
    regionXpPct: {},
    regionDropPct: {},
    lowEnergyXpPct: 0,
    bossXpPct: 0,
    magicFind: 0,
    blightGraceDays: 0,
    pityThreshold: 5,
    merchantDiscountPct: 0,
    themes: ['ember'],
  };
}

export type BonusPatch = Partial<Omit<Bonuses, 'regionXpPct' | 'regionDropPct' | 'themes' | 'pityThreshold'>> & {
  regionXpPct?: Record<string, number>;
  regionDropPct?: Record<string, number>;
  themes?: string[];
  /** Reduces the pity threshold (e.g. -1 → guaranteed drop every 4 quests). */
  pityDelta?: number;
};

export function addBonuses(base: Bonuses, patch: BonusPatch): Bonuses {
  const out: Bonuses = {
    ...base,
    regionXpPct: { ...base.regionXpPct },
    regionDropPct: { ...base.regionDropPct },
    themes: [...base.themes],
  };
  const numeric = [
    'xpPct',
    'goldPct',
    'dropPct',
    'runXpPct',
    'lowEnergyXpPct',
    'bossXpPct',
    'magicFind',
    'blightGraceDays',
    'merchantDiscountPct',
  ] as const;
  for (const k of numeric) {
    if (patch[k]) out[k] += patch[k]!;
  }
  for (const [r, v] of Object.entries(patch.regionXpPct ?? {})) out.regionXpPct[r] = (out.regionXpPct[r] ?? 0) + v;
  for (const [r, v] of Object.entries(patch.regionDropPct ?? {})) out.regionDropPct[r] = (out.regionDropPct[r] ?? 0) + v;
  for (const t of patch.themes ?? []) if (!out.themes.includes(t)) out.themes.push(t);
  if (patch.pityDelta) out.pityThreshold = Math.max(2, out.pityThreshold + patch.pityDelta);
  out.merchantDiscountPct = Math.min(50, out.merchantDiscountPct);
  return out;
}
