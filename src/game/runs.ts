import type { ActiveRun } from '../db/types';
import { MINUTE } from './time';

/**
 * Dungeon Run timer maths. Everything is derived from timestamps, so the timer stays
 * correct with the screen off or the app closed: nothing ever counts ticks.
 */
export function elapsedMs(run: ActiveRun, now: number): number {
  const pausedNow = run.pausedAt !== undefined ? now - run.pausedAt : 0;
  return Math.max(0, now - run.startedAt - run.pausedMs - pausedNow);
}

export function remainingMs(run: ActiveRun, now: number): number {
  return Math.max(0, run.plannedMin * MINUTE - elapsedMs(run, now));
}

export function isFinished(run: ActiveRun, now: number): boolean {
  return remainingMs(run, now) <= 0;
}

/** When the run will end if it keeps running (for the end alert). */
export function endsAt(run: ActiveRun, now: number): number {
  return now + remainingMs(run, now);
}

export function pause(run: ActiveRun, now: number): ActiveRun {
  if (run.pausedAt !== undefined) return run;
  return { ...run, pausedAt: now };
}

export function resume(run: ActiveRun, now: number): ActiveRun {
  if (run.pausedAt === undefined) return run;
  return { ...run, pausedMs: run.pausedMs + (now - run.pausedAt), pausedAt: undefined };
}

export function actualMinutes(run: ActiveRun, now: number): number {
  return Math.min(run.plannedMin, elapsedMs(run, now) / MINUTE);
}

export const RUN_DURATIONS = [5, 15, 25, 45];
