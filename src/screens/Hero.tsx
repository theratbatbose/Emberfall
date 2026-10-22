import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { useState } from 'react';
import { addReward, allocateNode, buyReward, deleteReward, equipItem, moveItem, refundNode, resetTree, salvageItems, unequipSlot } from '../actions/game';
import { db } from '../db/db';
import type { Item, Slot } from '../db/types';
import type { Bonuses } from '../game/bonuses';
import { SALVAGE_GOLD, SLOT_LABEL, slotsForBase } from '../game/loot';
import { canAllocate, canRefund, SKILL_BY_ID, SKILL_NODES } from '../game/skillTree';
import { useItems, type Game } from '../state/data';
import { navigate } from '../state/router';
import { useUi } from '../state/ui';
import { sfx } from '../services/sound';
import { Icon } from '../ui/Icon';
import { GoldAmount, ItemDetails, ItemIcon, Panel, ScreenTitle, SectionTitle, Segmented, Sheet } from '../ui/kit';

const SLOT_ICON: Record<Slot, string> = {
  weapon: 'sword',
  helm: 'helm',
  chest: 'chest',
  gloves: 'gloves',
  boots: 'boots',
  amulet: 'amulet',
  ring1: 'ring',
  ring2: 'ring',
  relic: 'relic',
};

const THEME_NAMES: Record<string, string> = { ember: 'Ember (default)', rime: 'Rimeglass', moss: 'Mossgrave', gilt: 'Gilded Ash' };

export function HeroScreen({ game, tab = 'gear' }: { game: Game; tab?: string }) {
  return (
    <div>
      <ScreenTitle sub={`Level ${game.level.level} Ashbearer`}>{game.character.name}</ScreenTitle>
      <Segmented
        value={tab as 'gear' | 'tree' | 'merchant'}
        onChange={(v) => navigate(v === 'gear' ? '/hero' : `/hero/${v}`, { replace: true })}
        options={[
          { value: 'gear', label: 'Gear' },
          { value: 'tree', label: `Passives${game.skillPoints > 0 ? ` (${game.skillPoints})` : ''}` },
          { value: 'merchant', label: 'Merchant' },
        ]}
      />
      {tab === 'tree' ? <PassiveTree game={game} /> : tab === 'merchant' ? <Merchant game={game} /> : <Gear game={game} />}
    </div>
  );
}

// ---------------- Gear ----------------

function bonusLines(b: Bonuses): string[] {
  const out: string[] = [];
  if (b.xpPct) out.push(`+${b.xpPct}% XP`);
  if (b.goldPct) out.push(`+${b.goldPct}% gold`);
  if (b.dropPct) out.push(`+${b.dropPct}% loot chance`);
  if (b.runXpPct) out.push(`+${b.runXpPct}% Dungeon Run XP`);
  if (b.lowEnergyXpPct) out.push(`+${b.lowEnergyXpPct}% low-energy XP`);
  if (b.bossXpPct) out.push(`+${b.bossXpPct}% Boss XP`);
  if (b.magicFind) out.push(`+${b.magicFind}% finer loot`);
  for (const [r, v] of Object.entries(b.regionXpPct)) if (v) out.push(`+${v}% ${r[0].toUpperCase() + r.slice(1)} XP`);
  for (const [r, v] of Object.entries(b.regionDropPct)) if (v) out.push(`+${v}% ${r[0].toUpperCase() + r.slice(1)} loot`);
  if (b.blightGraceDays) out.push(`Blight waits +${b.blightGraceDays} day${b.blightGraceDays > 1 ? 's' : ''}`);
  if (b.pityThreshold < 5) out.push(`Loot guaranteed every ${b.pityThreshold} quests`);
  if (b.merchantDiscountPct) out.push(`Merchant −${b.merchantDiscountPct}%`);
  return out;
}

