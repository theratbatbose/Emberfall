import type { Affix, AffixStat, Item, ItemBase, QuestType, Rarity, Slot } from '../db/types';
import type { BonusPatch, Bonuses } from './bonuses';
import { pick, randInt, uid, weighted, type Rng } from './random';

// All names, affixes and lore below are original to Emberfall.

export const RARITY_ORDER: Rarity[] = ['worn', 'enchanted', 'rare', 'relic'];
export const RARITY_LABEL: Record<Rarity, string> = {
  worn: 'Worn',
  enchanted: 'Enchanted',
  rare: 'Rare',
  relic: 'Relic',
};
export const SALVAGE_GOLD: Record<Rarity, number> = { worn: 5, enchanted: 15, rare: 40, relic: 120 };

export const SLOTS: Slot[] = ['weapon', 'helm', 'chest', 'gloves', 'boots', 'amulet', 'ring1', 'ring2', 'relic'];
export const SLOT_LABEL: Record<Slot, string> = {
  weapon: 'Weapon',
  helm: 'Helm',
  chest: 'Chest',
  gloves: 'Gloves',
  boots: 'Boots',
  amulet: 'Amulet',
  ring1: 'Ring',
  ring2: 'Ring',
  relic: 'Relic',
};
export const BASES: ItemBase[] = ['weapon', 'helm', 'chest', 'gloves', 'boots', 'amulet', 'ring', 'relic'];

export function slotsForBase(base: ItemBase): Slot[] {
  if (base === 'ring') return ['ring1', 'ring2'];
  return [base as Slot];
}

const BASE_NAMES: Record<ItemBase, string[]> = {
  weapon: ['Cinder Blade', 'Ashwood Staff', 'Pyre Hatchet', 'Gravel Maul', 'Kindling Knife', 'Soot Spear', 'Brand Sabre'],
  helm: ['Soot Hood', 'Iron Cowl', 'Charred Visor', 'Wick Circlet', 'Smoke Veil'],
  chest: ['Ember Mail', 'Ashcloth Robe', 'Kiln Plate', 'Tallow Jerkin', 'Bellows Coat'],
  gloves: ['Tongs Gauntlets', 'Wick Wraps', 'Coalgrip Gloves', 'Scorch Mitts'],
  boots: ['Cinderwalk Boots', 'Ashen Treads', 'Hearthstep Sabatons', 'Fen Waders'],
  amulet: ['Spark Locket', 'Coal Pendant', 'Tinder Torc', 'Lantern Charm'],
  ring: ['Flint Band', 'Ember Loop', 'Ash Signet', 'Wick Ring', 'Slag Coil'],
  relic: ['Brazier Shard', 'Bell of Embers', 'Kiln Idol', 'Lamp of Vigil'],
};

const BASE_ICON: Record<ItemBase, string> = {
  weapon: 'sword',
  helm: 'helm',
  chest: 'chest',
  gloves: 'gloves',
  boots: 'boots',
  amulet: 'amulet',
  ring: 'ring',
  relic: 'relic',
};

const PREFIXES = ['Smouldering', 'Glowing', 'Tempered', 'Kindled', 'Sootstained', 'Banked', 'Fevered', 'Patient', 'Lit'];
const SUFFIXES = [
  'of the Low Flame',
  'of Small Mercies',
  'of the Open Door',
  'of Quiet Hours',
  'of the Second Wind',
  'of Kept Promises',
  'of the Long Road',
  'of Warm Ash',
];
const RARE_NAME_A = ['Grim', 'Hollow', 'Vesper', 'Cinder', 'Gloam', 'Wraith', 'Pale', 'Dusk', 'Iron', 'Bitter'];
const RARE_NAME_B = ['Coil', 'Ward', 'Hymn', 'Mark', 'Vigil', 'Song', 'Grasp', 'Brand', 'Oath', 'Thorn'];

const FLAVOUR: string[] = [
  'Still warm from someone else’s hard day.',
  'Found under the ash where you stopped to rest.',
  'It hums when you begin something.',
  'Small, plain, and exactly enough.',
  'The Blight never learned its name.',
  'Forged in a fire you kept alive.',
  'Heavier on bad days. Lighter after the first step.',
  'A lantern-keeper left it for whoever came next.',
];

/** Region-specific affixes use the built-in region ids. */
const REGION_NAMES: Record<string, string> = {
  bloodwell: 'Bloodwell',
  forge: 'Forge',
  hearth: 'Hearth',
  archive: 'Archive',
  lanterns: 'Lanterns',
};

interface AffixDef {
  stat: AffixStat;
  min: number;
  max: number;
  text: (v: number, region?: string) => string;
}

