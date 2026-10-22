import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { equipItem } from '../actions/game';
import type { Item, Rarity } from '../db/types';
import { RARITY_LABEL } from '../game/loot';
import { haptic } from '../services/haptics';
import { sfx } from '../services/sound';
import { useUi } from '../state/ui';
import { ItemDetails } from './kit';

const BEAM: Record<Rarity, string> = {
  worn: '157 157 157',
  enchanted: '111 140 255',
  rare: '242 216 75',
  relic: '255 138 31',
};

function Chest({ open, rarity }: { open: boolean; rarity: Rarity }) {
  const glow = `rgb(${BEAM[rarity]})`;
  return (
    <svg viewBox="0 0 200 170" width="220" height="187" aria-hidden="true">
      <defs>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a3420" />
          <stop offset="1" stopColor="#2b170d" />
        </linearGradient>
        <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8c847d" />
          <stop offset="1" stopColor="#3b3532" />
        </linearGradient>
        <radialGradient id="inner" cx="50%" cy="100%" r="80%">
          <stop offset="0" stopColor="#fff6d8" />
          <stop offset="0.35" stopColor={glow} />
          <stop offset="1" stopColor="#1a0d05" />
        </radialGradient>
      </defs>
      {/* body */}
      <rect x="22" y="78" width="156" height="80" rx="6" fill="url(#wood)" stroke="#120a06" strokeWidth="4" />
      {open && <rect x="28" y="74" width="144" height="14" rx="3" fill="url(#inner)" />}
      <rect x="22" y="96" width="156" height="10" fill="url(#band)" stroke="#120a06" strokeWidth="2" />
      <rect x="44" y="78" width="12" height="80" fill="url(#band)" stroke="#120a06" strokeWidth="2" />
      <rect x="144" y="78" width="12" height="80" fill="url(#band)" stroke="#120a06" strokeWidth="2" />
      <rect x="88" y="90" width="24" height="28" rx="4" fill="#c9a24a" stroke="#120a06" strokeWidth="3" />
      <circle cx="100" cy="102" r="4" fill="#120a06" />
      {/* lid */}
      <motion.g
        style={{ originX: 0, originY: 1 }}
        initial={false}
        animate={open ? { rotate: -38, y: -14 } : { rotate: 0, y: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 140 }}
      >
        <path d="M22 78 V58 Q22 26 100 26 Q178 26 178 58 V78 Z" fill="url(#wood)" stroke="#120a06" strokeWidth="4" />
        <path d="M44 78 V40 M156 78 V40" stroke="url(#band)" strokeWidth="12" />
        <path d="M22 70 H178" stroke="url(#band)" strokeWidth="9" />
      </motion.g>
    </svg>
  );
}

export function LootReveal({ calm }: { calm: boolean }) {
  const item = useUi((s) => s.lootQueue[0]);
  const shiftLoot = useUi((s) => s.shiftLoot);
  const doShake = useUi((s) => s.doShake);
  const toast = useUi((s) => s.toast);
  const [stage, setStage] = useState<'shake' | 'open' | 'reveal'>('shake');

  useEffect(() => {
    if (!item) return;
    if (calm) {
      setStage('reveal');
      sfx.loot(item.rarity);
      return;
    }
    setStage('shake');
    const timers = [
      setTimeout(() => sfx.chestShake(), 150),
      setTimeout(() => sfx.chestShake(), 550),
      setTimeout(() => {
        setStage('open');
        sfx.loot(item.rarity);
        haptic.loot();
        if (item.rarity === 'rare' || item.rarity === 'relic') doShake();
      }, 1000),
      setTimeout(() => setStage('reveal'), 1700),
    ];
    return () => timers.forEach(clearTimeout);
  }, [item, calm, doShake]);

  const close = () => shiftLoot();
  const equip = async (it: Item) => {
    await equipItem(it.id);
    toast({ text: `${it.name} equipped.`, tone: 'ember' });
    shiftLoot();
  };

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key={item.id}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => stage !== 'reveal' && setStage('reveal')}
        >
          {/* flash */}
          {!calm && stage === 'open' && (
            <motion.div
              className="pointer-events-none absolute inset-0"
              style={{ background: `radial-gradient(circle at 50% 55%, rgb(${BEAM[item.rarity]} / 0.55), transparent 60%)` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.35] }}
              transition={{ duration: 0.7 }}
            />
          )}
          {/* light beam */}
          {stage !== 'shake' && (
            <motion.div
              className="pointer-events-none absolute left-1/2 top-0 w-28 -translate-x-1/2"
              style={{
                height: '62%',
                background: `linear-gradient(to top, rgb(${BEAM[item.rarity]} / 0.85), rgb(${BEAM[item.rarity]} / 0.25) 60%, transparent)`,
                filter: 'blur(6px)',
                maskImage: 'linear-gradient(to right, transparent, black 30%, black 70%, transparent)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 30%, black 70%, transparent)',
              }}
              initial={{ scaleY: 0, opacity: 0, originY: 1 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: calm ? 0 : 0.5, ease: 'easeOut' }}
            />
          )}

          {stage !== 'reveal' ? (
            <motion.div
              className="relative mt-24"
              animate={calm || stage !== 'shake' ? {} : { rotate: [0, -6, 6, -8, 8, -4, 0], y: [0, -4, 0, -6, 0] }}
              transition={{ duration: 0.9, repeat: 0 }}
            >
              <Chest open={stage === 'open'} rarity={item.rarity} />
              <p className="mt-2 text-center font-display text-ash">{stage === 'shake' ? 'Something stirs…' : ''}</p>
            </motion.div>
          ) : (
            <motion.div
              className="relative w-full max-w-sm"
              initial={calm ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 16 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className={`rarity-${item.rarity} rarity-text-glow mb-3 text-center font-display text-sm uppercase tracking-[0.3em]`}>
                {RARITY_LABEL[item.rarity]} find
              </p>
              <div className={`frame-iron rarity-${item.rarity} rarity-glow p-5`}>
                <ItemDetails item={item} />
              </div>
              <div className="mt-4 flex gap-3">
                <button className="btn btn-ember flex-1" onClick={() => void equip(item)}>
                  Equip
                </button>
                <button className="btn btn-iron flex-1" onClick={close}>
                  To the bag
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
