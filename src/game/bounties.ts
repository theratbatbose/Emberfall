import type { Completion, EnergyLog } from '../db/types';
import { hashString, seeded } from './random';

/** What happened today, used to check bounty progress. */
export interface DayStats {
  completions: Completion[];
  energyLogs: EnergyLog[];
  runMinutes: number;
  runs: number;
}

export interface Bounty {
  id: string;
  text: string;
  target: number;
  gold: number;
  xp: number;
  progress: (s: DayStats) => number;
}

const quests = (s: DayStats) => s.completions.filter((c) => c.kind === 'quest');
const inRegion = (id: string) => (s: DayStats) => quests(s).filter((c) => c.regionId === id).length;

export const BOUNTY_POOL: Bounty[] = [
  { id: 'three-quests', text: 'Complete 3 quests', target: 3, gold: 30, xp: 25, progress: (s) => quests(s).length },
  { id: 'five-quests', text: 'Complete 5 quests', target: 5, gold: 50, xp: 40, progress: (s) => quests(s).length },
  { id: 'one-run', text: 'Finish a Dungeon Run', target: 1, gold: 25, xp: 20, progress: (s) => s.runs },
  { id: 'run-25', text: 'Spend 25 minutes in Dungeon Runs', target: 25, gold: 45, xp: 35, progress: (s) => Math.floor(s.runMinutes) },
  { id: 'energy-2', text: 'Log your energy twice', target: 2, gold: 20, xp: 15, progress: (s) => s.energyLogs.length },
  { id: 'low-energy', text: 'Complete 2 low-energy quests', target: 2, gold: 25, xp: 20, progress: (s) => quests(s).filter((c) => c.energyTag === 'low').length },
  { id: 'two-regions', text: 'Complete quests in 2 different regions', target: 2, gold: 30, xp: 25, progress: (s) => new Set(quests(s).map((c) => c.regionId)).size },
  { id: 'hearth', text: 'Complete a Hearth quest', target: 1, gold: 20, xp: 15, progress: inRegion('hearth') },
  { id: 'bloodwell', text: 'Complete a Bloodwell quest', target: 1, gold: 20, xp: 15, progress: inRegion('bloodwell') },
  { id: 'lanterns', text: 'Light a Lantern (Social quest)', target: 1, gold: 20, xp: 15, progress: inRegion('lanterns') },
  { id: 'archive', text: 'Complete an Archive quest', target: 1, gold: 20, xp: 15, progress: inRegion('archive') },
];

/** Three bounties per day, chosen deterministically from the date so they don't reshuffle. */
export function bountiesForDay(day: string): Bounty[] {
  const rng = seeded(hashString('bounty:' + day));
  const pool = [...BOUNTY_POOL];
  const out: Bounty[] = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

export function bountyComplete(b: Bounty, s: DayStats): boolean {
  return b.progress(s) >= b.target;
}

/** Bonus for finishing all three in a day. */
export const BOUNTY_CHEST_GOLD = 60;
