import { describe, expect, it } from 'vitest';
import type { Completion, EnergyLog, Quest, Settings } from '../db/types';
import { bountiesForDay, BOUNTY_POOL } from './bounties';
import { computeBonuses } from './character';
import { daysActiveThisMonth, peakWindow } from './chronicle';
import { dayMapEntries, nextScheduled } from './dayMap';
import { eventForDay } from './events';
import { isAwaiting, isOpen, nextSubquest } from './quests';
import { planReminders } from './reminders';
import { actualMinutes, elapsedMs, pause, remainingMs, resume } from './runs';
import { canAllocate, canRefund, SKILL_NODES } from './skillTree';
import { MAX_SUGGESTIONS, suggestQuests } from './suggestions';
import { DAY, HOUR, MINUTE, dayKey } from './time';

const now = new Date(2026, 9, 22, 9, 0, 0).getTime();

let n = 0;
function quest(over: Partial<Quest> = {}): Quest {
  n++;
  return {
    id: `q${n}`,
    title: `Quest ${n}`,
    regionId: 'hearth',
    type: 'quest',
    energyTag: 'low',
    estMinutes: 10,
    isMajor: false,
    reminders: [],
    order: n,
    status: 'active',
    timesCompleted: 0,
    actualMinutes: 0,
    createdAt: now - DAY,
    ...over,
  };
}

describe('quest rules', () => {
  it('dailies open once per day, habits always', () => {
    const d = quest({ type: 'daily', lastCompletedAt: now - HOUR });
    expect(isOpen(d, now)).toBe(false);
    expect(isOpen(d, now + DAY)).toBe(true);
    const h = quest({ type: 'habit', lastCompletedAt: now - MINUTE });
    expect(isOpen(h, now)).toBe(true);
  });

  it('dailies respect weekdays', () => {
    const wd = new Date(now).getDay();
    const d = quest({ type: 'daily', recurrence: { days: [(wd + 1) % 7] } });
    expect(isOpen(d, now)).toBe(false);
    expect(isOpen(d, now + DAY)).toBe(true);
  });

  it('next-step-only shows the first unfinished sub-quest', () => {
    const boss = quest({ type: 'boss' });
    const a = quest({ parentId: boss.id, order: 1, status: 'done' });
    const b = quest({ parentId: boss.id, order: 2 });
    const c = quest({ parentId: boss.id, order: 3 });
    expect(nextSubquest([boss, c, a, b], boss.id)?.id).toBe(b.id);
  });

  it('past-due one-offs are "awaiting", dailies never are', () => {
    expect(isAwaiting(quest({ dueAt: now - HOUR }), now)).toBe(true);
    expect(isAwaiting(quest({ dueAt: now + HOUR }), now)).toBe(false);
    expect(isAwaiting(quest({ type: 'daily', dueAt: now - HOUR }), now)).toBe(false);
  });
});

describe('suggestions', () => {
  it('never shows more than 3', () => {
    const qs = Array.from({ length: 12 }, () => quest());
    expect(suggestQuests(qs, { energy: 5, now, blightedRegions: new Set() })).toHaveLength(MAX_SUGGESTIONS);
  });

  it('low energy prefers low-energy quests', () => {
    const qs = [quest({ energyTag: 'high' }), quest({ energyTag: 'high' }), quest({ energyTag: 'low' }), quest({ energyTag: 'high' })];
    expect(suggestQuests(qs, { energy: 2, now, blightedRegions: new Set() })[0].energyTag).toBe('low');
  });

  it('shows the next step instead of the boss', () => {
    const boss = quest({ type: 'boss', energyTag: 'high' });
    const step = quest({ parentId: boss.id, title: 'Step 1' });
    const list = suggestQuests([boss, step], { energy: 5, now, blightedRegions: new Set() });
    expect(list.map((q) => q.id)).toEqual([step.id]);
  });

  it('done quests are not suggested', () => {
    const qs = [quest({ status: 'done' }), quest({ type: 'daily', lastCompletedAt: now })];
    expect(suggestQuests(qs, { energy: 5, now, blightedRegions: new Set() })).toHaveLength(0);
  });
});

