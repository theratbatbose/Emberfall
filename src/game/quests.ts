import type { Quest } from '../db/types';
import { atTimeOnDay, dayKey } from './time';

export function isMajor(q: Pick<Quest, 'type' | 'estMinutes' | 'isMajor'>): boolean {
  return q.isMajor || q.type === 'boss' || q.estMinutes > 30;
}

export function isRecurring(q: Pick<Quest, 'type'>): boolean {
  return q.type === 'daily' || q.type === 'habit';
}

/** Does a daily apply on this weekday? */
export function dailyAppliesOn(q: Quest, ts: number): boolean {
  if (q.type !== 'daily') return true;
  const days = q.recurrence?.days ?? [];
  return days.length === 0 || days.includes(new Date(ts).getDay());
}

export function doneToday(q: Quest, now: number): boolean {
  return q.lastCompletedAt !== undefined && dayKey(q.lastCompletedAt) === dayKey(now);
}

/**
 * Can this quest be completed right now?
 * - Habits: always.
 * - Dailies: once per scheduled day.
 * - Quests/Bosses: until done. Parents with sub-quests are completed through their steps.
 */
export function isOpen(q: Quest, now: number): boolean {
  switch (q.type) {
    case 'habit':
      return true;
    case 'daily':
      return dailyAppliesOn(q, now) && !doneToday(q, now);
    default:
      return q.status === 'active';
  }
}

export function childrenOf(all: Quest[], parentId: string): Quest[] {
  return all.filter((q) => q.parentId === parentId).sort((a, b) => a.order - b.order);
}

/** Next-step-only view: the first unfinished sub-quest, or null if none / all done. */
export function nextSubquest(all: Quest[], parentId: string): Quest | null {
  return childrenOf(all, parentId).find((c) => c.status === 'active') ?? null;
}

export function subquestProgress(all: Quest[], parentId: string): { done: number; total: number } {
  const kids = childrenOf(all, parentId);
  return { done: kids.filter((k) => k.status === 'done').length, total: kids.length };
}

/** When does this quest sit on today's Day Map? */
export function scheduledAt(q: Quest, now: number): number | null {
  if (q.timeOfDay && (q.type !== 'daily' || dailyAppliesOn(q, now))) {
    return atTimeOnDay(now, q.timeOfDay);
  }
  if (q.dueAt && dayKey(q.dueAt) === dayKey(now)) return q.dueAt;
  return null;
}

/**
 * "Awaiting you": a one-off whose due date has passed. Shown neutrally, never as
 * red/overdue (ADHD rule 3).
 */
export function isAwaiting(q: Quest, now: number): boolean {
  return q.status === 'active' && q.type !== 'daily' && q.type !== 'habit' && q.dueAt !== undefined && q.dueAt < now;
}

/**
 * The quests shown in lists: top-level quests, where a parent with sub-quests is
 * represented by itself (the UI shows only its next step).
 */
export function topLevel(all: Quest[]): Quest[] {
  return all.filter((q) => !q.parentId);
}