function Silhouette() {
  return (
    <svg viewBox="0 0 100 180" className="h-full w-full opacity-80" aria-hidden="true">
      <defs>
        <linearGradient id="sil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3330" />
          <stop offset="1" stopColor="#14100e" />
        </linearGradient>
        <radialGradient id="silglow" cx="50%" cy="45%" r="50%">
          <stop offset="0" stopColor="rgb(var(--glow) / .35)" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="80" rx="48" ry="80" fill="url(#silglow)" />
      <path
        d="M50 8c9 0 15 7 15 16s-6 17-15 17-15-8-15-17 6-16 15-16zM30 46c6-3 13-4 20-4s14 1 20 4c8 4 12 12 14 24l4 40-10 2-6-34v40l4 52H58l-8-44-8 44H30l4-52V78l-6 34-10-2 4-40c2-12 6-20 14-24z"
        fill="url(#sil)"
        stroke="#4a4440"
        strokeWidth="1.2"
      />
      <path d="M50 54v16M44 62h12" stroke="var(--accent)" strokeWidth="1.5" opacity=".7" />
    </svg>
  );
}

function SlotTile({ slot, item, onClick }: { slot: Slot; item?: Item; onClick: () => void }) {
  return (
    <button className="tap flex flex-col items-center gap-1" onClick={onClick} aria-label={item ? `${SLOT_LABEL[slot]}: ${item.name}` : `${SLOT_LABEL[slot]}: empty`}>
      {item ? (
        <ItemIcon item={item} size={58} />
      ) : (
        <span className="flex h-[58px] w-[58px] items-center justify-center rounded-md border border-dashed border-[#4a4440] bg-[#0e0b0a] text-[#4a4440]">
          <Icon name={SLOT_ICON[slot]} size={28} />
        </span>
      )}
      <span className="font-display text-[0.6rem] uppercase tracking-wider text-ash">{SLOT_LABEL[slot]}</span>
    </button>
  );
}