describe('dungeon run timer (timestamps)', () => {
  const run = { plannedMin: 25, startedAt: now, pausedMs: 0, justStart: false };

  it('is exact after the screen was off for a long time', () => {
    expect(remainingMs(run, now + 10 * MINUTE)).toBe(15 * MINUTE);
    expect(remainingMs(run, now + 3 * HOUR)).toBe(0);
    expect(actualMinutes(run, now + 3 * HOUR)).toBe(25);
  });

  it('pausing freezes time and resuming continues', () => {
    const p = pause(run, now + 5 * MINUTE);
    expect(remainingMs(p, now + 50 * MINUTE)).toBe(20 * MINUTE);
    const r = resume(p, now + 50 * MINUTE);
    expect(remainingMs(r, now + 55 * MINUTE)).toBe(15 * MINUTE);
    expect(elapsedMs(r, now + 55 * MINUTE)).toBe(10 * MINUTE);
  });
});

describe('skill tree', () => {
  it('has 30–40 nodes, all reachable from the root', () => {
    expect(SKILL_NODES.length).toBeGreaterThanOrEqual(30);
    expect(SKILL_NODES.length).toBeLessThanOrEqual(40);
    const ids = SKILL_NODES.map((s) => s.id).filter((id) => id !== 'root');
    // allocate everything in BFS order: each must be allocatable
    const allocated: string[] = [];
    const queue = ['root'];
    const seen = new Set(queue);
    while (queue.length) {
      const curId = queue.shift();
      const cur = SKILL_NODES.find((s) => s.id === curId)!;
      for (const l of cur.links) {
        if (seen.has(l)) continue;
        seen.add(l);
        expect(canAllocate(l, allocated, 1)).toBe(true);
        allocated.push(l);
        queue.push(l);
      }
    }
    expect(allocated.sort()).toEqual(ids.sort());
  });

  it('needs a point and a connected neighbour', () => {
    expect(canAllocate('bloodwell-1', [], 1)).toBe(true);
    expect(canAllocate('bloodwell-1', [], 0)).toBe(false);
    expect(canAllocate('bloodwell-3', [], 1)).toBe(false);
  });

  it('refunds only if the rest stays connected', () => {
    const alloc = ['forge-1', 'forge-2', 'forge-3'];
    expect(canRefund('forge-3', alloc)).toBe(true);
    expect(canRefund('forge-1', alloc)).toBe(false);
  });

  it('nodes give real effects', () => {
    const b = computeBonuses([], ['bloodwell-1', 'bloodwell-2', 'bloodwell-3', 'bloodwell-4', 'bloodwell-5', 'ring-0', 'outer-0'], null);
    expect(b.blightGraceDays).toBe(1);
    expect(b.regionXpPct.bloodwell).toBe(13);
    expect(b.themes).toContain('rime');
  });
});

describe('bounties and events', () => {
  it('three per day, stable for a date', () => {
    const a = bountiesForDay('2026-10-22');
    expect(a).toHaveLength(3);
    expect(new Set(a.map((b) => b.id)).size).toBe(3);
    expect(bountiesForDay('2026-10-22').map((b) => b.id)).toEqual(a.map((b) => b.id));
  });

  it('progress is computed from what happened', () => {
    const three = BOUNTY_POOL.find((b) => b.id === 'three-quests')!;
    const c = (i: number): Completion => ({ id: `c${i}`, questId: 'x', title: 'x', regionId: 'hearth', at: now, xp: 1, gold: 1, cleansed: false, kind: 'quest' });
    expect(three.progress({ completions: [c(1), c(2), c(3)], energyLogs: [], runMinutes: 0, runs: 0 })).toBe(3);
  });

  it('world events are rare but happen', () => {
    let count = 0;
    for (let i = 0; i < 600; i++) if (eventForDay(dayKey(now + i * DAY))) count++;
    expect(count).toBeGreaterThan(50);
    expect(count).toBeLessThan(200);
  });
});

