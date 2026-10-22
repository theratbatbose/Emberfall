import { db, getMeta, setMeta, TABLES } from '../db/db';
import type { Character, Completion, EnergySource, Item, Quest, Rarity, Region, Slot } from '../db/types';
import { UNSORTED_REGION_ID } from '../db/types';
import { applyCompletionToRegion } from '../game/blight';
import { BOUNTY_CHEST_GOLD, bountiesForDay, bountyComplete, type DayStats } from '../game/bounties';
import { levelInfo } from '../game/levels';
import { dropChance, generateItem, rollDrop, rollRarity, SALVAGE_GOLD, slotsForBase } from '../game/loot';
import { isOpen } from '../game/quests';
import { uid, type Rng } from '../game/random';
import { returnBonusEligible, returnChestGold } from '../game/returnBonus';
import { actualMinutes, isFinished, pause, resume } from '../game/runs';
import { canAllocate, canRefund } from '../game/skillTree';
import { dayKey, startOfDay } from '../game/time';
import { questGold, questXp, runXp } from '../game/xp';
import { getCharacter, loadContext, regionStage, type GameContext } from './context';

export interface RewardResult {
  xp: number;
  gold: number;
  items: Item[];
  levelUp?: { from: number; to: number };
  cleansed: string[];
  bossSlain?: string;
  /** Show the post-quest energy check-in. */
  askEnergy: boolean;
  bounties: { text: string; gold: number; xp: number }[];
  bountyChest: boolean;
  guaranteedDrop: boolean;
  halfCredit?: boolean;
}

const emptyResult = (): RewardResult => ({
  xp: 0,
  gold: 0,
  items: [],
  cleansed: [],
  askEnergy: false,
  bounties: [],
  bountyChest: false,
  guaranteedDrop: false,
});

const ALL = () => TABLES.map((t) => db.table(t));

function addToCharacter(c: Character, xp: number, gold: number, region?: Region): Character {
  const attributeXp = { ...c.attributeXp };
  if (region?.attribute) attributeXp[region.attribute] += xp;
  return { ...c, xp: c.xp + xp, gold: c.gold + gold, attributeXp };
}

async function rollLoot(
  ctx: GameContext,
  chance: number,
  rng: Rng,
  now: number,
  opts: { minRarity?: Rarity; force?: boolean } = {},
): Promise<{ item?: Item; guaranteed: boolean }> {
  const roll = opts.force
    ? { dropped: true, pity: 0, guaranteed: false }
    : rollDrop(chance, ctx.pity, ctx.bonuses.pityThreshold, rng);
  ctx.pity = roll.pity;
  await setMeta('pityCounter', roll.pity);
  if (!roll.dropped) return { guaranteed: false };
  const item = generateItem(rng, rollRarity(rng, ctx.bonuses.magicFind, opts.minRarity), now);
  await db.items.add(item);
  return { item, guaranteed: roll.guaranteed };
}

function finishLevel(before: number, after: number, result: RewardResult) {
  const from = levelInfo(before).level;
  const to = levelInfo(after).level;
  if (to > from) result.levelUp = { from, to };
}

/** Complete one quest (inside a transaction). Parents auto-complete when their last step is done. */
async function completeOne(q: Quest, ctx: GameContext, rng: Rng, now: number, result: RewardResult) {
  const region = ctx.regions.find((r) => r.id === q.regionId) ?? ctx.regions.find((r) => r.id === UNSORTED_REGION_ID);
  const stage = region ? regionStage(region, ctx, now) : 0;
  let xp = questXp(q, ctx.bonuses, { blighted: stage > 0 });
  // "Just Start" already paid full XP today for this quest: finishing it still pays half.
  if (q.startedCreditDay === dayKey(now)) {
    xp = Math.round(xp * 0.5);
    result.halfCredit = true;
  }
  const gold = questGold(xp, ctx.bonuses);

  const recurring = q.type === 'daily' || q.type === 'habit';
  await db.quests.update(q.id, {
    lastCompletedAt: now,
    timesCompleted: q.timesCompleted + 1,
    ...(recurring ? {} : { status: 'done' as const, completedAt: now }),
  });

  let cleansed = false;
  if (region) {
    const applied = applyCompletionToRegion(region, xp, now, ctx.blightDays);
    cleansed = applied.cleansed && region.id !== UNSORTED_REGION_ID;
    await db.regions.put(applied.region);
    Object.assign(region, applied.region);
    if (cleansed) result.cleansed.push(region.name);
  }

  ctx.character = addToCharacter(ctx.character, xp, gold, region);

  const loot = await rollLoot(ctx, dropChance(q, ctx.bonuses), rng, now, {
    minRarity: q.type === 'boss' ? 'enchanted' : 'worn',
  });
  if (loot.item) result.items.push(loot.item);
  if (loot.guaranteed) result.guaranteedDrop = true;

  const completion: Completion = {
    id: uid(),
    questId: q.id,
    title: q.title,
    regionId: q.regionId,
    at: now,
    xp,
    gold,
    itemId: loot.item?.id,
    cleansed,
    kind: 'quest',
    energyTag: q.energyTag,
    questType: q.type,
  };
  await db.completions.add(completion);

  result.xp += xp;
  result.gold += gold;
  if (q.isMajor || q.type === 'boss' || q.estMinutes > 30) result.askEnergy = true;

  if (q.parentId) {
    const parent = await db.quests.get(q.parentId);
    if (parent && parent.status === 'active' && (parent.type === 'quest' || parent.type === 'boss')) {
      const kids = await db.quests.where('parentId').equals(parent.id).toArray();
      if (kids.every((k) => k.status === 'done')) {
        if (parent.type === 'boss') result.bossSlain = parent.title;
        await completeOne(parent, ctx, rng, now, result);
      }
    }
  }
}

