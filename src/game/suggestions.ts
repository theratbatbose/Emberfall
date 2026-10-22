import type { Quest } from '../db/types';
import { suitableTags } from './energy';
import { isOpen, nextSubquest, scheduledAt } from './quests';
import { HOUR, DAY } from './time';

/** ADHD rule 1: never more than three suggestions by default. */
export const MAX_SUGGESTIONS = 3;

/**
 * The quest the player actually acts on. Parents with sub-quests are represented by
 * their next step (next-step-only view); a parent whose steps are all done is itself
 * actionable (e.g. a Boss ready to be slain).
 */
export function actionable(all: Quest[], now: number): Quest[] {
  const out: Quest[] = [];
  for (const q of all) {
    if (q.parentId) continue;
    if (!isOpen(q, now)) continue;
    const hasKids = all.some((c) => c.parentId === q.id);
    if (hasKids) {
      const next = nextSubquest(all, q.id);
      out.push(next ?? q);
    } else {
      out.push(q);
    }
  }
  return out;
}

export interface SuggestContext {
  energy: number | null;
  now: number;
  blightedRegions: Set<string>;
}

export function scoreQuest(q: Quest, all: Quest[], ctx: SuggestContext): number {
  const parent = q.parentId ? all.find((p) => p.id === q.parentId) : undefined;
  const tag = q.energyTag;
  let score = 0;
  if (ctx.energy !== null) {
    const tags = suitableTags(ctx.energy);
    const idx = tags.indexOf(tag);
    score += idx === -1 ? -40 : 30 - idx * 8;
  } else {
    score += tag === 'low' ? 10 : tag === 'med' ? 6 : 2;
  }
  const due = parent?.dueAt ?? q.dueAt;
  if (due !== undefined) {
    const until = due - ctx.now;
    if (until < 0) score += 25;
    else if (until < 6 * HOUR) score += 22;
    else if (until < DAY) score += 15;
    else if (until < 3 * DAY) score += 6;
  }
  const at = scheduledAt(parent ?? q, ctx.now);
  if (at !== null) {
    const diff = at - ctx.now;
    if (diff > -2 * HOUR && diff < 2 * HOUR) score += 18;
  }
  if (q.type === 'daily') score += 8;
  if (ctx.blightedRegions.has(q.regionId)) score += 12;
  if (q.estMinutes <= 5) score += 4;
  if (q.regionId === 'unsorted') score -= 6;
  return score;
}

export function suggestQuests(all: Quest[], ctx: SuggestContext, limit = MAX_SUGGESTIONS): Quest[] {
  return actionable(all, ctx.now)
    .map((q) => ({ q, s: scoreQuest(q, all, ctx) }))
    .sort((a, b) => b.s - a.s || a.q.order - b.q.order)
    .slice(0, limit)
    .map((x) => x.q);
}
