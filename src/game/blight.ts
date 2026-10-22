import { calendarDaysBetween } from './time';

export const MAX_BLIGHT_STAGE = 3;

/**
 * Blight stage for a region (0 = clear).
 * With no completed quest for `thresholdDays` calendar days, stage 1 sets in, then it
 * deepens one stage every 2 further days, to a maximum of 3. It never takes anything
 * away except the small "Kindled" region XP bonus.
 */
export function blightStage(lastActivityAt: number, now: number, thresholdDays: number): number {
  const idle = calendarDaysBetween(lastActivityAt, now);
  const threshold = Math.max(1, thresholdDays);
  if (idle < threshold) return 0;
  return Math.min(MAX_BLIGHT_STAGE, 1 + Math.floor((idle - threshold) / 2));
}

/**
 * Completing any one quest in a region cleanses it fully: activity resets to now,
 * stage drops to 0. XP is added; nothing is ever subtracted.
 */
export function applyCompletionToRegion<R extends { lastActivityAt: number; blightStage: number; xp: number }>(
  region: R,
  xp: number,
  now: number,
  thresholdDays: number,
): { region: R; cleansed: boolean; previousStage: number } {
  const previousStage = blightStage(region.lastActivityAt, now, thresholdDays);
  return {
    region: { ...region, lastActivityAt: now, blightStage: 0, xp: region.xp + Math.max(0, xp) },
    cleansed: previousStage > 0,
    previousStage,
  };
}

export function effectiveBlightDays(settingDays: number, graceDays: number): number {
  return Math.max(1, settingDays) + Math.max(0, graceDays);
}

export const BLIGHT_LABEL = ['Kindled', 'Ashen Haze', 'Creeping Rot', 'Deep Blight'] as const;

/** Warm, never-shaming nudge copy for a blighted region. */
export function blightNudge(regionName: string, stage: number): string {
  if (stage <= 0) return `${regionName} burns bright.`;
  const lines = [
    `${regionName} grows cold — one small quest rekindles it.`,
    `A haze drifts over ${regionName}. Two minutes would clear it.`,
    `${regionName} is waiting for you. Anything counts, even the smallest thing.`,
  ];
  return lines[Math.min(stage, 3) - 1];
}