export async function completeQuest(questId: string, rng: Rng = Math.random, now = Date.now()): Promise<RewardResult | null> {
  const result = emptyResult();
  const ok = await db.transaction('rw', ALL(), async () => {
    const q = await db.quests.get(questId);
    if (!q || !isOpen(q, now)) return false;
    const ctx = await loadContext(now);
    const before = ctx.character.xp;
    await completeOne(q, ctx, rng, now, result);
    await db.character.put(ctx.character);
    finishLevel(before, ctx.character.xp, result);
    return true;
  });
  if (!ok) return null;
  await checkBounties(rng, now, result);
  return result;
}

// ---------- Bounties ----------

export async function dayStats(now: number): Promise<DayStats> {
  const from = startOfDay(now);
  const completions = await db.completions.where('at').aboveOrEqual(from).toArray();
  const energyLogs = await db.energyLogs.where('at').aboveOrEqual(from).toArray();
  const runs = await db.focusRuns.where('startedAt').aboveOrEqual(from).toArray();
  return {
    completions,
    energyLogs,
    runMinutes: runs.reduce((s, r) => s + r.actualMin, 0),
    runs: runs.filter((r) => !r.abandoned).length,
  };
}

/** Award any newly fulfilled bounties (and the chest for all three). Adds to `result`. */
export async function checkBounties(rng: Rng = Math.random, now = Date.now(), result: RewardResult = emptyResult()) {
  await db.transaction('rw', ALL(), async () => {
    const day = dayKey(now);
    const stats = await dayStats(now);
    const claims = (await getMeta('bountyClaims')) ?? {};
    const claimed = new Set(claims[day] ?? []);
    const todays = bountiesForDay(day);
    const ctx = await loadContext(now);
    const before = ctx.character.xp;
    let changed = false;
    for (const b of todays) {
      if (claimed.has(b.id) || !bountyComplete(b, stats)) continue;
      claimed.add(b.id);
      changed = true;
      ctx.character = addToCharacter(ctx.character, b.xp, b.gold);
      result.bounties.push({ text: b.text, gold: b.gold, xp: b.xp });
      result.xp += b.xp;
      result.gold += b.gold;
      await db.completions.add({ id: uid(), questId: b.id, title: `Bounty: ${b.text}`, regionId: UNSORTED_REGION_ID, at: now, xp: b.xp, gold: b.gold, cleansed: false, kind: 'bounty' });
    }
    if (claimed.size === todays.length && (await getMeta('bountyChestDay')) !== day) {
      await setMeta('bountyChestDay', day);
      ctx.character = addToCharacter(ctx.character, 0, BOUNTY_CHEST_GOLD);
      const loot = await rollLoot(ctx, 1, rng, now, { force: true, minRarity: 'enchanted' });
      if (loot.item) result.items.push(loot.item);
      result.gold += BOUNTY_CHEST_GOLD;
      result.bountyChest = true;
      changed = true;
    }
    if (changed) {
      // Keep only the last week of claims.
      const keep = Object.fromEntries(Object.entries({ ...claims, [day]: [...claimed] }).sort().slice(-7));
      await setMeta('bountyClaims', keep);
      await db.character.put(ctx.character);
      finishLevel(before, ctx.character.xp, result);
    }
  });
  return result;
}

// ---------- Energy ----------

export async function logEnergy(value: number, source: EnergySource, questId?: string, now = Date.now()) {
  await db.energyLogs.add({ id: uid(), value: Math.min(10, Math.max(1, Math.round(value))), at: now, source, questId });
  if (source === 'morning') await setMeta('ritualDay', dayKey(now));
  return checkBounties(Math.random, now);
}

