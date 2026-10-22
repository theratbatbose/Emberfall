import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { heartbeat, startSession } from '../actions/game';
import { db } from '../db/db';
import { defaultSettings } from '../db/seed';
import type { ActiveRun, Item } from '../db/types';
import { blightStage, effectiveBlightDays } from '../game/blight';
import { computeBonuses } from '../game/character';
import { eventForDay } from '../game/events';
import { planReminders } from '../game/reminders';
import { dayKey, MINUTE } from '../game/time';
import { notifications, onInAppReminder } from '../services/notifications';
import { useUi } from './ui';

/** Keep the OS / in-app reminder schedule in step with the data. */
export function useReminderSync() {
  const toast = useUi((s) => s.toast);
  // Re-plan every 30 minutes so the 48h window rolls forward.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30 * MINUTE);
    return () => clearInterval(id);
  }, []);
  const data = useLiveQuery(async () => {
    const [quests, regions, settingsRow, runRow, ritualRow, character] = await Promise.all([
      db.quests.toArray(),
      db.regions.toArray(),
      db.settings.get('settings'),
      db.meta.get('activeRun'),
      db.meta.get('ritualDay'),
      db.character.get('me'),
    ]);
    return { quests, regions, settings: { ...defaultSettings(), ...(settingsRow ?? {}) }, run: (runRow?.value ?? null) as ActiveRun | null, ritualDay: ritualRow?.value as string | undefined, character };
  });

  useEffect(() => {
    onInAppReminder((r) => toast({ text: `${r.title} — ${r.body}`, tone: 'ember', ms: 8000 }));
  }, [toast]);

  useEffect(() => {
    if (!data) return;
    const t = setTimeout(async () => {
      const now = Date.now();
      const equippedIds = Object.values(data.character?.equipped ?? {}).filter((x): x is string => !!x);
      const items = (await db.items.bulkGet(equippedIds)).filter((x): x is Item => !!x);
      const bonuses = computeBonuses(items, data.character?.allocatedNodes ?? [], eventForDay(dayKey(now)));
      const days = effectiveBlightDays(data.settings.blightDays, bonuses.blightGraceDays);
      const blightedRegionNames = data.regions.filter((r) => r.id !== 'unsorted' && blightStage(r.lastActivityAt, now, days) > 0).map((r) => r.name);
      const plan = planReminders({
        quests: data.quests,
        regions: data.regions,
        settings: data.settings,
        activeRun: data.run,
        ritualDoneToday: data.ritualDay === dayKey(now),
        blightedRegionNames,
        now,
      });
      try {
        await notifications().sync(plan);
      } catch (e) {
        console.warn('Reminder sync failed', e);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [data, tick]);
}

/** Session start (return bonus) + a heartbeat while the app is visible. */
export function useSession() {
  useEffect(() => {
    void startSession();
    let hiddenAt = 0;
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        void heartbeat();
      } else if (hiddenAt) {
        void startSession();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    const id = setInterval(() => document.visibilityState === 'visible' && void heartbeat(), MINUTE);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(id);
    };
  }, []);
}
