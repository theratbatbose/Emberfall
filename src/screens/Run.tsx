import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { completeQuest, endRun, pauseRun, resumeRun, startRun } from '../actions/game';
import { actualMinutes, remainingMs, RUN_DURATIONS } from '../game/runs';
import { actionable } from '../game/suggestions';
import { formatTimer, MINUTE } from '../game/time';
import { runXp } from '../game/xp';
import { useMeta, useNow, useQuests, type Game } from '../state/data';
import { navigate } from '../state/router';
import { originOf, useUi } from '../state/ui';
import { haptic } from '../services/haptics';
import { sfx } from '../services/sound';
import { Icon } from '../ui/Icon';

function Torch({ fraction, lit }: { fraction: number; lit: boolean }) {
  // The wax/wood burns down as time passes; the flame rides on top.
  const h = 40 + 160 * fraction;
  return (
    <svg viewBox="0 0 120 300" className="h-72 w-auto" aria-hidden="true">
      <defs>
        <linearGradient id="stick" x1="0" x2="1">
          <stop offset="0" stopColor="#3b2416" />
          <stop offset=".5" stopColor="#6b4428" />
          <stop offset="1" stopColor="#3b2416" />
        </linearGradient>
        <radialGradient id="halo">
          <stop offset="0" stopColor="rgb(var(--glow) / .55)" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="fire" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="var(--accent-deep)" />
          <stop offset=".5" stopColor="var(--accent)" />
          <stop offset="1" stopColor="#fff2c8" />
        </linearGradient>
      </defs>
      <rect x="44" y={280 - h} width="32" height={h} rx="6" fill="url(#stick)" stroke="#120a06" strokeWidth="3" />
      <rect x="40" y={280 - h} width="40" height="14" rx="4" fill="#4a4440" stroke="#120a06" strokeWidth="3" />
      {lit && (
        <g transform={`translate(60 ${280 - h})`}>
          <circle r="60" cy="-30" fill="url(#halo)" />
          <motion.path
            d="M0 -95 C 12 -70 30 -55 30 -30 A 30 30 0 0 1 -30 -30 C -30 -48 -18 -58 -12 -70 C -10 -58 -4 -52 2 -50 C -4 -66 -2 -82 0 -95 Z"
            fill="url(#fire)"
            style={{ originX: 0.5, originY: 1 }}
            animate={{ scaleY: [1, 1.08, 0.95, 1.05, 1], scaleX: [1, 0.95, 1.04, 0.97, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        </g>
      )}
    </svg>
  );
}

export function RunScreen({ game, query }: { game: Game; query: URLSearchParams }) {
  const run = useMeta('activeRun');
  const quests = useQuests();
  const now = useNow(1000);
  const celebrate = useUi((s) => s.celebrate);
  const [picked, setPicked] = useState<string | undefined>(query.get('quest') ?? undefined);
  const [custom, setCustom] = useState(20);
  const [summary, setSummary] = useState<{ questId?: string; minutes: number; finished: boolean } | null>(null);
  const playedOut = useRef(false);
  const chestRef = useRef<HTMLButtonElement>(null);

  const remaining = run ? remainingMs(run, now) : 0;
  const finished = !!run && remaining <= 0;
  useEffect(() => {
    if (finished && !playedOut.current) {
      playedOut.current = true;
      sfx.torchOut();
      haptic.complete();
    }
    if (!finished) playedOut.current = false;
  }, [finished]);

  if (run === undefined || !quests) return null;
  const quest = run?.questId ? quests.find((q) => q.id === run.questId) : undefined;

  const end = async () => {
    const r = await endRun();
    if (!r) return;
    celebrate(r, originOf(chestRef.current), { questId: run?.questId, source: 'post-run', askEnergyAfterRun: game.settings.askEnergyAfterRun });
    setSummary({ questId: run?.questId, minutes: r.minutes, finished: r.finished });
  };

  // ---------- After a run ----------
  if (!run && summary) {
    const q = summary.questId ? quests.find((x) => x.id === summary.questId) : undefined;
    return (
      <div className="pt-[calc(env(safe-area-inset-top)+2rem)] text-center">
        <Icon name="treasure" size={64} className="mx-auto text-gold" />
        <h1 className="text-glow mt-3 text-2xl font-bold">{summary.finished ? 'The dungeon is cleared' : 'You made it out'}</h1>
        <p className="text-ash">{Math.round(summary.minutes)} minutes of focus, logged{q ? ` against “${q.title}”` : ''}.</p>
        <div className="mt-6 space-y-2">
          {q && q.status === 'active' && (
            <button
              className="btn btn-ember w-full"
              onClick={async (e) => {
                const origin = originOf(e.currentTarget);
                const r = await completeQuest(q.id);
                if (r) celebrate(r, origin, { questId: q.id });
                navigate('/', { replace: true });
              }}
            >
              <Icon name="check" size={18} /> Mark “{q.title}” done
            </button>
          )}
          <div className="grid grid-cols-3 gap-2">
            {[5, 15, 25].map((m) => (
              <button
                key={m}
                className="btn btn-iron"
                onClick={() => {
                  setSummary(null);
                  void startRun(m, summary.questId);
                }}
              >
                +{m} min
              </button>
            ))}
          </div>
          <p className="text-sm text-ash">Continue the run?</p>
          <button className="btn btn-ghost w-full" onClick={() => navigate('/', { replace: true })}>
            Back to the Hearth
          </button>
        </div>
      </div>
    );
  }

  // ---------- Pick a run ----------
  if (!run) {
    const options = actionable(quests, Date.now());
    const start = (min: number) => void startRun(min, picked);
    return (
      <div className="pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <div className="flex items-center gap-2">
          <button className="tap flex h-12 w-12 items-center justify-center text-ash" onClick={() => navigate('/', { replace: true })} aria-label="Close">
            <Icon name="close" />
          </button>
          <h1 className="text-glow text-xl font-bold">Enter a Dungeon</h1>
        </div>
        <p className="mt-1 text-ash">A focus run. Pause any time; leaving early still earns XP.</p>
        <label className="label mt-5" htmlFor="runquest">
          Quest (optional)
        </label>
        <select id="runquest" className="field" value={picked ?? ''} onChange={(e) => setPicked(e.target.value || undefined)}>
          <option value="">Just focus</option>
          {options.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>
        <span className="label mt-5">Torch length</span>
        <div className="grid grid-cols-2 gap-2">
          {RUN_DURATIONS.map((m) => (
            <button key={m} className="btn btn-iron min-h-16 text-lg" onClick={() => start(m)}>
              {m} min
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input type="number" inputMode="numeric" min={1} max={180} className="field" value={custom} onChange={(e) => setCustom(Number(e.target.value))} aria-label="Custom minutes" />
          <button className="btn btn-ember shrink-0" onClick={() => start(Math.max(1, Math.min(180, custom || 1)))}>
            Light it
          </button>
        </div>
      </div>
    );
  }

  // ---------- Running ----------
  const fraction = Math.max(0, remaining / (run.plannedMin * MINUTE));
  const doneMin = actualMinutes(run, now);
  return (
    <div className="flex min-h-[90vh] flex-col items-center pt-[calc(env(safe-area-inset-top)+1rem)] text-center">
      <div className="font-display text-xs uppercase tracking-[0.3em] text-ash">{run.justStart ? 'Just start · 5 minutes' : 'Dungeon Run'}</div>
      <div className="mt-1 max-w-xs truncate text-lg text-bone">{quest?.title ?? 'Focus'}</div>
      <div className="mt-4">
        <Torch fraction={fraction} lit={!finished} />
      </div>
      <div className={`font-display text-6xl font-bold tabular-nums ${run.pausedAt ? 'text-ash' : 'text-glow text-ember-bright'}`} aria-live="polite">
        {finished ? '00:00' : formatTimer(remaining)}
      </div>
      {run.pausedAt && !finished && <div className="text-ash">Paused — the torch waits.</div>}
      {finished ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-6 w-full max-w-xs">
          <p className="text-bone">The torch burns out. Something glints in the dark.</p>
          <button ref={chestRef} className="btn btn-ember mt-4 w-full text-base" onClick={() => void end()}>
            <Icon name="treasure" size={20} /> Open the chest
          </button>
        </motion.div>
      ) : (
        <div className="mt-6 grid w-full max-w-xs grid-cols-2 gap-2">
          {run.pausedAt ? (
            <button className="btn btn-ember" onClick={() => void resumeRun()}>
              <Icon name="play" size={18} /> Resume
            </button>
          ) : (
            <button className="btn btn-iron" onClick={() => void pauseRun()}>
              <Icon name="pause" size={18} /> Pause
            </button>
          )}
          <button ref={chestRef} className="btn btn-ghost" onClick={() => void end()}>
            <Icon name="stop" size={16} /> Leave
          </button>
          <p className="col-span-2 text-sm text-ash">
            Leaving now keeps ≈{runXp(doneMin, game.bonuses)} XP for {Math.floor(doneMin)} min. No penalty, ever.
          </p>
          <button className="col-span-2 min-h-11 text-sm text-ash underline decoration-dotted" onClick={() => navigate('/')}>
            Keep it burning in the background
          </button>
        </div>
      )}
    </div>
  );
}