// ---------- Dungeon Runs ----------

export async function startRun(plannedMin: number, questId?: string, justStart = false, now = Date.now()) {
  await setMeta('activeRun', { questId, plannedMin, startedAt: now, pausedMs: 0, justStart });
}

export async function pauseRun(now = Date.now()) {
  const run = await getMeta('activeRun');
  if (run) await setMeta('activeRun', pause(run, now));
}

export async function resumeRun(now = Date.now()) {
  const run = await getMeta('activeRun');
  if (run) await setMeta('activeRun', resume(run, now));
}

/**
 * End the active run. A finished run opens a chest (gold + loot roll). An abandoned run
 * still pays XP for the minutes done — never a penalty. A finished "Just Start" run pays
 * the quest's full XP once per day, even if the quest itself isn't done.
 */
export async function endRun(rng: Rng = Math.random, now = Date.now()): Promise<(RewardResult & { minutes: number; finished: boolean }) | null> {
  const result = emptyResult();
  let minutes = 0;
  let finished = false;
  const ok = await db.transaction('rw', ALL(), async () => {
    const run = await getMeta('activeRun');
    if (!run) return false;
    const ctx = await loadContext(now);
    const before = ctx.character.xp;
    minutes = actualMinutes(run, now);
    finished = isFinished(run, now);
    const quest = run.questId ? await db.quests.get(run.questId) : undefined;
    const region = quest ? ctx.regions.find((r) => r.id === quest.regionId) : undefined;

    let xp = runXp(minutes, ctx.bonuses);
    let gold = 0;
    if (finished) gold += Math.round(5 + minutes * 1.5 * (1 + ctx.bonuses.goldPct / 100));
    if (finished && run.justStart && quest && quest.startedCreditDay !== dayKey(now)) {
      const stage = region ? regionStage(region, ctx, now) : 0;
      xp += questXp(quest, ctx.bonuses, { blighted: stage > 0 });
      await db.quests.update(quest.id, { startedCreditDay: dayKey(now) });
    }

    if (quest) await db.quests.update(quest.id, { actualMinutes: quest.actualMinutes + minutes });
    // A real effort (5+ minutes) in a region counts as activity and cleanses it.
    if (region && minutes >= 5) {
      const applied = applyCompletionToRegion(region, xp, now, ctx.blightDays);
      if (applied.cleansed && region.id !== UNSORTED_REGION_ID) result.cleansed.push(region.name);
      await db.regions.put(applied.region);
    }
    ctx.character = addToCharacter(ctx.character, xp, gold, region);

    if (finished) {
      const loot = await rollLoot(ctx, dropChance({ type: 'run', estMinutes: minutes }, ctx.bonuses), rng, now);
      if (loot.item) result.items.push(loot.item);
      if (loot.guaranteed) result.guaranteedDrop = true;
    }

    await db.focusRuns.add({
      id: uid(),
      questId: run.questId,
      plannedMin: run.plannedMin,
      actualMin: minutes,
      startedAt: run.startedAt,
      endedAt: now,
      abandoned: !finished,
      justStart: run.justStart,
    });
    if (xp > 0 || gold > 0) {
      await db.completions.add({
        id: uid(),
        questId: run.questId ?? 'run',
        title: quest ? `Dungeon Run: ${quest.title}` : 'Dungeon Run',
        regionId: quest?.regionId ?? UNSORTED_REGION_ID,
        at: now,
        xp,
        gold,
        itemId: result.items[0]?.id,
        cleansed: result.cleansed.length > 0,
        kind: run.justStart ? 'start' : 'run',
        minutes,
      });
    }
    await setMeta('activeRun', null);
    await db.character.put(ctx.character);
    result.xp += xp;
    result.gold += gold;
    finishLevel(before, ctx.character.xp, result);
    return true;
  });
  if (!ok) return null;
  await checkBounties(rng, now, result);
  return { ...result, minutes, finished };
}

// ---------- Sessions & the return bonus ----------

/** Call on app open / resume. Returns gold waiting in a return chest (0 if none). */
export async function startSession(now = Date.now()): Promise<number> {
  const lastSeen = await getMeta('lastSeenAt');
  let pending = (await getMeta('pendingReturnChest')) ?? 0;
  if (lastSeen !== undefined && returnBonusEligible(lastSeen, now) && !pending) {
    pending = returnChestGold(lastSeen, now);
    await setMeta('pendingReturnChest', pending);
  }
  await setMeta('lastOpenedAt', now);
  await setMeta('lastSeenAt', now);
  return pending;
}

export async function heartbeat(now = Date.now()) {
  await setMeta('lastSeenAt', now);
}

