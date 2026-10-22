import type { Item } from '../db/types';
import { addBonuses, emptyBonuses, type Bonuses } from './bonuses';
import type { WorldEvent } from './events';
import { itemPatch, relicById } from './loot';
import { SKILL_BY_ID } from './skillTree';

/** Collapse gear, passive nodes and today's world event into one Bonuses object. */
export function computeBonuses(equipped: Item[], allocatedNodes: string[], event: WorldEvent | null): Bonuses {
  let b = emptyBonuses();
  for (const item of equipped) {
    b = addBonuses(b, itemPatch(item));
    const relic = relicById(item.uniqueId);
    if (relic) b = addBonuses(b, relic.patch);
  }
  for (const id of allocatedNodes) {
    const node = SKILL_BY_ID.get(id);
    if (node) b = addBonuses(b, node.patch);
  }
  if (event) b = addBonuses(b, event.patch);
  return b;
}
