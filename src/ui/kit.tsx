import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import type { EnergyTag, Item, Region } from '../db/types';
import { energyLabel } from '../game/energy';
import { RARITY_LABEL, relicById } from '../game/loot';
import { Icon } from './Icon';

export function Panel({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={`frame-iron p-4 ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

export function Parchment({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`frame-parchment p-4 ${className}`}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-end justify-between gap-2">
      <h2 className="font-display text-[0.8rem] uppercase tracking-[0.2em] text-ash">{children}</h2>
      {right}
    </div>
  );
}

export function ScreenTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-3 mt-2">
      <h1 className="text-glow text-2xl font-bold text-bone">{children}</h1>
      {sub && <p className="text-ash italic">{sub}</p>}
      <div className="divider-ember mt-2" />
    </div>
  );
}

/** Bottom sheet modal. */
export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70" onClick={onClose} />
          <motion.div
            className="frame-iron safe-bottom relative z-10 max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-b-none p-5"
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {title && <h2 className="mb-3 text-lg font-bold text-ember-bright">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function XPBar({ progress, label, slim }: { progress: number; label?: string; slim?: boolean }) {
  return (
    <div>
      <div className={`relative overflow-hidden rounded-full border border-black bg-[#120d0b] ${slim ? 'h-2' : 'h-3.5'}`} role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: 'linear-gradient(90deg, var(--accent-deep), var(--accent), var(--accent-bright))', boxShadow: '0 0 12px rgb(var(--glow) / 0.7)' }}
          initial={false}
          animate={{ width: `${Math.max(2, progress * 100)}%` }}
          transition={{ type: 'spring', damping: 20, stiffness: 90 }}
        />
      </div>
      {label && <div className="mt-1 text-right text-xs text-ash">{label}</div>}
    </div>
  );
}

export function EnergySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-display text-3xl font-bold text-ember-bright text-glow">{value}</span>
        <span className="font-display text-lg text-bone">{energyLabel(value)}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ember-range"
        aria-label="Energy from 1 (Embers) to 10 (Inferno)"
      />
      <div className="flex justify-between text-xs text-ash">
        <span>Embers</span>
        <span>Inferno</span>
      </div>
    </div>
  );
}

export function EnergyPips({ tag }: { tag: EnergyTag }) {
  const n = tag === 'low' ? 1 : tag === 'med' ? 2 : 3;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${tag} energy`} title={`${tag} energy`}>
      {[0, 1, 2].map((i) => (
        <Icon key={i} name="flame" size={12} className={i < n ? 'text-ember' : 'text-iron'} />
      ))}
    </span>
  );
}

export function RegionGlyph({ region, size = 18, stage = 0 }: { region?: Region; size?: number; stage?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full border border-black"
      style={{
        width: size + 14,
        height: size + 14,
        background: `radial-gradient(circle at 35% 30%, ${region?.colour ?? '#8a817a'}55, #120d0b 75%)`,
        color: stage > 0 ? '#9b86c4' : (region?.colour ?? '#8a817a'),
        filter: stage > 0 ? `saturate(${1 - stage * 0.25})` : undefined,
      }}
    >
      <Icon name={region?.icon ?? 'scroll'} size={size} />
    </span>
  );
}

export function ItemIcon({ item, size = 44 }: { item: Item; size?: number }) {
  return (
    <span className={`rarity-${item.rarity} rarity-glow inline-flex shrink-0 items-center justify-center rounded-md bg-[#0e0b0a]`} style={{ width: size, height: size }}>
      <Icon name={item.icon} size={size * 0.6} />
    </span>
  );
}

export function ItemDetails({ item }: { item: Item }) {
  const relic = relicById(item.uniqueId);
  return (
    <div className={`rarity-${item.rarity}`}>
      <div className="flex items-center gap-3">
        <ItemIcon item={item} size={56} />
        <div>
          <div className="rarity-text-glow font-display text-lg font-bold leading-tight">{item.name}</div>
          <div className="text-sm text-ash">
            {RARITY_LABEL[item.rarity]} · {item.base === 'relic' ? 'relic slot' : item.base}
          </div>
        </div>
      </div>
      <ul className="mt-3 space-y-1 text-bone">
        {relic && <li className="font-semibold text-relic">✦ {relic.effect}</li>}
        {item.affixes.map((a, i) => (
          <li key={i} className="text-enchanted">
            {a.text}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm italic text-ash">“{item.flavour}”</p>
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" className="tap flex min-h-12 w-full items-center justify-between gap-3 text-left" onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <span>{label}</span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full border border-black transition-colors ${on ? 'bg-ember' : 'bg-iron'}`}>
        <span className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-bone shadow transition-all ${on ? 'left-6' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-lg border border-[#3a3431] bg-[#0e0b0a] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`tap min-h-11 flex-1 rounded-md px-2 font-display text-xs uppercase tracking-wider ${value === o.value ? 'btn-ember' : 'text-ash'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function GoldAmount({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-display font-bold text-gold ${className}`}>
      <Icon name="coin" size={16} />
      {value.toLocaleString()}
    </span>
  );
}
