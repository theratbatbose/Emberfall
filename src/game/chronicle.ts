import type { Completion, EnergyLog } from '../db/types';
import { dayKey, DAY } from './time';

/** "Days active this month" — never a streak. A day counts if anything was done or logged. */
export function daysActiveThisMonth(completions: Completion[], logs: EnergyLog[], now: number): number {
  const d = new Date(now);
  const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const days = new Set<string>();
  for (const c of completions) days.add(dayKey(c.at));
  for (const l of logs) days.add(dayKey(l.at));
  return [...days].filter((k) => k.startsWith(prefix)).length;
}

/** Average energy per hour of day over the last `days` days. */
export function hourlyAverages(logs: EnergyLog[], now: number, days: number): (number | null)[] {
  const since = now - days * DAY;
  const sums = Array(24).fill(0);
  const counts = Array(24).fill(0);
  for (const l of logs) {
    if (l.at < since || l.at > now) continue;
    const h = new Date(l.at).getHours();
    sums[h] += l.value;
    counts[h]++;
  }
  return sums.map((s, h) => (counts[h] ? s / counts[h] : null));
}

const hourLabel = (h: number) => {
  const hh = ((h + 11) % 12) + 1;
  return `${hh}${h < 12 || h === 24 ? 'am' : 'pm'}`;
};

/**
 * Best 3-hour window, e.g. "10am–1pm". Needs at least 3 logs in the period and data in
 * the window, otherwise null (not enough embers to read yet).
 */
export function peakWindow(logs: EnergyLog[], now: number, days: number): { start: number; label: string; avg: number } | null {
  const recent = logs.filter((l) => l.at >= now - days * DAY && l.at <= now);
  if (recent.length < 3) return null;
  const avg = hourlyAverages(recent, now, days);
  // Hours with no logs count as your overall average, so one lucky hour can't win alone.
  const overall = recent.reduce((s, l) => s + l.value, 0) / recent.length;
  let best: { start: number; avg: number } | null = null;
  for (let h = 0; h <= 21; h++) {
    const window = [avg[h], avg[h + 1], avg[h + 2]];
    if (window.every((v) => v === null)) continue;
    const a = window.reduce<number>((s, v) => s + (v ?? overall), 0) / 3;
    if (!best || a > best.avg) best = { start: h, avg: a };
  }
  if (!best) return null;
  return { ...best, label: `${hourLabel(best.start)}–${hourLabel(best.start + 3)}` };
}

/** Daily average energy for the last `days` days (oldest first). */
export function dailyAverages(logs: EnergyLog[], now: number, days: number): { day: string; avg: number | null }[] {
  const out: { day: string; avg: number | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(now - i * DAY);
    const vals = logs.filter((l) => dayKey(l.at) === key).map((l) => l.value);
    out.push({ day: key, avg: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null });
  }
  return out;
}
