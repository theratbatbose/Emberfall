import { useState } from 'react';
import { createQuest } from '../actions/quests';
import { db } from '../db/db';
import type { AttributeKey, Region } from '../db/types';
import { UNSORTED_REGION_ID } from '../db/types';
import { BLIGHT_LABEL, blightNudge } from '../game/blight';
import { ATTRIBUTES, attributeLevel, attributeProgress } from '../game/levels';
import { isOpen } from '../game/quests';
import { uid } from '../game/random';
import { calendarDaysBetween } from '../game/time';
import { useQuests, type Game } from '../state/data';
import { back, navigate } from '../state/router';
import { useUi } from '../state/ui';
import { Icon } from '../ui/Icon';
import { Panel, RegionGlyph, ScreenTitle, SectionTitle, Sheet, XPBar } from '../ui/kit';
import { QuestCard } from '../ui/QuestCard';

const COLOURS = ['#c0392b', '#e67e22', '#d4a24c', '#5d8aa8', '#b48ee0', '#5fa86b', '#c25b8a', '#8a817a'];
const ICONS = ['drop', 'anvil', 'hearth', 'book', 'lantern', 'shield', 'star', 'flag', 'coin', 'sword'];

function RegionTile({ region, game, now }: { region: Region; game: Game; now: number }) {
  const stage = game.stageOf(region);
  const attr = ATTRIBUTES.find((a) => a.key === region.attribute);
  const attrXp = region.attribute ? game.character.attributeXp[region.attribute] : 0;
  const idle = calendarDaysBetween(region.lastActivityAt, now);
  return (
    <button
      className="frame-iron relative flex w-full items-center gap-3 overflow-hidden p-4 text-left"
      onClick={() => navigate(`/region/${region.id}`)}
      style={{
        background: stage
          ? `linear-gradient(135deg, #1a1422, #0f0c12)`
          : `linear-gradient(135deg, ${region.colour}22, transparent 60%), linear-gradient(180deg, #1d1816, #141110)`,
      }}
    >
      {stage > 0 && (
        <>
          <div className="blight-overlay" style={{ opacity: 0.5 + stage * 0.17 }} />
          <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-60" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
            {Array.from({ length: stage * 2 }, (_, i) => (
              <path key={i} d={`M${-10 + i * 50} ${100 - i * 7} Q ${30 + i * 45} ${60 - i * 4} ${70 + i * 40} ${80 - i * 10} T ${150 + i * 35} ${40 + i * 5}`} stroke="#6b4fa0" strokeWidth={1.4} fill="none" />
            ))}
          </svg>
        </>
      )}
      <RegionGlyph region={region} size={24} stage={stage} />
      <div className="relative min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-display font-bold text-bone">{region.name}</span>
          {attr && <span className="shrink-0 text-xs text-ash">{attr.name} {attributeLevel(attrXp)}</span>}
        </div>
        <div className={`text-sm ${stage ? 'text-[#b9a6dd]' : 'text-ash'}`}>
          {stage ? `${BLIGHT_LABEL[stage]} · one small quest cleanses it` : idle === 0 ? 'Burning bright today' : `Kindled · last lit ${idle} day${idle === 1 ? '' : 's'} ago`}
        </div>
        {attr && (
          <div className="mt-1.5">
            <XPBar progress={attributeProgress(attrXp)} slim />
          </div>
        )}
      </div>
    </button>
  );
}