const AFFIXES: AffixDef[] = [
  { stat: 'xpPct', min: 2, max: 8, text: (v) => `+${v}% XP from all quests` },
  { stat: 'goldPct', min: 4, max: 12, text: (v) => `+${v}% gold found` },
  { stat: 'dropPct', min: 2, max: 6, text: (v) => `+${v}% loot chance` },
  { stat: 'runXpPct', min: 5, max: 15, text: (v) => `+${v}% Dungeon Run XP` },
  { stat: 'regionXpPct', min: 5, max: 15, text: (v, r) => `+${v}% XP in ${REGION_NAMES[r ?? ''] ?? 'a region'}` },
  { stat: 'lowEnergyXpPct', min: 5, max: 15, text: (v) => `+${v}% XP from low-energy quests` },
  { stat: 'magicFind', min: 3, max: 10, text: (v) => `+${v}% chance of finer loot` },
];

const RARITY_SCALE: Record<Rarity, number> = { worn: 1, enchanted: 1.25, rare: 1.6, relic: 2 };
const AFFIX_COUNT: Record<Rarity, [number, number]> = { worn: [1, 1], enchanted: [1, 2], rare: [3, 3], relic: [4, 4] };

export interface RelicDef {
  id: string;
  name: string;
  base: ItemBase;
  effect: string;
  flavour: string;
  patch: BonusPatch;
}

export const RELICS: RelicDef[] = [
  {
    id: 'patient-hour',
    name: 'Lamp of the Patient Hour',
    base: 'relic',
    effect: 'Dungeon Runs grant +25% XP.',
    flavour: 'It burns exactly as long as you need it to.',
    patch: { runXpPct: 25 },
  },
  {
    id: 'kettleheart',
    name: 'Kettleheart Sigil',
    base: 'amulet',
    effect: '+20% XP and +10% loot chance for Hearth quests.',
    flavour: 'A home is a fire someone keeps choosing to feed.',
    patch: { regionXpPct: { hearth: 20 }, regionDropPct: { hearth: 10 } },
  },
  {
    id: 'first-step',
    name: 'Boots of the First Step',
    base: 'boots',
    effect: 'Low-energy quests grant +30% XP.',
    flavour: 'The road is only ever one step long.',
    patch: { lowEnergyXpPct: 30 },
  },
  {
    id: 'ashen-crown',
    name: 'Crown of Ashen Kings',
    base: 'helm',
    effect: 'Bosses grant +40% XP.',
    flavour: 'Every king here began as a pile of unfinished things.',
    patch: { bossXpPct: 40 },
  },
  {
    id: 'lanternwake',
    name: 'Lanternwake Band',
    base: 'ring',
    effect: '+20% XP in the Lanterns. The Blight waits one extra day.',
    flavour: 'Someone remembered you. Remember them back.',
    patch: { regionXpPct: { lanterns: 20 }, blightGraceDays: 1 },
  },
  {
    id: 'coalheart',
    name: 'Coalheart Cleaver',
    base: 'weapon',
    effect: '+15% gold and +10% XP from every quest.',
    flavour: 'Dull edge. Bright core.',
    patch: { goldPct: 15, xpPct: 10 },
  },
  {
    id: 'bloodwell-vial',
    name: 'Vial of the Bloodwell',
    base: 'relic',
    effect: '+25% XP in the Bloodwell.',
    flavour: 'Drink water. It was always this simple.',
    patch: { regionXpPct: { bloodwell: 25 } },
  },
  {
    id: 'scribes-mitts',
    name: 'Inkburnt Mitts',
    base: 'gloves',
    effect: '+25% XP in the Archive.',
    flavour: 'Stained by ten thousand turned pages.',
    patch: { regionXpPct: { archive: 25 } },
  },
  {
    id: 'anvil-plate',
    name: 'Anvilheart Plate',
    base: 'chest',
    effect: '+25% XP in the Forge.',
    flavour: 'It rings when struck, like a job well done.',
    patch: { regionXpPct: { forge: 25 } },
  },
  {
    id: 'pity-locket',
    name: 'Locket of Small Luck',
    base: 'amulet',
    effect: 'Guaranteed loot every 4 quests instead of 5.',
    flavour: 'Luck, it turns out, is mostly showing up.',
    patch: { pityDelta: -1 },
  },
];

export function relicById(id: string | undefined): RelicDef | undefined {
  return RELICS.find((r) => r.id === id);
}

