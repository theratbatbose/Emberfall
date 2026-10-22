import { beforeEach, describe, expect, it } from 'vitest';
import { db, getMeta, setMeta, useDatabase } from '../db/db';
import { exportSave, importSave } from '../db/backup';
import { migrateSave } from '../db/migrations';
import { seeded } from '../game/random';
import { DAY, MINUTE } from '../game/time';
import { completeQuest, endRun, openReturnChest, startRun, startSession, buyReward, addReward } from './game';
import { ensureInitialized } from './init';
import { addSubquest, createQuest, deleteQuest, quickCapture, restoreQuests } from './quests';

const now = new Date(2026, 9, 22, 10, 0).getTime();
let dbn = 0;

beforeEach(async () => {
  useDatabase(`test-${++dbn}`);
  await ensureInitialized(now);
});

describe('quests', () => {
  it('quick capture lands in Unsorted', async () => {
    const q = await quickCapture('Buy stamps');
    expect(q.regionId).toBe('unsorted');
    expect((await db.quests.get(q.id))?.title).toBe('Buy stamps');
  });

  it('banishing a quest removes its sub-quests and can be undone', async () => {
    const boss = await createQuest({ title: 'Taxes', type: 'boss' });
    await addSubquest(boss.id, 'Find forms');
    await addSubquest(boss.id, 'Fill forms');
    const deleted = await deleteQuest(boss.id);
    expect(deleted.quests).toHaveLength(3);
    expect(await db.quests.count()).toBe(0);
    await restoreQuests(deleted);
    expect(await db.quests.count()).toBe(3);
  });
});

describe('completing quests', () => {
  it('grants XP, gold, region and attribute XP; one-offs close', async () => {
    const q = await createQuest({ title: 'Dishes', regionId: 'hearth', energyTag: 'low', estMinutes: 10 }, now);
    const r = await completeQuest(q.id, seeded(1), now);
    expect(r!.xp).toBeGreaterThan(0);
    const c = await db.character.get('me');
    expect(c!.xp).toBe(r!.xp);
    expect(c!.gold).toBe(r!.gold);
    expect(c!.attributeXp.fortitude).toBeGreaterThan(0);
    expect((await db.quests.get(q.id))!.status).toBe('done');
    expect(await completeQuest(q.id, seeded(1), now)).toBeNull();
  });

  it('cleanses a blighted region with one completion', async () => {
    await db.regions.update('forge', { lastActivityAt: now - 8 * DAY });
    const q = await createQuest({ title: 'Reply to email', regionId: 'forge' }, now);
    const r = await completeQuest(q.id, seeded(2), now);
    expect(r!.cleansed).toEqual(['The Forge']);
    expect((await db.regions.get('forge'))!.lastActivityAt).toBe(now);
  });

  it('the pity timer guarantees loot within 5 quests', async () => {
    const neverLucky = () => 0.9999;
    let drops = 0;
    for (let i = 0; i < 5; i++) {
      const q = await createQuest({ title: `Tiny ${i}`, type: 'habit', estMinutes: 1 }, now);
      const r = await completeQuest(q.id, neverLucky, now + i);
      drops += r!.items.length;
    }
    expect(drops).toBe(1);
    expect(await getMeta('pityCounter')).toBe(0);
  });

  it('a boss falls when its last step is done', async () => {
    const boss = await createQuest({ title: 'Move house', type: 'boss', energyTag: 'high', estMinutes: 60 }, now);
    const a = await addSubquest(boss.id, 'Book van', now);
    const b = await addSubquest(boss.id, 'Pack kitchen', now);
    const r1 = await completeQuest(a!.id, seeded(3), now);
    expect(r1!.bossSlain).toBeUndefined();
    const r2 = await completeQuest(b!.id, seeded(3), now);
    expect(r2!.bossSlain).toBe('Move house');
    expect(r2!.items.length).toBeGreaterThanOrEqual(1);
    expect((await db.quests.get(boss.id))!.status).toBe('done');
    expect(r2!.askEnergy).toBe(true);
  });

  it('dailies can be completed again tomorrow', async () => {
    const q = await createQuest({ title: 'Meds', type: 'daily' }, now);
    expect(await completeQuest(q.id, seeded(4), now)).not.toBeNull();
    expect(await completeQuest(q.id, seeded(4), now + MINUTE)).toBeNull();
    expect(await completeQuest(q.id, seeded(4), now + DAY)).not.toBeNull();
  });
});

