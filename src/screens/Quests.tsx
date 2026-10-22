import { useState } from 'react';
import type { Quest } from '../db/types';
import { doneToday, isOpen, nextSubquest } from '../game/quests';
import { useQuests, type Game } from '../state/data';
import { navigate } from '../state/router';
import { Icon } from '../ui/Icon';
import { RegionGlyph, ScreenTitle, SectionTitle } from '../ui/kit';
import { QuestCard } from '../ui/QuestCard';

export function QuestsScreen({ game, now }: { game: Game; now: number }) {
  const quests = useQuests();
  const [region, setRegion] = useState<string>('all');
  const [showDone, setShowDone] = useState(false);
  if (!quests) return null;

  const top = quests.filter((q) => !q.parentId && (region === 'all' || q.regionId === region));
  const shown = (q: Quest) => (quests.some((c) => c.parentId === q.id) ? (nextSubquest(quests, q.id) ?? q) : q);
  const byOrder = (a: Quest, b: Quest) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity) || a.order - b.order;

  const unsorted = top.filter((q) => q.regionId === 'unsorted' && isOpen(q, now)).sort(byOrder);
  const sorted = top.filter((q) => q.regionId !== 'unsorted');
  const dailies = sorted.filter((q) => q.type === 'daily').sort((a, b) => Number(doneToday(a, now)) - Number(doneToday(b, now)) || (a.timeOfDay ?? '99').localeCompare(b.timeOfDay ?? '99'));
  const habits = sorted.filter((q) => q.type === 'habit').sort(byOrder);
  const oneOffs = sorted.filter((q) => (q.type === 'quest' || q.type === 'boss') && q.status === 'active').sort(byOrder);
  const done = top.filter((q) => (q.type === 'quest' || q.type === 'boss') && q.status === 'done').sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  const card = (q: Quest) => {
    const s = shown(q);
    const r = game.regionById.get(s.regionId);
    return <QuestCard key={q.id} quest={s} all={quests} region={r} stage={game.stageOf(r)} now={now} />;
  };

  return (
    <div>
      <ScreenTitle sub="Every quest, sorted by the fire it needs.">Quest Log</ScreenTitle>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button className={`btn min-h-11 shrink-0 ${region === 'all' ? 'btn-ember' : 'btn-ghost'}`} onClick={() => setRegion('all')}>
          All
        </button>
        {game.regions.map((r) => (
          <button key={r.id} className={`btn min-h-11 shrink-0 gap-1 px-3 normal-case ${region === r.id ? 'btn-ember' : 'btn-ghost'}`} onClick={() => setRegion(r.id)}>
            <RegionGlyph region={r} size={12} stage={game.stageOf(r)} />
            {r.name.replace(/^The /, '')}
          </button>
        ))}
      </div>

      <button className="btn btn-iron mt-3 w-full" onClick={() => navigate('/quest/new')}>
        <Icon name="quill" size={18} /> New quest
      </button>

      {unsorted.length > 0 && (
        <>
          <SectionTitle>Unsorted · tap a quest to give it a home</SectionTitle>
          <div className="space-y-2">{unsorted.map(card)}</div>
        </>
      )}
      {dailies.length > 0 && (
        <>
          <SectionTitle>Dailies</SectionTitle>
          <div className="space-y-2">{dailies.map(card)}</div>
        </>
      )}
      {oneOffs.length > 0 && (
        <>
          <SectionTitle>Quests & Bosses</SectionTitle>
          <div className="space-y-2">{oneOffs.map(card)}</div>
        </>
      )}
      {habits.length > 0 && (
        <>
          <SectionTitle>Habits · repeat whenever</SectionTitle>
          <div className="space-y-2">{habits.map(card)}</div>
        </>
      )}
      {!top.length && <p className="mt-8 text-center italic text-ash">Nothing here yet. The + button captures anything in a breath.</p>}

      {done.length > 0 && (
        <>
          <SectionTitle
            right={
              <button className="tap min-h-10 text-sm text-ash" onClick={() => setShowDone(!showDone)}>
                {showDone ? 'hide' : `show ${done.length}`}
              </button>
            }
          >
            Lit braziers
          </SectionTitle>
          {showDone && <div className="space-y-2">{done.slice(0, 40).map(card)}</div>}
        </>
      )}
    </div>
  );
}
