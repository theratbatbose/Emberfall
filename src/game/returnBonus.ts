import { DAY } from './time';

/** Away for 2+ days → the next session grants a "Rested at the Bonfire" chest. */
export const RETURN_BONUS_GAP_MS = 2 * DAY;

export function returnBonusEligible(lastSeenAt: number | undefined, now: number): boolean {
  if (lastSeenAt === undefined) return false;
  return now - lastSeenAt >= RETURN_BONUS_GAP_MS;
}

/** The longer the rest, the better the chest (capped). Gold reward for the bonfire chest. */
export function returnChestGold(lastSeenAt: number, now: number): number {
  const days = Math.min(14, Math.floor((now - lastSeenAt) / DAY));
  return 40 + days * 15;
}

export const RETURN_GREETINGS = [
  'The fire kept itself warm for you.',
  'You rested. The road waited. Welcome back, Ashbearer.',
  'Nothing was lost while you were away. Here — take this.',
];
