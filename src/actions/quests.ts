import { db } from '../db/db';
import type { Quest } from '../db/types';
import { UNSORTED_REGION_ID } from '../db/types';
import { uid } from '../game/random';

export type QuestDraft = Partial<Omit<Quest, 'id' | 'createdAt'>> & { title: string };

export async function createQuest(draft: QuestDraft, now = Date.now()): Promise<Quest> {
  const count = await db.quests.count();
  const quest: Quest = {
    id: uid(),
    regionId: UNSORTED_REGION_ID,
    type: 'quest',
    energyTag: 'low',
    estMinutes: 10,
    isMajor: false,
    reminders: [],
    order: count,
    status: 'active',
    timesCompleted: 0,
    actualMinutes: 0,
    createdAt: now,
    ...draft,
    title: draft.title.trim() || 'Untitled quest',
  };
  await db.quests.add(quest);
  return quest;
}

/** Quick capture: title only, straight into the Unsorted inbox. */
export function quickCapture(title: string) {
  return createQuest({ title, regionId: UNSORTED_REGION_ID });
}

export async function updateQuest(id: string, patch: Partial<Quest>) {
  await db.quests.update(id, patch);
}

export interface DeletedQuests {
  quests: Quest[];
}

/** "Banish" a quest (and its sub-quests). Returns what was removed so it can be undone. */
export async function deleteQuest(id: string): Promise<DeletedQuests> {
  return db.transaction('rw', db.quests, async () => {
    const quest = await db.quests.get(id);
    if (!quest) return { quests: [] };
    const removed: Quest[] = [quest];
    const queue = [id];
    while (queue.length) {
      const kids = await db.quests.where('parentId').equals(queue.shift()!).toArray();
      removed.push(...kids);
      queue.push(...kids.map((k) => k.id));
    }
    await db.quests.bulkDelete(removed.map((q) => q.id));
    return { quests: removed };
  });
}

export async function restoreQuests(deleted: DeletedQuests) {
  await db.quests.bulkPut(deleted.quests);
}

export async function addSubquest(parentId: string, title: string, now = Date.now()) {
  const parent = await db.quests.get(parentId);
  if (!parent) return;
  const siblings = await db.quests.where('parentId').equals(parentId).count();
  // A parent that was finished re-opens when a new step is added.
  if (parent.status === 'done' && (parent.type === 'quest' || parent.type === 'boss')) {
    await db.quests.update(parentId, { status: 'active', completedAt: undefined });
  }
  return createQuest(
    {
      title,
      parentId,
      regionId: parent.regionId,
      type: 'quest',
      energyTag: parent.energyTag === 'high' ? 'med' : 'low',
      estMinutes: 10,
      order: siblings,
    },
    now,
  );
}

export async function moveSubquest(id: string, dir: -1 | 1) {
  const q = await db.quests.get(id);
  if (!q?.parentId) return;
  const sibs = (await db.quests.where('parentId').equals(q.parentId).toArray()).sort((a, b) => a.order - b.order);
  const i = sibs.findIndex((s) => s.id === id);
  const j = i + dir;
  if (j < 0 || j >= sibs.length) return;
  [sibs[i], sibs[j]] = [sibs[j], sibs[i]];
  await db.quests.bulkPut(sibs.map((s, idx) => ({ ...s, order: idx })));
}
