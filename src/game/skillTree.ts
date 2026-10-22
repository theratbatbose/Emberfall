import type { BonusPatch } from './bonuses';

// Passive tree: a small radial web. Root in the centre, one arm per region, a ring of
// general nodes between the arms, and outer nodes for themes and special effects.

export interface SkillNode {
  id: string;
  name: string;
  text: string;
  kind: 'root' | 'minor' | 'notable' | 'keystone';
  x: number;
  y: number;
  links: string[];
  patch: BonusPatch;
  /** Region arm this belongs to, for colouring. */
  regionId?: string;
}

interface ArmSpec {
  regionId: string;
  nodes: [string, string, BonusPatch][];
}

const ARMS: ArmSpec[] = [
  {
    regionId: 'bloodwell',
    nodes: [
      ['Steady Pulse', '+5% Bloodwell XP', { regionXpPct: { bloodwell: 5 } }],
      ['Deep Breath', '+10% Bloodwell loot chance', { regionDropPct: { bloodwell: 10 } }],
      ['Second Wind', '+10% XP from low-energy quests', { lowEnergyXpPct: 10 }],
      ['Warm Blood', '+8% Bloodwell XP', { regionXpPct: { bloodwell: 8 } }],
      ['Unbroken Vessel', 'The Blight takes 1 extra day to set in', { blightGraceDays: 1 }],
    ],
  },
  {
    regionId: 'forge',
    nodes: [
      ['Struck Iron', '+5% Forge XP', { regionXpPct: { forge: 5 } }],
      ['Quench', '+10% Forge loot chance', { regionDropPct: { forge: 10 } }],
      ['Hammerfall', '+10% Dungeon Run XP', { runXpPct: 10 }],
      ['Tempered Will', '+8% Forge XP', { regionXpPct: { forge: 8 } }],
      ['Anvil Heart', 'Bosses grant +25% XP', { bossXpPct: 25 }],
    ],
  },
  {
    regionId: 'hearth',
    nodes: [
      ['Kept Kettle', '+5% Hearth XP', { regionXpPct: { hearth: 5 } }],
      ['Swept Floors', '+10% Hearth loot chance', { regionDropPct: { hearth: 10 } }],
      ['Banked Coals', '+8% gold found', { goldPct: 8 }],
      ['Mended Roof', '+8% Hearth XP', { regionXpPct: { hearth: 8 } }],
      ['Hearthkeeper', '+10% gold and +5% loot chance', { goldPct: 10, dropPct: 5 }],
    ],
  },
  {
    regionId: 'archive',
    nodes: [
      ['Dog-eared', '+5% Archive XP', { regionXpPct: { archive: 5 } }],
      ['Dust Motes', '+10% Archive loot chance', { regionDropPct: { archive: 10 } }],
      ['Margins', '+5% chance of finer loot', { magicFind: 5 }],
      ['Candle Hours', '+8% Archive XP', { regionXpPct: { archive: 8 } }],
      ['Lorewright', '+15% Dungeon Run XP and +5% XP', { runXpPct: 15, xpPct: 5 }],
    ],
  },
  {
    regionId: 'lanterns',
    nodes: [
      ['Lit Window', '+5% Lanterns XP', { regionXpPct: { lanterns: 5 } }],
      ['Shared Flame', '+10% Lanterns loot chance', { regionDropPct: { lanterns: 10 } }],
      ['Kindred Flame', '+5% XP from all quests', { xpPct: 5 }],
      ['Long Letter', '+8% Lanterns XP', { regionXpPct: { lanterns: 8 } }],
      ['Beacon', 'The Blight takes 1 extra day; +5% gold', { blightGraceDays: 1, goldPct: 5 }],
    ],
  },
];

const RING: [string, string, string, BonusPatch][] = [
  ['ring-0', 'Ember Sense', '+4% loot chance', { dropPct: 4 }],
  ['ring-1', 'Ashwalker', '+4% XP from all quests', { xpPct: 4 }],
  ['ring-2', 'Coin-sense', '+6% gold found', { goldPct: 6 }],
  ['ring-3', 'Focus Wick', '+8% Dungeon Run XP', { runXpPct: 8 }],
  ['ring-4', 'Glint', '+6% chance of finer loot', { magicFind: 6 }],
];

