// Data model (PRD §8). Everything stored locally in IndexedDB.

export type AttributeKey = 'vitality' | 'might' | 'fortitude' | 'intellect' | 'spirit';
export type QuestType = 'daily' | 'habit' | 'quest' | 'boss';
export type EnergyTag = 'low' | 'med' | 'high';
export type QuestStatus = 'active' | 'done';
export type Rarity = 'worn' | 'enchanted' | 'rare' | 'relic';
export type Slot = 'weapon' | 'helm' | 'chest' | 'gloves' | 'boots' | 'amulet' | 'ring1' | 'ring2' | 'relic';
export type ItemBase = 'weapon' | 'helm' | 'chest' | 'gloves' | 'boots' | 'amulet' | 'ring' | 'relic';
export type ItemLocation = 'inventory' | 'stash' | 'equipped';

export const UNSORTED_REGION_ID = 'unsorted';

export interface Character {
  id: 'me';
  name: string;
  xp: number;
  gold: number;
  /** XP earned per attribute (attributes level up from region XP). */
  attributeXp: Record<AttributeKey, number>;
  allocatedNodes: string[];
  equipped: Partial<Record<Slot, string>>;
  createdAt: number;
}

export interface Region {
  id: string;
  name: string;
  attribute: AttributeKey | null;
  colour: string;
  icon: string;
  order: number;
  lastActivityAt: number;
  /** Cached for display/export; the live value is always computed from lastActivityAt. */
  blightStage: number;
  xp: number;
  builtin: boolean;
}

export interface Recurrence {
  /** Weekdays 0 (Sun) – 6 (Sat). Empty array = every day. */
  days: number[];
}

export interface Quest {
  id: string;
  title: string;
  regionId: string;
  type: QuestType;
  energyTag: EnergyTag;
  estMinutes: number;
  /** Manually flagged as major (Bosses and >30 min quests are major automatically). */
  isMajor: boolean;
  /** One-off deadline (timestamp). */
  dueAt?: number;
  /** Scheduled time on the Day Map, "HH:MM" (recurring dailies or a fixed slot). */
  timeOfDay?: string;
  /** Reminder offsets in minutes before the scheduled time. 0 = at the time, 10 = 10 min before. */
  reminders: number[];
  recurrence?: Recurrence;
  parentId?: string;
  order: number;
  status: QuestStatus;
  completedAt?: number;
  /** Most recent completion (dailies / habits repeat). */
  lastCompletedAt?: number;
  timesCompleted: number;
  /** Day ("YYYY-MM-DD") the "Just Start" reward was claimed, so it's once per quest per day. */
  startedCreditDay?: string;
  actualMinutes: number;
  notes?: string;
  createdAt: number;
}

export interface Completion {
  id: string;
  questId: string;
  title: string;
  regionId: string;
  at: number;
  xp: number;
  gold: number;
  itemId?: string;
  cleansed: boolean;
  kind: 'quest' | 'run' | 'start' | 'chest' | 'bounty';
  energyTag?: EnergyTag;
  questType?: QuestType;
  /** Run minutes, for kind 'run' / 'start'. */
  minutes?: number;
}

export type EnergySource = 'morning' | 'post-quest' | 'manual' | 'post-run';

export interface EnergyLog {
  id: string;
  value: number;
  at: number;
  source: EnergySource;
  questId?: string;
}

export interface FocusRun {
  id: string;
  questId?: string;
  plannedMin: number;
  actualMin: number;
  startedAt: number;
  endedAt: number;
  abandoned: boolean;
  justStart: boolean;
}

export type AffixStat = 'xpPct' | 'goldPct' | 'dropPct' | 'runXpPct' | 'regionXpPct' | 'lowEnergyXpPct' | 'magicFind';

export interface Affix {
  stat: AffixStat;
  value: number;
  /** For regionXpPct. */
  regionId?: string;
  text: string;
}

export interface Item {
  id: string;
  name: string;
  base: ItemBase;
  rarity: Rarity;
  affixes: Affix[];
  /** Relics only: id of the unique effect. */
  uniqueId?: string;
  flavour: string;
  obtainedAt: number;
  location: ItemLocation;
  /** Mirrors PRD field; true when location === 'equipped'. */
  equipped: boolean;
  icon: string;
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
  createdAt: number;
}

export interface Purchase {
  id: string;
  rewardId: string;
  name: string;
  cost: number;
  at: number;
}

export interface NudgeSetting {
  on: boolean;
  time: string;
}

export interface Settings {
  id: 'settings';
  blightDays: number;
  sound: boolean;
  /** 'system' follows the phone; 'reduced' forces calm mode; 'full' forces full animation. */
  motion: 'system' | 'reduced' | 'full';
  haptics: boolean;
  askEnergyAfterRun: boolean;
  preAlertDefault: boolean;
  nudges: { morning: NudgeSetting; midday: NudgeSetting; evening: NudgeSetting };
  dayStart: string;
  dayEnd: string;
  theme: string;
  onboarded: boolean;
}

export interface ActiveRun {
  questId?: string;
  plannedMin: number;
  startedAt: number;
  pausedAt?: number;
  pausedMs: number;
  justStart: boolean;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

/** Known meta keys and their value types. */
export interface MetaValues {
  schemaVersion: number;
  lastOpenedAt: number;
  lastSeenAt: number;
  pityCounter: number;
  lastBackupAt: number;
  /** Gold waiting in the "Rested at the Bonfire" chest (0 = none). */
  pendingReturnChest: number;
  activeRun: ActiveRun | null;
  ritualDay: string;
  bountyClaims: Record<string, string[]>;
  bountyChestDay: string;
}
