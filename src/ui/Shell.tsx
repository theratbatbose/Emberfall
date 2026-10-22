import { motion } from 'motion/react';
import type { Game } from '../state/data';
import { navigate, useRoute } from '../state/router';
import { useUi } from '../state/ui';
import { sfx } from '../services/sound';
import { Icon } from './Icon';
import { GoldAmount, XPBar } from './kit';

export function Header({ game }: { game: Game }) {
  const { level, character, skillPoints } = game;
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-[#2a2421] bg-[#0c0908]/92 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-2">
        <button className="tap relative flex h-12 w-12 shrink-0 items-center justify-center" onClick={() => navigate('/hero')} aria-label={`Level ${level.level}. Open Hero`}>
          <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
            <circle cx="24" cy="24" r="21" fill="#120d0b" stroke="#2f2926" strokeWidth="4" />
            <circle cx="24" cy="24" r="21" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${level.progress * 132} 132`} style={{ filter: 'drop-shadow(0 0 4px rgb(var(--glow) / .8))' }} />
          </svg>
          <span className="relative font-display text-lg font-bold text-bone">{level.level}</span>
          {skillPoints > 0 && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border border-black bg-ember shadow-[0_0_8px_var(--accent)]" aria-label="Skill point available" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-display text-sm font-bold tracking-wider text-bone">{character.name}</span>
            <GoldAmount value={character.gold} className="text-sm" />
          </div>
          <XPBar progress={level.progress} slim />
          <div className="mt-0.5 text-[0.7rem] text-ash">
            {level.into} / {level.needed} XP
          </div>
        </div>
        <button className="tap flex h-12 w-12 items-center justify-center text-ash" onClick={() => navigate('/settings')} aria-label="Settings">
          <Icon name="gear" size={22} />
        </button>
      </div>
    </header>
  );
}

const TABS = [
  { path: '/', label: 'Hearth', icon: 'flame' },
  { path: '/quests', label: 'Quests', icon: 'scroll' },
  { path: '/realm', label: 'Realm', icon: 'realm' },
  { path: '/hero', label: 'Hero', icon: 'hero' },
  { path: '/chronicle', label: 'Chronicle', icon: 'chart' },
];

export function TabBar() {
  const { parts } = useRoute();
  const active = '/' + (parts[0] ?? '');
  const match = (p: string) => (p === '/' ? active === '/' || active === '/ritual' || active === '/map' : active.startsWith(p) || (p === '/quests' && active === '/quest') || (p === '/realm' && active === '/region'));
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-[#2a2421] bg-[#0c0908]/95 backdrop-blur" aria-label="Main">
      <div className="mx-auto flex max-w-lg">
        {TABS.map((t) => {
          const on = match(t.path);
          return (
            <button
              key={t.path}
              className={`tap relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 ${on ? 'text-ember-bright' : 'text-ash'}`}
              onClick={() => {
                sfx.tap();
                navigate(t.path);
              }}
              aria-current={on ? 'page' : undefined}
            >
              {on && <motion.span layoutId="tab-glow" className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-ember shadow-[0_0_10px_var(--accent)]" />}
              <Icon name={t.icon} size={22} className={on ? 'drop-shadow-[0_0_6px_var(--accent)]' : ''} />
              <span className="font-display text-[0.62rem] uppercase tracking-wider">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function CaptureFab() {
  const setOpen = useUi((s) => s.setCaptureOpen);
  return (
    <button
      className="tap fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 z-30 flex h-16 w-16 items-center justify-center rounded-full border-2 border-black"
      style={{
        background: 'radial-gradient(circle at 40% 35%, var(--accent-bright), var(--accent) 50%, var(--accent-deep))',
        boxShadow: '0 0 22px rgb(var(--glow) / 0.65), 0 6px 14px rgb(0 0 0 / 0.6)',
      }}
      onClick={() => {
        sfx.tap();
        setOpen(true);
      }}
      aria-label="Quick capture"
    >
      <Icon name="plus" size={30} className="text-[#1a0d05]" strokeWidth={3} />
    </button>
  );
}
