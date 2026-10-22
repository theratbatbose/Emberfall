import type { ActiveRun, Quest, Region, Settings } from '../db/types';
import { dailyAppliesOn, doneToday, isOpen } from './quests';
import { endsAt } from './runs';
import { atTimeOnDay, DAY, dayKey, MINUTE } from './time';
import { hashString } from './random';

export interface PlannedReminder {
  /** Stable 31-bit id (native notification ids must be ints). */
  id: number;
  key: string;
  at: number;
  title: string;
  body: string;
}

const idFor = (key: string) => hashString(key) & 0x7fffffff;

function questLines(q: Quest, region: Region | undefined, offset: number): { title: string; body: string } {
  const place = region && region.id !== 'unsorted' ? region.name : 'The road';
  if (offset > 0) {
    return { title: `${q.title} in ${offset} min`, body: `${place} stirs. Ready your torch — no rush.` };
  }
  return { title: `${place} calls`, body: `${q.title} — now's a good moment. Even 5 minutes counts.` };
}

/**
 * Every reminder that should fire in the next `horizonMs` (default 48h). Recomputed
 * whenever quests or settings change; the platform layer replaces its schedule with this.
 */
export function planReminders(input: {
  quests: Quest[];
  regions: Region[];
  settings: Settings;
  activeRun: ActiveRun | null;
  ritualDoneToday: boolean;
  blightedRegionNames: string[];
  now: number;
  horizonMs?: number;
}): PlannedReminder[] {
  const { quests, regions, settings, activeRun, now } = input;
  const horizon = now + (input.horizonMs ?? 2 * DAY);
  const out: PlannedReminder[] = [];
  const push = (key: string, at: number, title: string, body: string) => {
    if (at > now && at <= horizon) out.push({ id: idFor(key), key, at, title, body });
  };
  const regionById = new Map(regions.map((r) => [r.id, r]));

  for (const q of quests) {
    if (q.parentId || !q.reminders.length) continue;
    if (q.type === 'daily' || (q.type === 'habit' && q.timeOfDay)) {
      if (!q.timeOfDay) continue;
      for (let d = 0; d <= 2; d++) {
        const dayTs = now + d * DAY;
        if (!dailyAppliesOn(q, dayTs)) continue;
        if (d === 0 && q.type === 'daily' && doneToday(q, now)) continue;
        const at = atTimeOnDay(dayTs, q.timeOfDay);
        if (at === null) continue;
        for (const off of q.reminders) {
          const l = questLines(q, regionById.get(q.regionId), off);
          push(`q:${q.id}:${dayKey(at)}:${off}`, at - off * MINUTE, l.title, l.body);
        }
      }
    } else if (isOpen(q, now)) {
      const at = q.dueAt ?? (q.timeOfDay ? atTimeOnDay(now, q.timeOfDay) : null);
      if (at === null) continue;
      for (const off of q.reminders) {
        const l = questLines(q, regionById.get(q.regionId), off);
        push(`q:${q.id}:${off}`, at - off * MINUTE, l.title, l.body);
      }
    }
  }

  const { morning, midday, evening } = settings.nudges;
  for (let d = 0; d <= 2; d++) {
    const dayTs = now + d * DAY;
    const key = dayKey(dayTs);
    if (morning.on && !(d === 0 && input.ritualDoneToday)) {
      const at = atTimeOnDay(dayTs, morning.time);
      if (at) push(`n:morning:${key}`, at, 'Kindle the fire', 'A minute to check your energy and pick three small things?');
    }
    if (midday.on) {
      const at = atTimeOnDay(dayTs, midday.time);
      const cold = input.blightedRegionNames[0];
      if (at)
        push(
          `n:midday:${key}`,
          at,
          cold ? `${cold} grows cold` : 'The road at noon',
          cold ? '2 minutes to cleanse it? Any small quest will do.' : 'One small quest keeps the embers lit.',
        );
    }
    if (evening.on) {
      const at = atTimeOnDay(dayTs, evening.time);
      if (at) push(`n:evening:${key}`, at, 'Evening at the bonfire', 'Come see what you lit today in the Ember Chronicle.');
    }
  }

  if (activeRun && activeRun.pausedAt === undefined) {
    push(`run:${activeRun.startedAt}`, endsAt(activeRun, now), 'The torch burns out', 'Dungeon Run complete — your chest awaits.');
  }

  return out.sort((a, b) => a.at - b.at);
}