/** Drop chance for a completed quest: scales with size, Bosses always drop. */
export function dropChance(
  q: { type: QuestType | 'run'; estMinutes: number; regionId?: string },
  bonuses: Bonuses,
): number {
  if (q.type === 'boss') return 1;
  const base = q.type === 'habit' ? 0.18 : 0.25;
  const size = Math.min(0.4, (Math.max(0, q.estMinutes) / 120) * 0.4);
  const pct = bonuses.dropPct + (q.regionId ? (bonuses.regionDropPct[q.regionId] ?? 0) : 0);
  return Math.min(0.95, (base + size) * (1 + pct / 100));
}

export interface DropRoll {
  dropped: boolean;
  /** Quests since the last drop, after this roll. */
  pity: number;
  guaranteed: boolean;
}

/**
 * Pity timer: after `threshold - 1` quests without loot, the next one always drops.
 * `pity` counts consecutive quests without a drop.
 */
export function rollDrop(chance: number, pity: number, threshold: number, rng: Rng): DropRoll {
  const guaranteed = pity + 1 >= threshold;
  const dropped = guaranteed || rng() < chance;
  return { dropped, pity: dropped ? 0 : pity + 1, guaranteed: guaranteed && dropped };
}

export function rollRarity(rng: Rng, magicFind: number, minRarity: Rarity = 'worn'): Rarity {
  const mf = 1 + magicFind / 100;
  const weights: Record<Rarity, number> = {
    worn: 60 / mf,
    enchanted: 28,
    rare: 10 * mf,
    relic: 2 * mf,
  };
  const minIdx = RARITY_ORDER.indexOf(minRarity);
  for (const r of RARITY_ORDER) if (RARITY_ORDER.indexOf(r) < minIdx) weights[r] = 0;
  return weighted(rng, weights);
}

function rollAffix(rng: Rng, rarity: Rarity, used: Set<string>): Affix {
  for (let tries = 0; tries < 20; tries++) {
    const def = pick(rng, AFFIXES);
    const regionId = def.stat === 'regionXpPct' ? pick(rng, Object.keys(REGION_NAMES)) : undefined;
    const key = def.stat + (regionId ?? '');
    if (used.has(key)) continue;
    used.add(key);
    const value = Math.round(randInt(rng, def.min, def.max) * RARITY_SCALE[rarity]);
    return { stat: def.stat, value, regionId, text: def.text(value, regionId) };
  }
  const value = Math.round(randInt(rng, 2, 6) * RARITY_SCALE[rarity]);
  return { stat: 'xpPct', value, text: `+${value}% XP from all quests` };
}

export function generateItem(rng: Rng, rarity: Rarity, now: number): Item {
  if (rarity === 'relic') {
    const relic = pick(rng, RELICS);
    const used = new Set<string>();
    const affixes = Array.from({ length: 3 }, () => rollAffix(rng, rarity, used));
    return {
      id: uid(),
      name: relic.name,
      base: relic.base,
      rarity,
      affixes,
      uniqueId: relic.id,
      flavour: relic.flavour,
      obtainedAt: now,
      location: 'inventory',
      equipped: false,
      icon: BASE_ICON[relic.base],
    };
  }
  const base = pick(rng, BASES);
  const baseName = pick(rng, BASE_NAMES[base]);
  const [lo, hi] = AFFIX_COUNT[rarity];
  const count = randInt(rng, lo, hi);
  const used = new Set<string>();
  const affixes = Array.from({ length: count }, () => rollAffix(rng, rarity, used));
  let name: string;
  if (rarity === 'worn') name = `Worn ${baseName}`;
  else if (rarity === 'enchanted') name = rng() < 0.5 ? `${pick(rng, PREFIXES)} ${baseName}` : `${baseName} ${pick(rng, SUFFIXES)}`;
  else name = `${pick(rng, RARE_NAME_A)} ${pick(rng, RARE_NAME_B)}, ${baseName}`;
  return {
    id: uid(),
    name,
    base,
    rarity,
    affixes,
    flavour: pick(rng, FLAVOUR),
    obtainedAt: now,
    location: 'inventory',
    equipped: false,
    icon: BASE_ICON[base],
  };
}

/** Turn an equipped item into a bonus patch. */
export function itemPatch(item: Item): BonusPatch {
  const patch: BonusPatch = {};
  for (const a of item.affixes) {
    if (a.stat === 'regionXpPct') {
      if (a.regionId) patch.regionXpPct = { ...(patch.regionXpPct ?? {}), [a.regionId]: (patch.regionXpPct?.[a.regionId] ?? 0) + a.value };
    } else {
      patch[a.stat] = (patch[a.stat] ?? 0) + a.value;
    }
  }
  return patch;
}
