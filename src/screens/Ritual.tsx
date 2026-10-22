import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { useState } from 'react';
import { logEnergy } from '../actions/game';
import { db } from '../db/db';
import { blightNudge } from '../game/blight';
import { dayMapEntries, nextScheduled } from '../game/dayMap';
import { energyLabel } from '../game/energy';
import { suggestQuests } from '../game/suggestions';
import { formatClock, formatDuration, startOfDay } from '../game/time';
import { useQuests, type Game } from '../state/data';
import { navigate } from '../state/router';
import { useUi } from '../state/ui';
import { Icon } from '../ui/Icon';
import { EnergySlider, Panel, SectionTitle } from '../ui/kit';
import { QuestCard } from '../ui/QuestCard';

/** "Kindle the Fire": energy check, then at most three suggestions. Under a minute. */
export function RitualScreen({ game, now }: { game: Game; now: number }) {
  const quests = useQuests();
  const completionsToday = useLiveQuery(() => db.completions.where('at').aboveOrEqual(startOfDay(now)).toArray());
  const [energy, setEnergy] = useState(5);
  const [step, setStep] = useState<'energy' | 'plan'>('energy');
  const celebrate = useUi((s) => s.celebrate);
  if (!quests || !completionsToday) return null;

  const kindle = async (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const r = await logEnergy(energy, 'morning');
    if (r.bounties.length || r.items.length) celebrate(r, { x: rect.left + rect.width / 2, y: rect.top });
    setStep('plan');
  };

  const suggestions = suggestQuests(quests, { energy, now, blightedRegions: new Set(game.blighted.map((r) => r.id)) });
  const next = nextScheduled(dayMapEntries(quests, completionsToday, now), now);

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+1rem)]">
      <div className="flex items-center justify-between">
        <button className="tap flex h-12 w-12 items-center justify-center text-ash" onClick={() => navigate('/', { replace: true })} aria-label="Close">
          <Icon name="close" />
        </button>
        <span className="font-display text-xs uppercase tracking-[0.3em] text-ash">Kindle the Fire</span>
        <span className="w-12" />
      </div>

      {step === 'energy' ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-10">
          <div className="flex justify-center">
            <motion.div animate={{ scale: 0.6 + energy * 0.06 }} transition={{ type: 'spring', damping: 12 }}>
              <Icon name="flame" size={120} className="flicker text-ember" style={{ filter: `drop-shadow(0 0 ${8 + energy * 3}px var(--accent))` }} />
            </motion.div>
          </div>
          <h1 className="text-glow mt-6 text-center text-2xl font-bold">How bright is your fire?</h1>
          <p className="text-center text-ash">No wrong answer. Embers are still fire.</p>
          <div className="mt-8">
            <EnergySlider value={energy} onChange={setEnergy} />
          </div>
          <button className="btn btn-ember mt-8 w-full text-base" onClick={(e) => void kindle(e)}>
            Kindle · {energyLabel(energy)}
          </button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-glow mt-4 text-2xl font-bold">Three for now</h1>
          <p className="text-ash">Your fire: {energyLabel(energy)}. Just these. The rest can wait.</p>
          <div className="mt-4 space-y-2">
            {suggestions.map((q) => (
              <QuestCard key={q.id} quest={q} all={quests} region={game.regionById.get(q.regionId)} stage={game.stageOf(game.regionById.get(q.regionId))} now={now} />
            ))}
            {!suggestions.length && <Panel className="italic text-ash">Nothing waiting. Add a quest or simply enjoy the quiet.</Panel>}
          </div>

          <SectionTitle>The road today</SectionTitle>
          <button className="frame-iron flex w-full items-center gap-3 p-3 text-left" onClick={() => navigate('/map')}>
            <Icon name="map" className="text-ember" />
            <span className="flex-1">{next ? `${next.title} at ${formatClock(next.at)} (in ${formatDuration(next.at - now)})` : 'Nothing scheduled — an open road.'}</span>
          </button>

          {game.blighted.length > 0 && (
            <>
              <SectionTitle>Regions waiting for you</SectionTitle>
              <div className="space-y-1 text-sm">
                {game.blighted.map((r) => (
                  <p key={r.id}>· {blightNudge(r.name, game.stageOf(r))}</p>
                ))}
              </div>
            </>
          )}

          <button className="btn btn-ember mt-6 w-full" onClick={() => navigate('/', { replace: true })}>
            Begin the day
          </button>
        </motion.div>
      )}
    </div>
  );
}