const OUTER: [string, string, string, BonusPatch][] = [
  ['outer-0', 'Rimeglass', 'Unlocks the Rimeglass theme (frost-blue UI)', { themes: ['rime'] }],
  ['outer-1', 'Gambler’s Coal', 'Guaranteed loot every 4 quests instead of 5', { pityDelta: -1 }],
  ['outer-2', 'Mossgrave', 'Unlocks the Mossgrave theme (green UI)', { themes: ['moss'] }],
  ['outer-3', 'Haggler', 'Merchant rewards cost 10% less', { merchantDiscountPct: 10 }],
  ['outer-4', 'Gilded Ash', 'Unlocks the Gilded theme (gold UI)', { themes: ['gilt'] }],
];

const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (deg: number, r: number) => ({ x: Math.round(Math.cos(rad(deg)) * r), y: Math.round(Math.sin(rad(deg)) * r) });

function build(): SkillNode[] {
  const nodes: SkillNode[] = [
    { id: 'root', name: 'Kindling', text: 'Where every Ashbearer begins.', kind: 'root', x: 0, y: 0, links: [], patch: {} },
  ];
  const byId = new Map<string, SkillNode>([['root', nodes[0]]]);
  const link = (a: string, b: string) => {
    byId.get(a)!.links.push(b);
    byId.get(b)!.links.push(a);
  };
  ARMS.forEach((arm, i) => {
    const angle = -90 + 72 * i;
    arm.nodes.forEach(([name, text, patch], k) => {
      const id = `${arm.regionId}-${k + 1}`;
      const kind = k === 4 ? 'keystone' : k === 2 ? 'notable' : 'minor';
      const node: SkillNode = { id, name, text, kind, ...polar(angle, 52 * (k + 1)), links: [], patch, regionId: arm.regionId };
      nodes.push(node);
      byId.set(id, node);
      link(id, k === 0 ? 'root' : `${arm.regionId}-${k}`);
    });
  });
  RING.forEach(([id, name, text, patch], i) => {
    const node: SkillNode = { id, name, text, kind: 'minor', ...polar(-90 + 72 * i + 36, 130), links: [], patch };
    nodes.push(node);
    byId.set(id, node);
    link(id, `${ARMS[i].regionId}-2`);
    link(id, `${ARMS[(i + 1) % 5].regionId}-2`);
  });
  OUTER.forEach(([id, name, text, patch], i) => {
    const node: SkillNode = { id, name, text, kind: 'notable', ...polar(-90 + 72 * i + 36, 215), links: [], patch };
    nodes.push(node);
    byId.set(id, node);
    link(id, `ring-${i}`);
  });
  return nodes;
}

export const SKILL_NODES: SkillNode[] = build();
export const SKILL_BY_ID = new Map(SKILL_NODES.map((n) => [n.id, n]));

/** A node can be taken if you have a point and it touches something already taken (root is always taken). */
export function canAllocate(id: string, allocated: string[], pointsAvailable: number): boolean {
  if (id === 'root' || allocated.includes(id) || pointsAvailable <= 0) return false;
  const node = SKILL_BY_ID.get(id);
  if (!node) return false;
  const taken = new Set(['root', ...allocated]);
  return node.links.some((l) => taken.has(l));
}

/**
 * Removing a node is allowed only if everything else stays connected to the root
 * (refunds are free — no permanent mistakes).
 */
export function canRefund(id: string, allocated: string[]): boolean {
  if (!allocated.includes(id)) return false;
  const remaining = new Set(allocated.filter((a) => a !== id));
  const seen = new Set<string>(['root']);
  const stack = ['root'];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const l of SKILL_BY_ID.get(cur)?.links ?? []) {
      if (remaining.has(l) && !seen.has(l)) {
        seen.add(l);
        stack.push(l);
      }
    }
  }
  return [...remaining].every((r) => seen.has(r));
}
