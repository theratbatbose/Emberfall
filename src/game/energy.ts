import type { EnergyTag } from '../db/types';

export const ENERGY_LABELS = [
  'Embers',
  'Smoulder',
  'Flicker',
  'Glow',
  'Kindled',
  'Steady Flame',
  'Bright',
  'Blazing',
  'Roaring',
  'Inferno',
] as const;

export function energyLabel(value: number): string {
  const v = Math.min(10, Math.max(1, Math.round(value)));
  return ENERGY_LABELS[v - 1];
}

/** Which quest energy tags suit this energy level, best first. */
export function suitableTags(energy: number): EnergyTag[] {
  if (energy <= 3) return ['low'];
  if (energy <= 6) return ['low', 'med'];
  return ['high', 'med', 'low'];
}

export const ENERGY_TAG_LABEL: Record<EnergyTag, string> = { low: 'Low', med: 'Medium', high: 'High' };