export async function openReturnChest(rng: Rng = Math.random, now = Date.now()): Promise<RewardResult | null> {
  const result = emptyResult();
  const ok = await db.transaction('rw', ALL(), async () => {
    const gold = (await getMeta('pendingReturnChest')) ?? 0;
    if (!gold) return false;
    const ctx = await loadContext(now);
    const before = ctx.character.xp;
    const loot = await rollLoot(ctx, 1, rng, now, { force: true, minRarity: 'enchanted' });
    if (loot.item) result.items.push(loot.item);
    ctx.character = addToCharacter(ctx.character, 0, gold);
    result.gold = gold;
    await db.character.put(ctx.character);
    await db.completions.add({ id: uid(), questId: 'bonfire', title: 'Rested at the Bonfire', regionId: UNSORTED_REGION_ID, at: now, xp: 0, gold, itemId: loot.item?.id, cleansed: false, kind: 'chest' });
    await setMeta('pendingReturnChest', 0);
    finishLevel(before, ctx.character.xp, result);
    return true;
  });
  return ok ? result : null;
}

// ---------- Gear ----------

export async function equipItem(itemId: string, slot?: Slot) {
  await db.transaction('rw', db.character, db.items, async () => {
    const c = await getCharacter();
    const item = await db.items.get(itemId);
    if (!item) return;
    const options = slotsForBase(item.base);
    const target = slot && options.includes(slot) ? slot : (options.find((s) => !c.equipped[s]) ?? options[0]);
    const prev = c.equipped[target];
    if (prev && prev !== itemId) await db.items.update(prev, { location: 'inventory', equipped: false });
    // If it was already worn in another ring slot, free that slot.
    const equipped = { ...c.equipped };
    for (const s of Object.keys(equipped) as Slot[]) if (equipped[s] === itemId) delete equipped[s];
    equipped[target] = itemId;
    await db.items.update(itemId, { location: 'equipped', equipped: true });
    await db.character.put({ ...c, equipped });
  });
}

export async function unequipSlot(slot: Slot) {
  await db.transaction('rw', db.character, db.items, async () => {
    const c = await getCharacter();
    const id = c.equipped[slot];
    if (!id) return;
    const equipped = { ...c.equipped };
    delete equipped[slot];
    await db.items.update(id, { location: 'inventory', equipped: false });
    await db.character.put({ ...c, equipped });
  });
}

export async function moveItem(itemId: string, location: 'inventory' | 'stash') {
  const item = await db.items.get(itemId);
  if (!item || item.location === 'equipped') return;
  await db.items.update(itemId, { location });
}

export async function salvageItems(ids: string[]): Promise<number> {
  return db.transaction('rw', db.character, db.items, async () => {
    const items = (await db.items.bulkGet(ids)).filter((i): i is Item => !!i && i.location !== 'equipped');
    const gold = items.reduce((s, i) => s + SALVAGE_GOLD[i.rarity], 0);
    await db.items.bulkDelete(items.map((i) => i.id));
    const c = await getCharacter();
    await db.character.put({ ...c, gold: c.gold + gold });
    return gold;
  });
}

// ---------- Passive tree ----------

export async function allocateNode(id: string) {
  await db.transaction('rw', db.character, async () => {
    const c = await getCharacter();
    const points = levelInfo(c.xp).level - 1 - c.allocatedNodes.length;
    if (!canAllocate(id, c.allocatedNodes, points)) return;
    await db.character.put({ ...c, allocatedNodes: [...c.allocatedNodes, id] });
  });
}

export async function refundNode(id: string) {
  await db.transaction('rw', db.character, async () => {
    const c = await getCharacter();
    if (!canRefund(id, c.allocatedNodes)) return;
    await db.character.put({ ...c, allocatedNodes: c.allocatedNodes.filter((n) => n !== id) });
  });
}

export async function resetTree() {
  const c = await getCharacter();
  await db.character.put({ ...c, allocatedNodes: [] });
}

// ---------- Merchant ----------

export async function addReward(name: string, cost: number) {
  await db.rewards.add({ id: uid(), name: name.trim(), cost: Math.max(1, Math.round(cost)), createdAt: Date.now() });
}

export async function deleteReward(id: string) {
  await db.rewards.delete(id);
}

export async function buyReward(rewardId: string, discountPct: number, now = Date.now()): Promise<boolean> {
  return db.transaction('rw', db.character, db.rewards, db.purchases, async () => {
    const r = await db.rewards.get(rewardId);
    const c = await getCharacter();
    if (!r) return false;
    const cost = Math.max(1, Math.round(r.cost * (1 - Math.min(50, discountPct) / 100)));
    if (c.gold < cost) return false;
    await db.character.put({ ...c, gold: c.gold - cost });
    await db.purchases.add({ id: uid(), rewardId: r.id, name: r.name, cost, at: now });
    return true;
  });
}