function Gear({ game }: { game: Game }) {
  const items = useItems();
  const toast = useUi((s) => s.toast);
  const [bag, setBag] = useState<'inventory' | 'stash'>('inventory');
  const [selected, setSelected] = useState<Item | null>(null);
  const [slotPick, setSlotPick] = useState<Slot | null>(null);
  if (!items) return null;
  const byId = new Map(items.map((i) => [i.id, i]));
  const equippedIn = (slot: Slot) => {
    const id = game.character.equipped[slot];
    return id ? byId.get(id) : undefined;
  };
  const list = items.filter((i) => i.location === bag);
  const worn = items.filter((i) => i.location === 'inventory' && i.rarity === 'worn');
  const lines = bonusLines(game.bonuses);

  const salvage = async (ids: string[]) => {
    const gold = await salvageItems(ids);
    sfx.coin();
    toast({ text: `Salvaged for ${gold} gold.`, tone: 'gold' });
    setSelected(null);
  };

  const layout: (Slot | 'fig' | 'gap')[] = ['amulet', 'helm', 'relic', 'weapon', 'fig', 'chest', 'gloves', 'gap', 'boots', 'ring1', 'gap', 'ring2'];

  return (
    <div>
      <Panel className="mt-4">
        <div className="grid grid-cols-3 items-center justify-items-center gap-y-3">
          {layout.map((s, i) =>
            s === 'fig' ? (
              <div key={i} className="row-span-3 h-48 w-24">
                <Silhouette />
              </div>
            ) : s === 'gap' ? (
              <div key={i} />
            ) : (
              <SlotTile
                key={s}
                slot={s}
                item={equippedIn(s)}
                onClick={() => {
                  const it = equippedIn(s);
                  if (it) setSelected(it);
                  else setSlotPick(s);
                }}
              />
            ),
          )}
        </div>
      </Panel>

      <SectionTitle>Active bonuses</SectionTitle>
      <Panel>
        {lines.length ? (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-enchanted">
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm italic text-ash">Equip gear and take passives to gain bonuses.</p>
        )}
      </Panel>

      <SectionTitle
        right={
          bag === 'inventory' && worn.length > 0 ? (
            <button className="tap min-h-10 text-sm text-gold" onClick={() => void salvage(worn.map((w) => w.id))}>
              Salvage all Worn (+{worn.length * SALVAGE_GOLD.worn}g)
            </button>
          ) : undefined
        }
      >
        {bag === 'inventory' ? 'Bag' : 'Stash'}
      </SectionTitle>
      <Segmented
        value={bag}
        onChange={setBag}
        options={[
          { value: 'inventory', label: `Bag (${items.filter((i) => i.location === 'inventory').length})` },
          { value: 'stash', label: `Stash (${items.filter((i) => i.location === 'stash').length})` },
        ]}
      />
      <div className="mt-3 grid grid-cols-5 gap-2">
        {list.map((it) => (
          <button key={it.id} className="tap" onClick={() => setSelected(it)} aria-label={it.name}>
            <ItemIcon item={it} size={56} />
          </button>
        ))}
      </div>
      {!list.length && <p className="mt-3 italic text-ash">{bag === 'inventory' ? 'Empty. Complete quests — loot finds those who show up.' : 'Keep favourite finds here, safe from salvage.'}</p>}

      <Sheet open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div>
            <ItemDetails item={selected} />
            <div className="mt-5 grid grid-cols-2 gap-2">
              {selected.location === 'equipped' ? (
                <button
                  className="btn btn-iron col-span-2"
                  onClick={() => {
                    const slot = (Object.keys(game.character.equipped) as Slot[]).find((s) => game.character.equipped[s] === selected.id);
                    if (slot) void unequipSlot(slot);
                    setSelected(null);
                  }}
                >
                  Unequip
                </button>
              ) : (
                <>
                  {slotsForBase(selected.base).map((s) => (
                    <button
                      key={s}
                      className="btn btn-ember"
                      onClick={() => {
                        void equipItem(selected.id, s);
                        sfx.tap();
                        setSelected(null);
                      }}
                    >
                      Equip{slotsForBase(selected.base).length > 1 ? ` (${s === 'ring1' ? 'left' : 'right'})` : ''}
                    </button>
                  ))}
                  <button
                    className="btn btn-iron"
                    onClick={() => {
                      void moveItem(selected.id, selected.location === 'stash' ? 'inventory' : 'stash');
                      setSelected(null);
                    }}
                  >
                    {selected.location === 'stash' ? 'To bag' : 'To stash'}
                  </button>
                  <button className="btn btn-ghost col-span-2" onClick={() => void salvage([selected.id])}>
                    Salvage for {SALVAGE_GOLD[selected.rarity]} gold
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={!!slotPick} onClose={() => setSlotPick(null)} title={slotPick ? `Equip ${SLOT_LABEL[slotPick].toLowerCase()}` : ''}>
        {slotPick && (
          <div className="space-y-2">
            {items
              .filter((i) => i.location !== 'equipped' && slotsForBase(i.base).includes(slotPick))
              .map((i) => (
                <button
                  key={i.id}
                  className={`frame-iron rarity-${i.rarity} flex w-full items-center gap-3 p-2 text-left`}
                  onClick={() => {
                    void equipItem(i.id, slotPick);
                    setSlotPick(null);
                  }}
                >
                  <ItemIcon item={i} size={44} />
                  <div className="min-w-0">
                    <div className="truncate font-display text-sm font-bold">{i.name}</div>
                    <div className="truncate text-xs text-ash">{i.affixes.map((a) => a.text).join(' · ')}</div>
                  </div>
                </button>
              ))}
            {!items.some((i) => i.location !== 'equipped' && slotsForBase(i.base).includes(slotPick)) && <p className="italic text-ash">Nothing for this slot yet. Keep questing.</p>}
          </div>
        )}
      </Sheet>
    </div>
  );
}

// ---------------- Passive tree ----------------

function PassiveTree({ game }: { game: Game }) {
  const [sel, setSel] = useState<string | null>(null);
  const alloc = game.character.allocatedNodes;
  const taken = new Set(['root', ...alloc]);
  const node = sel ? SKILL_BY_ID.get(sel) : undefined;
  const pts = game.skillPoints;
  const regionColour = (id?: string) => game.regions.find((r) => r.id === id)?.colour ?? '#c9a24a';
  const edges: [string, string][] = [];
  for (const n of SKILL_NODES) for (const l of n.links) if (n.id < l) edges.push([n.id, l]);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <span className="text-ash">
          Points to spend: <span className="font-display text-xl font-bold text-ember-bright">{pts}</span>
        </span>
        {alloc.length > 0 && (
          <button className="tap min-h-10 text-sm text-ash underline decoration-dotted" onClick={() => void resetTree()}>
            Reset all (free)
          </button>
        )}
      </div>
      <div className="frame-iron mt-2 overflow-hidden p-1">
        <svg viewBox="-290 -290 580 580" className="h-auto w-full touch-manipulation" role="group" aria-label="Passive skill tree">
          <defs>
            <radialGradient id="treebg">
              <stop offset="0" stopColor="rgb(var(--glow) / .12)" />
              <stop offset="1" stopColor="transparent" />
            </radialGradient>
          </defs>
          <circle r="270" fill="url(#treebg)" />
          {edges.map(([a, b]) => {
            const A = SKILL_BY_ID.get(a)!;
            const B = SKILL_BY_ID.get(b)!;
            const lit = taken.has(a) && taken.has(b);
            return <line key={a + b} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={lit ? 'var(--accent)' : '#3a3431'} strokeWidth={lit ? 4 : 2.5} style={lit ? { filter: 'drop-shadow(0 0 4px var(--accent))' } : undefined} />;
          })}
          {SKILL_NODES.map((n) => {
            const isTaken = taken.has(n.id);
            const can = canAllocate(n.id, alloc, pts);
            const r = n.kind === 'root' ? 20 : n.kind === 'keystone' ? 18 : n.kind === 'notable' ? 15 : 11;
            const colour = regionColour(n.regionId);
            return (
              <g key={n.id} onClick={() => setSel(n.id)} className="cursor-pointer" role="button" aria-label={`${n.name}: ${n.text}${isTaken ? ' (taken)' : ''}`}>
                <circle r={r + 12} cx={n.x} cy={n.y} fill="transparent" />
                <circle
                  r={r}
                  cx={n.x}
                  cy={n.y}
                  fill={isTaken ? colour : '#151110'}
                  stroke={isTaken ? '#fff3c8' : n.kind === 'keystone' ? '#8a817a' : '#4a4440'}
                  strokeWidth={n.kind === 'keystone' ? 3 : 2}
                  style={isTaken ? { filter: `drop-shadow(0 0 8px ${colour})` } : undefined}
                />
                {can && <motion.circle r={r + 6} cx={n.x} cy={n.y} fill="none" stroke="var(--accent)" strokeWidth={2} animate={{ opacity: [0.2, 0.9, 0.2] }} transition={{ duration: 1.6, repeat: Infinity }} />}
                {sel === n.id && <circle r={r + 9} cx={n.x} cy={n.y} fill="none" stroke="#e9dcc4" strokeWidth={2} strokeDasharray="4 4" />}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 text-sm text-ash">One point per level. Tap a node; glowing ones are in reach. Refunds are always free.</p>

      <Panel className="mt-3 min-h-28">
        {node ? (
          <div>
            <div className="font-display text-lg font-bold text-bone">{node.name}</div>
            <div className="text-enchanted">{node.text}</div>
            <div className="mt-3 flex gap-2">
              {taken.has(node.id) && node.id !== 'root' ? (
                <button className="btn btn-iron flex-1" disabled={!canRefund(node.id, alloc)} onClick={() => void refundNode(node.id)}>
                  {canRefund(node.id, alloc) ? 'Refund' : 'Other nodes depend on it'}
                </button>
              ) : node.id !== 'root' ? (
                <button
                  className="btn btn-ember flex-1"
                  disabled={!canAllocate(node.id, alloc, pts)}
                  onClick={() => {
                    sfx.levelUp();
                    void allocateNode(node.id);
                  }}
                >
                  {pts <= 0 ? 'No points yet — level up' : canAllocate(node.id, alloc, pts) ? 'Take it' : 'Not connected yet'}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="italic text-ash">Tap a node to read it.</p>
        )}
      </Panel>

      {game.bonuses.themes.length > 1 && (
        <>
          <SectionTitle>Themes</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {game.bonuses.themes.map((t) => (
              <button key={t} className={`btn ${game.settings.theme === t ? 'btn-ember' : 'btn-iron'}`} onClick={() => void db.settings.update('settings', { theme: t })}>
                {THEME_NAMES[t] ?? t}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------- Merchant ----------------

function Merchant({ game }: { game: Game }) {
  const rewards = useLiveQuery(() => db.rewards.toArray());
  const purchases = useLiveQuery(() => db.purchases.orderBy('at').reverse().limit(10).toArray());
  const toast = useUi((s) => s.toast);
  const burst = useUi((s) => s.burst);
  const [name, setName] = useState('');
  const [cost, setCost] = useState(300);
  const discount = game.bonuses.merchantDiscountPct;
  const price = (c: number) => Math.max(1, Math.round(c * (1 - Math.min(50, discount) / 100)));

  return (
    <div className="mt-4">
      <Panel className="flex items-center justify-between">
        <span className="font-display text-sm uppercase tracking-wider text-ash">Your purse</span>
        <GoldAmount value={game.character.gold} className="text-xl" />
      </Panel>
      {discount > 0 && <p className="mt-2 text-sm text-gold">The Merchant knocks {discount}% off today.</p>}

      <SectionTitle>Wares (your real-life rewards)</SectionTitle>
      <div className="space-y-2">
        {rewards?.map((r) => {
          const p = price(r.cost);
          const afford = game.character.gold >= p;
          return (
            <div key={r.id} className="frame-parchment flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold">{r.name}</div>
                <div className="text-sm">
                  {p} gold{p !== r.cost && <span className="ml-1 line-through opacity-60">{r.cost}</span>}
                </div>
              </div>
              <button
                className="btn btn-ember px-3"
                disabled={!afford}
                onClick={async (e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  if (await buyReward(r.id, discount)) {
                    sfx.coin();
                    burst(rect.left + rect.width / 2, rect.top, true);
                    toast({ text: `Enjoy it: ${r.name}. You earned this.`, tone: 'gold' });
                  }
                }}
              >
                {afford ? 'Buy' : `${p - game.character.gold} more`}
              </button>
              <button className="tap h-11 w-9 text-[#5a3a20]" onClick={() => void deleteReward(r.id)} aria-label={`Remove ${r.name}`}>
                <Icon name="trash" size={16} />
              </button>
            </div>
          );
        })}
        {!rewards?.length && <p className="italic text-ash">No wares yet. Add the treats you’d like to earn.</p>}
      </div>

      <form
        className="frame-iron mt-3 space-y-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          void addReward(name, cost);
          setName('');
        }}
      >
        <input className="field" placeholder="e.g. 1 hour of gaming" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-2">
          <input type="number" inputMode="numeric" className="field" min={1} value={cost} onChange={(e) => setCost(Number(e.target.value))} aria-label="Cost in gold" />
          <button className="btn btn-iron shrink-0" type="submit">
            Add ware
          </button>
        </div>
        <p className="text-xs text-ash">Rough guide: a small quest pays ~10 gold, a big one 40+.</p>
      </form>

      {!!purchases?.length && (
        <>
          <SectionTitle>Recent treats</SectionTitle>
          <ul className="space-y-1 text-sm text-ash">
            {purchases.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span>
                  {new Date(p.at).toLocaleDateString()} · {p.cost}g
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
