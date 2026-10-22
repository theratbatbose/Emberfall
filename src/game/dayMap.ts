import type { Completion, Quest } from '../db/types';
import { doneToday, isOpen, scheduledAt } from './quests';
import { atTimeOnDay, dayKey } from './time';

export interface DayMapEntry {
  key: string;
  at: number;
  title: string;
  regionId: string;
  questId?: string;
  done: boolean;
  past: boolean;
}

/** Scheduled quests for today plus anything already completed today (lit braziers). */
export function dayMapEntries(quests: Quest[], completionsToday: Completion[], now: number): DayMapEntry[] {
  const entries: DayMapEntry[] = [];
  const scheduledIds = new Set<string>();
  for (const q of quests) {
    if (q.parentId) continue;
    const at = scheduledAt(q, now);
    if (at === null) continue;
    const done = q.type === 'daily' || q.type === 'habit' ? doneToday(q, now) : q.status === 'done';
    if (!done && !isOpen(q, now)) continue;
    scheduledIds.add(q.id);
    entries.push({ key: q.id, at, title: q.title, regionId: q.regionId, questId: q.id, done, past: at < now });
  }
  for (const c of completionsToday) {
    if (c.kind !== 'quest' || scheduledIds.has(c.questId)) continue;
    entries.push({ key: c.id, at: c.at, title: c.title, regionId: c.regionId, questId: c.questId, done: true, past: true });
  }
  return entries.sort((a, b) => a.at - b.at);
}

export function nextScheduled(entries: DayMapEntry[], now: number): DayMapEntry | null {
  return entries.find((e) => !e.done && e.at >= now) ?? null;
}

export function dayBounds(now: number, dayStart: string, dayEnd: string): { start: number; end: number } {
  const start = atTimeOnDay(now, dayStart) ?? atTimeOnDay(now, '07:00')!;
  let end = atTimeOnDay(now, dayEnd) ?? atTimeOnDay(now, '23:00')!;
  if (end <= start) end = start + 16 * 3_600_000;
  return { start, end };
}

/** 0..1 position of a time along today's path (clamped). */
export function pathPosition(ts: number, bounds: { start: number; end: number }): number {
  return Math.min(1, Math.max(0, (ts - bounds.start) / (bounds.end - bounds.start)));
}

export const todayKey = (now: number) => dayKey(now);