export function RealmScreen({ game, now }: { game: Game; now: number }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [colour, setColour] = useState(COLOURS[5]);
  const [icon, setIcon] = useState('star');
  const [attribute, setAttribute] = useState<AttributeKey | ''>('');

  const add = async () => {
    if (!name.trim()) return;
    await db.regions.add({
      id: uid(),
      name: name.trim(),
      attribute: attribute || null,
      colour,
      icon,
      order: game.regions.filter((r) => r.id !== UNSORTED_REGION_ID).length,
      lastActivityAt: Date.now(),
      blightStage: 0,
      xp: 0,
      builtin: false,
    });
    setName('');
    setAdding(false);
  };

  return (
    <div>
      <ScreenTitle sub={`The Blight creeps after ${game.blightDays} quiet days. One small quest always clears it.`}>The Realm</ScreenTitle>
      <div className="space-y-2">
        {game.regions
          .filter((r) => r.id !== UNSORTED_REGION_ID)
          .map((r) => (
            <RegionTile key={r.id} region={r} game={game} now={now} />
          ))}
      </div>
      <button className="btn btn-ghost mt-3 w-full" onClick={() => setAdding(true)}>
        <Icon name="plus" size={18} /> New region
      </button>

      <SectionTitle>Attributes</SectionTitle>
      <Panel className="grid grid-cols-1 gap-3">
        {ATTRIBUTES.map((a) => {
          const xp = game.character.attributeXp[a.key];
          return (
            <div key={a.key}>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-sm font-bold">{a.name}</span>
                <span className="font-display text-ember-bright">{attributeLevel(xp)}</span>
              </div>
              <XPBar progress={attributeProgress(xp)} slim />
              <div className="text-xs italic text-ash">{a.blurb}</div>
            </div>
          );
        })}
      </Panel>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Found a new region">
        <div className="space-y-4">
          <input className="field" placeholder="e.g. The Garden" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <span className="label">Colour</span>
            <div className="flex flex-wrap gap-2">
              {COLOURS.map((c) => (
                <button key={c} className={`tap h-11 w-11 rounded-full border-2 ${colour === c ? 'border-bone' : 'border-black'}`} style={{ background: c }} onClick={() => setColour(c)} aria-label={`Colour ${c}`} />
              ))}
            </div>
          </div>
          <div>
            <span className="label">Sigil</span>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((i) => (
                <button key={i} className={`tap flex h-11 w-11 items-center justify-center rounded-md border ${icon === i ? 'border-ember text-ember' : 'border-[#3a3431] text-ash'}`} onClick={() => setIcon(i)} aria-label={i}>
                  <Icon name={i} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Raises attribute</span>
            <select className="field" value={attribute} onChange={(e) => setAttribute(e.target.value as AttributeKey | '')}>
              <option value="">None</option>
              {ATTRIBUTES.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-ember w-full" onClick={() => void add()} disabled={!name.trim()}>
            Found region
          </button>
        </div>
      </Sheet>
    </div>
  );
}

export function RegionScreen({ game, id, now }: { game: Game; id?: string; now: number }) {
  const quests = useQuests();
  const toast = useUi((s) => s.toast);
  const region = game.regions.find((r) => r.id === id);
  const [quick, setQuick] = useState('');
  if (!region || !quests) return null;
  const stage = game.stageOf(region);
  const open = quests.filter((q) => q.regionId === region.id && !q.parentId && isOpen(q, now));
  const smallest = [...open].sort((a, b) => a.estMinutes - b.estMinutes)[0];

  const rename = async (name: string) => {
    if (name.trim() && name !== region.name) await db.regions.update(region.id, { name: name.trim() });
  };
  const remove = async () => {
    await db.quests.where('regionId').equals(region.id).modify({ regionId: UNSORTED_REGION_ID });
    await db.regions.delete(region.id);
    toast({ text: `${region.name} returned to the mist. Its quests moved to Unsorted.`, tone: 'plain' });
    back('/realm');
  };
  const addQuick = async () => {
    if (!quick.trim()) return;
    await createQuest({ title: quick, regionId: region.id, estMinutes: 5 });
    setQuick('');
  };

  return (
    <div className={stage ? 'saturate-[.6]' : ''}>
      <div className="mt-2 flex items-center gap-2">
        <button className="tap flex h-12 w-12 items-center justify-center text-ash" onClick={() => back('/realm')} aria-label="Back">
          <Icon name="back" />
        </button>
        <RegionGlyph region={region} size={22} stage={stage} />
        <input className="min-h-12 flex-1 bg-transparent font-display text-xl font-bold text-bone outline-none" defaultValue={region.name} onBlur={(e) => void rename(e.target.value)} aria-label="Region name" />
      </div>
      <div className="divider-ember my-2" />

      <div className={`frame-iron relative overflow-hidden p-4 ${stage ? 'bg-[#120f17]' : ''}`}>
        {stage > 0 && <div className="blight-overlay" />}
        <p className="relative">{blightNudge(region.name, stage)}</p>
        {stage > 0 && smallest && (
          <p className="relative mt-2 text-sm text-ash">
            Smallest way back: <span className="text-bone">{smallest.title}</span> ({smallest.estMinutes} min)
          </p>
        )}
        <p className="relative mt-1 text-xs text-ash">{region.xp} XP earned here · nothing is ever lost to the Blight.</p>
      </div>

      <SectionTitle>Quests here</SectionTitle>
      <div className="space-y-2">
        {open.map((q) => (
          <QuestCard key={q.id} quest={q} all={quests} region={region} stage={stage} now={now} />
        ))}
        {!open.length && <p className="italic text-ash">No open quests here yet.</p>}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void addQuick();
        }}
      >
        <input className="field" placeholder={`Add a quest to ${region.name}…`} value={quick} onChange={(e) => setQuick(e.target.value)} />
        <button className="btn btn-iron" type="submit" aria-label="Add quest">
          <Icon name="plus" size={18} />
        </button>
      </form>

      {!region.builtin && region.id !== UNSORTED_REGION_ID && (
        <button className="btn btn-ghost mt-8 w-full" onClick={() => void remove()}>
          <Icon name="trash" size={18} /> Remove this region
        </button>
      )}
    </div>
  );
}
