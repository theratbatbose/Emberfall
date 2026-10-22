import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { completeQuest, startRun } from '../actions/game';
import type { Quest, Region } from '../db/types';
import { doneToday, isAwaiting, subquestProgress } from '../game/quests';
import { dayKey, formatClock } from '../game/time';
import { navigate } from '../state/router';
import { originOf, useUi } from '../state/ui';
import { Icon } from './Icon';
import { EnergyPips, RegionGlyph } from './kit';

export function useComplete() {
  const celebrate = useUi((s) => s.celebrate);
  const toast = useUi((s) => s.toast);
  return async (q: Quest, el: Element | null) => {
    const r = await completeQuest(q.id);
    if (!r) {
      toast({ text: 'Already done for today — well kept.', tone: 'plain' });
      return;
    }
    celebrate(r, originOf(el), { questId: q.id, source: 'post-quest' });
  };
}

export async function justStart(q: Quest) {
  await startRun(5, q.id, true);
  navigate('/run');
}

const TYPE_LABEL: Record<Quest['type'], string> = { daily: 'Daily', habit: 'Habit', quest: 'Quest', boss: 'Boss' };

export function QuestCard({
  quest,
  all,
  region,
  stage = 0,
  now,
  compact = false,
}: {
  quest: Quest;
  all: Quest[];
  region?: Region;
  stage?: number;
  now: number;
  compact?: boolean;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const complete = useComplete();
  const [pressed, setPressed] = useState(false);
  const parent = quest.parentId ? all.find((p) => p.id === quest.parentId) : undefined;
  const progress = parent ? subquestProgress(all, parent.id) : null;
  const awaiting = isAwaiting(parent ?? quest, now);
  const habitCount = quest.type === 'habit' && quest.lastCompletedAt && dayKey(quest.lastCompletedAt) === dayKey(now);
  const finished = quest.type === 'daily' ? doneToday(quest, now) : quest.status === 'done';
  const time = quest.timeOfDay ?? (quest.dueAt && dayKey(quest.dueAt) === dayKey(now) ? formatClock(quest.dueAt) : undefined);
  const hasKids = !parent && all.some((c) => c.parentId === quest.id);
  const startedToday = quest.startedCreditDay === dayKey(now);

  const onComplete = async () => {
    if (finished) return;
    setPressed(true);
    await complete(quest, btn.current);
    setTimeout(() => setPressed(false), 400);
  };

  return (
    <motion.div layout className={`frame-iron flex items-stretch gap-2 p-2 pr-2 ${finished ? 'opacity-55' : ''}`}>
      <button
        ref={btn}
        type="button"
        onClick={() => void onComplete()}
        aria-label={`Complete ${quest.title}`}
        className="tap relative flex w-14 shrink-0 items-center justify-center"
        disabled={finished}
      >
        <motion.span
          className="flex h-12 w-12 items-center justify-center rounded-full border-2"
          style={{
            borderColor: finished ? 'var(--accent)' : '#5a524d',
            background: finished ? 'radial-gradient(circle, var(--accent-bright), var(--accent) 60%, var(--accent-deep))' : 'radial-gradient(circle at 40% 35%, #2a2421, #0e0b0a)',
            boxShadow: finished ? '0 0 16px rgb(var(--glow) / 0.8)' : 'inset 0 2px 6px rgb(0 0 0 / 0.8)',
          }}
          animate={pressed ? { scale: [1, 0.8, 1.15, 1] } : { scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <Icon name={finished ? 'check' : 'flame'} size={22} className={finished ? 'text-[#1a0d05]' : 'text-iron-light'} />
        </motion.span>
      </button>

      <button type="button" className="tap min-w-0 flex-1 py-1 text-left" onClick={() => navigate(`/quest/${parent?.id ?? quest.id}`)}>
        {parent && (
          <div className="truncate text-xs uppercase tracking-wider text-ember">
            {TYPE_LABEL[parent.type]}: {parent.title} · step {progress!.done + 1}/{progress!.total}
          </div>
        )}
        <div className={`truncate text-[1.05rem] leading-snug ${finished ? 'line-through decoration-ember/60' : ''}`}>{quest.title}</div>
        {!compact && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ash">
            <RegionGlyph region={region} size={11} stage={stage} />
            <EnergyPips tag={quest.energyTag} />
            <span>{quest.estMinutes} min</span>
            {!parent && <span>{TYPE_LABEL[quest.type]}</span>}
            {time && <span className="text-bone">⌁ {time}</span>}
            {hasKids && <span>next step only</span>}
            {habitCount && <span className="text-ember">done today · again?</span>}
            {awaiting && <span className="rounded border border-[#5a524d] px-1.5 text-bone">Awaiting you</span>}
            {startedToday && <span className="text-ember">started ✓</span>}
          </div>
        )}
      </button>

      {!finished && (
        <button type="button" onClick={() => void justStart(quest)} className="tap flex w-14 shrink-0 flex-col items-center justify-center rounded-md border border-[#3a3431] bg-[#120e0c] text-ember" aria-label={`Just start ${quest.title}: 5-minute Dungeon Run`}>
          <Icon name="torch" size={20} className="flicker" />
          <span className="font-display text-[0.55rem] uppercase leading-tight tracking-wider text-ash">Just start</span>
        </button>
      )}
    </motion.div>
  );
}
