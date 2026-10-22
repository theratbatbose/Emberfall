import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { logEnergy } from '../actions/game';
import { quickCapture } from '../actions/quests';
import { haptic } from '../services/haptics';
import { sfx } from '../services/sound';
import { useUi } from '../state/ui';
import { Icon } from './Icon';
import { EnergySlider, Sheet } from './kit';
import { LootReveal } from './LootReveal';

function Bursts({ calm }: { calm: boolean }) {
  const bursts = useUi((s) => s.bursts);
  if (calm) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {bursts.map((b) => (
        <div key={b.id} className="absolute" style={{ left: b.x, top: b.y }}>
          {Array.from({ length: b.big ? 26 : 16 }, (_, i) => {
            const angle = (i / (b.big ? 26 : 16)) * Math.PI * 2 + Math.random() * 0.4;
            const dist = (b.big ? 90 : 55) + Math.random() * 40;
            const size = 3 + Math.random() * 4;
            return (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{
                  width: size,
                  height: size,
                  marginLeft: -size / 2,
                  marginTop: -size / 2,
                  background: 'radial-gradient(circle, #fff3c8, var(--accent) 60%, transparent)',
                  boxShadow: '0 0 8px rgb(var(--glow) / 0.9)',
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 30, opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.9 + Math.random() * 0.4, ease: 'easeOut' }}
              />
            );
          })}
          <motion.span
            className="absolute -ml-10 -mt-10 h-20 w-20 rounded-full"
            style={{ background: 'radial-gradient(circle, rgb(var(--glow) / 0.6), transparent 70%)' }}
            initial={{ scale: 0.3, opacity: 1 }}
            animate={{ scale: b.big ? 3 : 2, opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        </div>
      ))}
    </div>
  );
}

function Floaters() {
  const floaters = useUi((s) => s.floaters);
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <AnimatePresence>
        {floaters.map((f) => (
          <motion.div
            key={f.id}
            className="absolute -translate-x-1/2 text-center"
            style={{ left: Math.min(Math.max(f.x, 70), window.innerWidth - 70), top: f.y - 20 }}
            initial={{ y: 0, opacity: 0, scale: 0.6 }}
            animate={{ y: -90, opacity: [0, 1, 1, 0], scale: [0.6, 1.25, 1, 1] }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
          >
            {f.lines.map((l, i) => (
              <div key={i} className={`font-display text-2xl font-bold ${l.cls}`} style={{ textShadow: '0 2px 0 #000, 0 0 14px rgb(var(--glow) / 0.8)' }}>
                {l.text}
              </div>
            ))}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            className={`frame-iron pointer-events-auto flex w-full max-w-md items-center gap-3 px-4 py-3 ${
              t.tone === 'cleanse' ? 'border-[#6a5a8a]' : t.tone === 'gold' ? 'border-[#7a6220]' : ''
            }`}
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
          >
            <Icon name={t.tone === 'cleanse' ? 'sparkle' : t.tone === 'gold' ? 'coin' : 'flame'} className={t.tone === 'gold' ? 'text-gold' : t.tone === 'cleanse' ? 'text-[#c9b8f0]' : 'text-ember'} />
            <span className="flex-1 text-[0.98rem] leading-snug">{t.text}</span>
            {t.action && (
              <button
                className="btn btn-iron min-h-10 px-3"
                onClick={() => {
                  t.action!.run();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function LevelUp({ calm }: { calm: boolean }) {
  const level = useUi((s) => s.levelUp);
  const lootPending = useUi((s) => s.lootQueue.length > 0);
  const clear = useUi((s) => s.clearLevelUp);
  const show = level !== null && !lootPending;
  useEffect(() => {
    if (show) {
      sfx.levelUp();
      haptic.levelUp();
    }
  }, [show]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={clear}>
          {!calm && (
            <motion.div
              className="pointer-events-none absolute h-80 w-80 rounded-full"
              style={{ background: 'conic-gradient(from 0deg, transparent, rgb(var(--glow) / 0.5), transparent 30%, rgb(var(--glow) / 0.4), transparent 60%, rgb(var(--glow) / 0.5), transparent)' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            />
          )}
          <motion.div className="relative text-center" initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }}>
            <div className="font-display text-sm uppercase tracking-[0.4em] text-ash">The fire grows</div>
            <div className="text-glow font-display text-6xl font-bold text-ember-bright">Level {level}</div>
            <p className="mt-3 text-bone">A passive point awaits in the Hero’s tree.</p>
            <button className="btn btn-ember mt-6" onClick={clear}>
              Onward
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BossBanner() {
  const boss = useUi((s) => s.bossSlain);
  const clear = useUi((s) => s.clearBoss);
  useEffect(() => {
    if (!boss) return;
    const t = setTimeout(clear, 3200);
    return () => clearTimeout(t);
  }, [boss, clear]);
  return (
    <AnimatePresence>
      {boss && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 top-1/3 z-50 flex justify-center"
          initial={{ opacity: 0, scale: 1.4 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="bg-gradient-to-r from-transparent via-black/90 to-transparent px-16 py-5 text-center">
            <div className="font-display text-xs uppercase tracking-[0.4em] text-blood">Boss slain</div>
            <div className="text-glow font-display text-3xl font-bold text-bone">{boss}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EnergyCheckIn() {
  const prompt = useUi((s) => s.energyPrompt);
  const busy = useUi((s) => s.lootQueue.length > 0 || s.levelUp !== null);
  const set = useUi((s) => s.setEnergyPrompt);
  const celebrate = useUi((s) => s.celebrate);
  const [v, setV] = useState(5);
  const open = !!prompt && !busy;
  const save = async () => {
    const r = await logEnergy(v, prompt!.source, prompt!.questId);
    set(null);
    if (r.bounties.length || r.items.length) celebrate(r, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
  };
  return (
    <Sheet open={open} onClose={() => set(null)} title="How’s your fire now?">
      <EnergySlider value={v} onChange={setV} />
      <div className="mt-5 flex gap-3">
        <button className="btn btn-ember flex-1" onClick={() => void save()}>
          Log it
        </button>
        <button className="btn btn-ghost flex-1" onClick={() => set(null)}>
          Skip
        </button>
      </div>
    </Sheet>
  );
}

function QuickCapture() {
  const open = useUi((s) => s.captureOpen);
  const setOpen = useUi((s) => s.setCaptureOpen);
  const toast = useUi((s) => s.toast);
  const [title, setTitle] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) setTimeout(() => ref.current?.focus(), 60);
    else setTitle('');
  }, [open]);
  const save = async () => {
    if (!title.trim()) return;
    await quickCapture(title);
    sfx.tap();
    toast({ text: `“${title.trim()}” added to Unsorted.`, tone: 'plain', ms: 2500 });
    setTitle('');
    setOpen(false);
  };
  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="Quick capture">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <input ref={ref} className="field" placeholder="What’s on your mind?" value={title} onChange={(e) => setTitle(e.target.value)} enterKeyHint="done" autoComplete="off" />
        <p className="mt-2 text-sm text-ash">Lands in Unsorted. Sort it later — or never.</p>
        <button className="btn btn-ember mt-4 w-full" type="submit" disabled={!title.trim()}>
          Capture
        </button>
      </form>
    </Sheet>
  );
}

export function Effects({ calm }: { calm: boolean }) {
  return (
    <>
      <Bursts calm={calm} />
      <Floaters />
      <BossBanner />
      <LootReveal calm={calm} />
      <LevelUp calm={calm} />
      <EnergyCheckIn />
      <QuickCapture />
      <Toasts />
    </>
  );
}
