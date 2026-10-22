import { useLiveQuery } from 'dexie-react-hooks';
import { useRef } from 'react';
import { dayStats, openReturnChest } from '../actions/game';
import { db } from '../db/db';
import { blightNudge } from '../game/blight';
import { bountiesForDay } from '../game/bounties';
import { dayMapEntries, nextScheduled } from '../game/dayMap';
import { energyLabel } from '../game/energy';
import { remainingMs } from '../game/runs';
import { suggestQuests } from '../game/suggestions';
import { DAY, dayKey, formatDuration, formatTimer, startOfDay } from '../game/time';
import { exportBackup } from './Settings';
import { useMeta, useQuests, type Game } from '../state/data';
import { navigate } from '../state/router';
import { originOf, useUi } from '../state/ui';
import { Icon } from '../ui/Icon';
import { Panel, RegionGlyph, SectionTitle, XPBar } from '../ui/kit';
import { QuestCard } from '../ui/QuestCard';

function greeting(now: number) {
  const h = new Date(now).getHours();
  if (h < 5) return 'The night is long, Ashbearer.';
  if (h < 12) return 'Morning, Ashbearer.';
  if (h < 18) return 'The road at midday.';
  return 'Evening at the bonfire.';
}

export function HearthScreen({ game, now }: { game: Game; now: number }) {
  const quests = useQuests();
  const ritualDay = useMeta('ritualDay');
  const pendingChest = useMeta('pendingReturnChest');
  const activeRun = useMeta('activeRun');
  const lastBackupAt = useMeta('lastBackupAt');
  const today = dayKey(now);
  const latestEnergy = useLiveQuery(() => db.energyLogs.where('at').aboveOrEqual(startOfDay(now)).last(), [today]);
  const completionsToday = useLiveQuery(() => db.completions.where('at').aboveOrEqual(startOfDay(now)).toArray(), [today]);
  const stats = useLiveQuery(() => dayStats(now), [today, completionsToday?.length, latestEnergy?.id]);
  const celebrate = useUi((s) => s.celebrate);
  const chestRef = useRef<HTMLButtonElement>(null);

  if (!quests || !completionsToday) return null;
  const blightedIds = new Set(game.blighted.map((r) => r.id));
  const energy = latestEnergy?.value ?? null;
  const suggestions = suggestQuests(quests, { energy, now, blightedRegions: blightedIds });
  const entries = dayMapEntries(quests, completionsToday, now);
  const next = nextScheduled(entries, now);
  const ritualDone = ritualDay === today;
  const bounties = bountiesForDay(today);
  const backupDue = lastBackupAt !== undefined && (lastBackupAt === null ? now - game.character.createdAt > 2 * DAY : now - lastBackupAt > 7 * DAY);
  const evening = new Date(now).getHours() >= 19;
  const questsToday = completionsToday.filter((c) => c.kind === 'quest').length;

  const openChest = async () => {
    const r = await openReturnChest();
    if (r) celebrate(r, originOf(chestRef.current));
  };

  return (
    <div>
      <p className="mt-2 font-display text-lg text-bone">{greeting(now)}</p>

      {!!pendingChest && (
        <button
          ref={chestRef}
          className="frame-iron rarity-enchanted rarity-glow mt-3 flex w-full items-center gap-4 p-4 text-left"
          onClick={() => void openChest()}
        >
          <Icon name="treasure" size={42} className="flicker text-gold" />
          <div className="flex-1">
            <div className="font-display font-bold text-bone">A chest by the fire</div>
            <div className="text-sm text-ash">You’re here. That’s the whole quest. Something waits for you.</div>
          </div>
          <span className="btn btn-ember">Open</span>
        </button>
      )}

      {game.event && (
        <div className="frame-iron mt-3 flex items-center gap-3 border-[#7a6220] p-3">
          <Icon name="sparkle" className="text-gold" />
          <div>
            <div className="font-display text-sm font-bold text-gold">{game.event.name}</div>
            <div className="text-sm text-bone">{game.event.text}</div>
          </div>
        </div>
      )}

      {activeRun && (
        <button className="frame-iron mt-3 flex w-full items-center gap-3 p-3 text-left" onClick={() => navigate('/run')}>
          <Icon name="torch" size={28} className="flicker text-ember" />
          <div className="flex-1">
            <div className="font-display text-sm font-bold">A torch still burns</div>
            <div className="text-sm text-ash">{activeRun.pausedAt ? 'Paused' : `${formatTimer(remainingMs(activeRun, now))} left`} — return to the dungeon</div>
          </div>
          <Icon name="play" className="text-ember" />
        </button>
      )}

      {!ritualDone ? (
        <button className="frame-parchment mt-3 flex w-full items-center gap-4 p-4 text-left" onClick={() => navigate('/ritual')}>
          <Icon name="sun" size={36} className="text-[#8a3a12]" />
          <div className="flex-1">
            <div className="font-display text-lg font-bold">Kindle the Fire</div>
            <div className="text-sm">One minute: how’s your energy? Then three small things.</div>
          </div>
          <Icon name="play" className="text-[#8a3a12]" />
        </button>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-2 text-sm text-ash">
          <span>
            Your fire: <span className="font-display text-ember-bright">{energy ? `${energy} · ${energyLabel(energy)}` : '—'}</span>
          </span>
          <button className="tap min-h-11 underline decoration-dotted" onClick={() => useUi.getState().setEnergyPrompt({ source: 'manual' })}>
            log energy
          </button>
        </div>
      )}

      <button className="frame-iron mt-3 flex w-full items-center gap-3 p-3 text-left" onClick={() => navigate('/map')}>
        <Icon name="map" size={26} className="text-ember" />
        <div className="flex-1">
          {next ? (
            <>
              <div className="font-display text-base font-bold text-bone">
                {game.regionById.get(next.regionId)?.name.replace(/^The /, '') ?? 'Quest'} quest in {formatDuration(next.at - now)}
              </div>
              <div className="truncate text-sm text-ash">{next.title}</div>
            </>
          ) : (
            <>
              <div className="font-display text-base font-bold text-bone">The road is open</div>
              <div className="text-sm text-ash">Nothing scheduled ahead. {questsToday ? `${questsToday} lit today.` : 'Pick anything below.'}</div>
            </>
          )}
        </div>
        <span className="text-xs uppercase tracking-wider text-ash">Day map</span>
      </button>

      <SectionTitle
        right={
          <button className="tap min-h-10 text-sm text-ember" onClick={() => navigate('/quests')}>
            All quests →
          </button>
        }
      >
        {energy ? `Three for now · ${energyLabel(energy)}` : 'Three for now'}
      </SectionTitle>
      {suggestions.length ? (
        <div className="space-y-2">
          {suggestions.map((q) => (
            <QuestCard key={q.id} quest={q} all={quests} region={game.regionById.get(q.regionId)} stage={game.stageOf(game.regionById.get(q.regionId))} now={now} />
          ))}
        </div>
      ) : (
        <Panel className="text-center">
          <p className="text-bone">{quests.length ? 'Everything open is done. Rest is a quest too.' : 'No quests yet.'}</p>
          <button className="btn btn-ember mt-3" onClick={() => navigate('/quest/new')}>
            New quest
          </button>
        </Panel>
      )}

      {game.blighted.length > 0 && (
        <>
          <SectionTitle>The Blight stirs</SectionTitle>
          <div className="space-y-2">
            {game.blighted.map((r) => (
              <button key={r.id} className="frame-iron relative flex w-full items-center gap-3 p-3 text-left" onClick={() => navigate(`/region/${r.id}`)}>
                <div className="blight-overlay" />
                <RegionGlyph region={r} stage={game.stageOf(r)} />
                <span className="flex-1 text-sm">{blightNudge(r.name, game.stageOf(r))}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <SectionTitle>Today’s bounties</SectionTitle>
      <Panel className="space-y-3">
        {bounties.map((b) => {
          const p = stats ? Math.min(b.target, b.progress(stats)) : 0;
          const done = p >= b.target;
          return (
            <div key={b.id}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className={done ? 'text-ember-bright' : ''}>
                  {done ? '✦ ' : ''}
                  {b.text}
                </span>
                <span className="shrink-0 text-xs text-gold">+{b.gold}g</span>
              </div>
              <XPBar progress={p / b.target} slim />
            </div>
          );
        })}
        <p className="text-xs text-ash">All three opens a bounty chest. New ones at dawn.</p>
      </Panel>

      {evening && (
        <button className="frame-parchment mt-4 flex w-full items-center gap-3 p-4 text-left" onClick={() => navigate('/chronicle')}>
          <Icon name="moon" size={30} className="text-[#2a1d12]" />
          <div>
            <div className="font-display font-bold">The Ember Chronicle</div>
            <div className="text-sm">See how your fire burned today.</div>
          </div>
        </button>
      )}

      {backupDue && (
        <button className="frame-iron mt-4 flex w-full items-center gap-3 p-3 text-left" onClick={() => void exportBackup()}>
          <Icon name="download" className="text-ember" />
          <div className="flex-1 text-sm">
            <div className="font-display font-bold text-bone">Seal your chronicle</div>
            Your save lives only on this phone. One tap to keep a backup copy.
          </div>
        </button>
      )}
    </div>
  );
}