describe('dungeon runs', () => {
  it('Just Start pays full quest XP after 5 minutes, then completion pays half', async () => {
    const q = await createQuest({ title: 'Write report', regionId: 'forge', estMinutes: 60, energyTag: 'high' }, now);
    await startRun(5, q.id, true, now);
    const run = await endRun(seeded(5), now + 5 * MINUTE);
    expect(run!.finished).toBe(true);
    expect(run!.xp).toBeGreaterThan(50);
    const done = await completeQuest(q.id, seeded(5), now + 10 * MINUTE);
    expect(done!.halfCredit).toBe(true);
    expect((await db.quests.get(q.id))!.actualMinutes).toBe(5);
  });

  it('abandoning pays partial XP, no chest, no penalty', async () => {
    await startRun(25, undefined, false, now);
    const r = await endRun(seeded(6), now + 10 * MINUTE);
    expect(r!.finished).toBe(false);
    expect(r!.xp).toBeGreaterThan(0);
    expect(r!.gold).toBe(0);
    expect((await db.focusRuns.toArray())[0].abandoned).toBe(true);
    expect(await getMeta('activeRun')).toBeNull();
  });
});

describe('return bonus', () => {
  it('2+ days away grants a Bonfire chest once', async () => {
    await setMeta('lastSeenAt', now - 3 * DAY);
    const gold = await startSession(now);
    expect(gold).toBeGreaterThan(0);
    const chest = await openReturnChest(seeded(7), now);
    expect(chest!.items).toHaveLength(1);
    expect(chest!.items[0].rarity).not.toBe('worn');
    expect(await openReturnChest(seeded(7), now)).toBeNull();
    expect(await startSession(now + MINUTE)).toBe(0);
  });
});

describe('merchant', () => {
  it('buys only with enough gold', async () => {
    await addReward('1 hr gaming', 100);
    const reward = (await db.rewards.toArray())[0];
    expect(await buyReward(reward.id, 0)).toBe(false);
    await db.character.update('me', { gold: 150 });
    expect(await buyReward(reward.id, 0)).toBe(true);
    expect((await db.character.get('me'))!.gold).toBe(50);
    expect(await db.purchases.count()).toBe(1);
  });
});

describe('backup', () => {
  it('export → import restores everything', async () => {
    const q = await createQuest({ title: 'Keep me' }, now);
    await completeQuest(q.id, seeded(8), now);
    const save = JSON.parse(JSON.stringify(await exportSave(now)));
    await db.quests.clear();
    await db.character.update('me', { xp: 0 });
    await importSave(save);
    expect((await db.quests.get(q.id))?.title).toBe('Keep me');
    expect((await db.character.get('me'))!.xp).toBeGreaterThan(0);
  });

  it('rejects files that are not saves, without touching data', async () => {
    await createQuest({ title: 'Safe' }, now);
    await expect(importSave({ hello: 'world' })).rejects.toThrow();
    await expect(importSave({ app: 'emberfall', schemaVersion: 1, data: { character: [] } })).rejects.toThrow();
    expect(await db.quests.count()).toBe(1);
  });

  it('migrations run in order and refuse newer saves', () => {
    const data = { quests: [{ id: 'a' }] };
    const out = migrateSave(data, 1, { 2: (d) => ({ ...d, quests: d.quests.map((x) => ({ ...(x as object), v2: true })) }) }, 2);
    expect(out.quests[0]).toEqual({ id: 'a', v2: true });
    expect(() => migrateSave(data, 5, {}, 1)).toThrow(/newer/);
  });
});