describe('day map', () => {
  it('places scheduled quests and lit braziers in time order', () => {
    const later = quest({ type: 'daily', timeOfDay: '15:00' });
    const earlier = quest({ type: 'daily', timeOfDay: '08:00', lastCompletedAt: now - 30 * MINUTE });
    const unscheduledDone: Completion = { id: 'c1', questId: 'zz', title: 'Dishes', regionId: 'hearth', at: now - 10 * MINUTE, xp: 1, gold: 1, cleansed: false, kind: 'quest' };
    const entries = dayMapEntries([later, earlier], [unscheduledDone], now);
    expect(entries.map((e) => e.title)).toEqual([earlier.title, 'Dishes', later.title]);
    expect(entries[0].done).toBe(true);
    expect(nextScheduled(entries, now)?.title).toBe(later.title);
  });
});

describe('reminders', () => {
  const settings: Settings = {
    id: 'settings',
    blightDays: 3,
    sound: true,
    motion: 'system',
    haptics: true,
    askEnergyAfterRun: false,
    preAlertDefault: true,
    nudges: { morning: { on: true, time: '08:30' }, midday: { on: true, time: '13:00' }, evening: { on: false, time: '21:00' } },
    dayStart: '07:00',
    dayEnd: '23:00',
    theme: 'ember',
    onboarded: true,
  };

  it('plans quest reminders with pre-alerts and daily nudges, never in the past', () => {
    const q = quest({ type: 'daily', timeOfDay: '10:00', reminders: [0, 10] });
    const plan = planReminders({ quests: [q], regions: [], settings, activeRun: null, ritualDoneToday: true, blightedRegionNames: ['The Hearth'], now });
    expect(plan.every((p) => p.at > now)).toBe(true);
    const today = plan.filter((p) => dayKey(p.at) === dayKey(now));
    expect(today.map((p) => p.key.split(':')[0])).toEqual(['q', 'q', 'n']);
    expect(today[0].at).toBe(now + 50 * MINUTE);
    expect(today.find((p) => p.key.startsWith('n:midday'))!.title).toContain('The Hearth');
    expect(plan.some((p) => p.key.startsWith('n:morning'))).toBe(true); // tomorrow's
    expect(new Set(plan.map((p) => p.id)).size).toBe(plan.length);
  });

  it('skips a daily already done today and includes the run end alert', () => {
    const q = quest({ type: 'daily', timeOfDay: '10:00', reminders: [0], lastCompletedAt: now - MINUTE });
    const plan = planReminders({
      quests: [q],
      regions: [],
      settings,
      activeRun: { plannedMin: 25, startedAt: now, pausedMs: 0, justStart: false },
      ritualDoneToday: true,
      blightedRegionNames: [],
      now,
    });
    expect(plan.filter((p) => p.key.startsWith('q:') && dayKey(p.at) === dayKey(now))).toHaveLength(0);
    expect(plan.find((p) => p.key.startsWith('run:'))!.at).toBe(now + 25 * MINUTE);
  });

  it('copy is never shaming', () => {
    const q = quest({ dueAt: now + HOUR, reminders: [0, 10] });
    const plan = planReminders({ quests: [q], regions: [], settings, activeRun: null, ritualDoneToday: false, blightedRegionNames: ['The Forge'], now });
    const text = plan.map((p) => p.title + ' ' + p.body).join(' ').toLowerCase();
    for (const bad of ['overdue', 'late', 'failed', 'missed', 'streak', 'lazy']) expect(text).not.toContain(bad);
  });
});

describe('chronicle', () => {
  it('counts active days this month, not streaks', () => {
    const logs: EnergyLog[] = [0, 1, 1, 5].map((d, i) => ({ id: `l${i}`, value: 5, at: now - d * DAY, source: 'manual' }));
    expect(daysActiveThisMonth([], logs, now)).toBe(3);
  });

  it('finds the peak energy window', () => {
    const logs: EnergyLog[] = [];
    for (let d = 0; d < 5; d++) {
      for (const [h, v] of [[8, 4], [11, 9], [12, 8], [16, 3], [21, 2]] as const) {
        logs.push({ id: `${d}-${h}`, value: v, at: new Date(2026, 9, 21 - d, h).getTime(), source: 'manual' });
      }
    }
    expect(peakWindow(logs, now, 7)?.label).toBe('10am–1pm');
    expect(peakWindow([], now, 7)).toBeNull();
  });
});
