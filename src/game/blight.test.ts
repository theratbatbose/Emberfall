import { describe, expect, it } from 'vitest';
import { applyCompletionToRegion, blightStage, effectiveBlightDays } from './blight';
import { returnBonusEligible, returnChestGold } from './returnBonus';
import { DAY, HOUR } from './time';

const noon = new Date(2026, 9, 22, 12, 0, 0).getTime();
const daysAgo = (n: number) => noon - n * DAY;

describe('blight stages', () => {
  it('stays clear before the threshold', () => {
    expect(blightStage(daysAgo(0), noon, 3)).toBe(0);
    expect(blightStage(daysAgo(2), noon, 3)).toBe(0);
  });

  it('starts at stage 1 on the threshold day and deepens every 2 days to 3', () => {
    expect(blightStage(daysAgo(3), noon, 3)).toBe(1);
    expect(blightStage(daysAgo(4), noon, 3)).toBe(1);
    expect(blightStage(daysAgo(5), noon, 3)).toBe(2);
    expect(blightStage(daysAgo(7), noon, 3)).toBe(3);
    expect(blightStage(daysAgo(60), noon, 3)).toBe(3);
  });

  it('uses calendar days, not 24h blocks', () => {
    const lateNight = new Date(2026, 9, 19, 23, 30).getTime();
    const earlyMorning = new Date(2026, 9, 22, 0, 30).getTime();
    expect(blightStage(lateNight, earlyMorning, 3)).toBe(1);
  });

  it('grace days from gear/tree delay it', () => {
    expect(effectiveBlightDays(3, 1)).toBe(4);
    expect(blightStage(daysAgo(3), noon, effectiveBlightDays(3, 1))).toBe(0);
  });
});

describe('cleanse', () => {
  it('one completion fully cleanses and never removes XP', () => {
    const region = { id: 'hearth', lastActivityAt: daysAgo(10), blightStage: 3, xp: 500 };
    const { region: after, cleansed, previousStage } = applyCompletionToRegion(region, 12, noon, 3);
    expect(previousStage).toBe(3);
    expect(cleansed).toBe(true);
    expect(after.blightStage).toBe(0);
    expect(after.lastActivityAt).toBe(noon);
    expect(after.xp).toBe(512);
    expect(blightStage(after.lastActivityAt, noon, 3)).toBe(0);
  });

  it('is not reported as a cleanse when the region was already clear', () => {
    const region = { lastActivityAt: daysAgo(1), blightStage: 0, xp: 0 };
    expect(applyCompletionToRegion(region, 10, noon, 3).cleansed).toBe(false);
  });

  it('negative XP can never reduce region XP', () => {
    const region = { lastActivityAt: noon, blightStage: 0, xp: 50 };
    expect(applyCompletionToRegion(region, -100, noon, 3).region.xp).toBe(50);
  });
});

describe('return bonus', () => {
  it('needs 2 days away', () => {
    expect(returnBonusEligible(undefined, noon)).toBe(false);
    expect(returnBonusEligible(noon - 47 * HOUR, noon)).toBe(false);
    expect(returnBonusEligible(noon - 48 * HOUR, noon)).toBe(true);
    expect(returnBonusEligible(daysAgo(10), noon)).toBe(true);
  });

  it('a longer rest gives a bigger (capped) chest', () => {
    expect(returnChestGold(daysAgo(3), noon)).toBeGreaterThan(returnChestGold(daysAgo(2), noon));
    expect(returnChestGold(daysAgo(100), noon)).toBe(returnChestGold(daysAgo(14), noon));
  });
});
