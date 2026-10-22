import { create } from 'zustand';
import type { RewardResult } from '../actions/game';
import type { Item } from '../db/types';
import { haptic } from '../services/haptics';
import { sfx } from '../services/sound';

export interface Toast {
  id: number;
  text: string;
  tone?: 'ember' | 'cleanse' | 'gold' | 'plain';
  action?: { label: string; run: () => void };
  ms?: number;
}

export interface Floater {
  id: number;
  x: number;
  y: number;
  lines: { text: string; cls: string }[];
}

export interface Burst {
  id: number;
  x: number;
  y: number;
  big: boolean;
}

interface UiState {
  toasts: Toast[];
  floaters: Floater[];
  bursts: Burst[];
  lootQueue: Item[];
  levelUp: number | null;
  bossSlain: string | null;
  energyPrompt: { questId?: string; source: 'post-quest' | 'post-run' | 'manual' } | null;
  captureOpen: boolean;
  shake: number;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  float: (x: number, y: number, lines: Floater['lines']) => void;
  burst: (x: number, y: number, big?: boolean) => void;
  shiftLoot: () => void;
  clearLevelUp: () => void;
  clearBoss: () => void;
  setEnergyPrompt: (p: UiState['energyPrompt']) => void;
  setCaptureOpen: (open: boolean) => void;
  doShake: () => void;
  celebrate: (r: RewardResult, origin: { x: number; y: number }, opts?: { questId?: string; source?: 'post-quest' | 'post-run'; askEnergyAfterRun?: boolean }) => void;
}

let seq = 1;

export const useUi = create<UiState>((set, get) => ({
  toasts: [],
  floaters: [],
  bursts: [],
  lootQueue: [],
  levelUp: null,
  bossSlain: null,
  energyPrompt: null,
  captureOpen: false,
  shake: 0,
  toast: (t) => {
    const id = seq++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
    setTimeout(() => get().dismissToast(id), t.ms ?? 4000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  float: (x, y, lines) => {
    const id = seq++;
    set((s) => ({ floaters: [...s.floaters, { id, x, y, lines }] }));
    setTimeout(() => set((s) => ({ floaters: s.floaters.filter((f) => f.id !== id) })), 1800);
  },
  burst: (x, y, big = false) => {
    const id = seq++;
    set((s) => ({ bursts: [...s.bursts, { id, x, y, big }] }));
    setTimeout(() => set((s) => ({ bursts: s.bursts.filter((b) => b.id !== id) })), 1400);
  },
  shiftLoot: () => set((s) => ({ lootQueue: s.lootQueue.slice(1) })),
  clearLevelUp: () => set({ levelUp: null }),
  clearBoss: () => set({ bossSlain: null }),
  setEnergyPrompt: (p) => set({ energyPrompt: p }),
  setCaptureOpen: (open) => set({ captureOpen: open }),
  doShake: () => set((s) => ({ shake: s.shake + 1 })),

  /** Immediate feedback for any reward (ADHD rule 4): sound, burst, floating numbers, then loot. */
  celebrate: (r, origin, opts = {}) => {
    const s = get();
    sfx.complete();
    haptic.complete();
    s.burst(origin.x, origin.y, r.items.length > 0 || !!r.bossSlain);
    const lines: Floater['lines'] = [];
    if (r.xp) lines.push({ text: `+${r.xp} XP`, cls: 'text-ember-bright' });
    if (r.gold) lines.push({ text: `+${r.gold} gold`, cls: 'text-gold' });
    if (lines.length) s.float(origin.x, origin.y, lines);
    if (r.gold) setTimeout(() => sfx.coin(), 250);
    for (const name of r.cleansed) {
      setTimeout(() => sfx.cleanse(), 300);
      s.toast({ text: `${name} is cleansed. The fire burns bright again.`, tone: 'cleanse' });
    }
    if (r.halfCredit) s.toast({ text: 'Finished what you started — the rest of the reward is yours.', tone: 'plain' });
    for (const b of r.bounties) s.toast({ text: `Bounty fulfilled: ${b.text} (+${b.gold} gold)`, tone: 'gold' });
    if (r.bountyChest) s.toast({ text: 'All three bounties done! A bounty chest appears.', tone: 'gold' });
    if (r.bossSlain) set({ bossSlain: r.bossSlain });
    if (r.items.length) set((st) => ({ lootQueue: [...st.lootQueue, ...r.items] }));
    if (r.levelUp) set({ levelUp: r.levelUp.to });
    const wantEnergy = opts.source === 'post-run' ? opts.askEnergyAfterRun : r.askEnergy;
    if (wantEnergy) set({ energyPrompt: { questId: opts.questId, source: opts.source ?? 'post-quest' } });
  },
}));

/** Centre of an element, for anchoring effects. */
export function originOf(el: Element | null | undefined): { x: number; y: number } {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
