import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../db/db';
import { defaultSettings } from '../db/seed';
import type { Item, MetaValues, Region } from '../db/types';
import { blightStage, effectiveBlightDays } from '../game/blight';
import { computeBonuses } from '../game/character';
import { eventForDay } from '../game/events';
import { levelInfo } from '../game/levels';
import { dayKey } from '../game/time';

/** Current time, refreshed every `ms`. */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    const onVis = () => document.visibilityState === 'visible' && setNow(Date.now());
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ms]);
  return now;
}

export const useCharacter = () => useLiveQuery(() => db.character.get('me'));
export const useSettings = () => {
  const s = useLiveQuery(() => db.settings.get('settings'));
  return useMemo(() => (s ? { ...defaultSettings(), ...s } : undefined), [s]);
};
export const useRegions = () => useLiveQuery(() => db.regions.orderBy('order').toArray());
export const useQuests = () => useLiveQuery(() => db.quests.toArray());
export const useItems = () => useLiveQuery(() => db.items.orderBy('obtainedAt').reverse().toArray());

/** Meta value: `undefined` while loading, `null` when not set. */
export function useMeta<K extends keyof MetaValues>(key: K): MetaValues[K] | null | undefined {
  return useLiveQuery(async () => ((await db.meta.get(key))?.value ?? null) as MetaValues[K] | null, [key]);
}

/** Everything derived from the character: level, bonuses, today's event, blight per region. */
export function useGame(now: number) {
  const character = useCharacter();
  const settings = useSettings();
  const regions = useRegions();
  const equippedIds = useMemo(() => Object.values(character?.equipped ?? {}).filter((x): x is string => !!x), [character]);
  const equipped = useLiveQuery(async () => (await db.items.bulkGet(equippedIds)).filter((x): x is Item => !!x), [equippedIds.join(',')]);
  const day = dayKey(now);
  return useMemo(() => {
    if (!character || !settings || !regions || !equipped) return null;
    const event = eventForDay(day);
    const bonuses = computeBonuses(equipped, character.allocatedNodes, event);
    const blightDays = effectiveBlightDays(settings.blightDays, bonuses.blightGraceDays);
    const stageOf = (r: Region | undefined) => (!r || r.id === 'unsorted' ? 0 : blightStage(r.lastActivityAt, now, blightDays));
    const blighted = regions.filter((r) => stageOf(r) > 0);
    const level = levelInfo(character.xp);
    return {
      character,
      settings,
      regions,
      equipped,
      event,
      bonuses,
      blightDays,
      stageOf,
      blighted,
      level,
      skillPoints: level.level - 1 - character.allocatedNodes.length,
      regionById: new Map(regions.map((r) => [r.id, r])),
    };
    // `now` matters only at minute granularity via `day` and blight; recompute each tick is fine.
  }, [character, settings, regions, equipped, day, now]);
}

export type Game = NonNullable<ReturnType<typeof useGame>>;
