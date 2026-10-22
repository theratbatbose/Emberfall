import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { createQuest } from '../actions/quests';
import { db, setMeta } from '../db/db';
import { importSave } from '../db/backup';
import { STARTER_QUESTS } from '../db/seed';
import { pickTextFile } from '../services/files';
import { useRegions } from '../state/data';
import { useUi } from '../state/ui';
import { Icon } from '../ui/Icon';
import { EnergyPips, RegionGlyph } from '../ui/kit';

export function Onboarding() {
  const regions = useRegions();
  const toast = useUi((s) => s.toast);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<Set<number>>(new Set());

  const finish = async () => {
    for (const i of picked) {
      const s = STARTER_QUESTS[i];
      await createQuest({ ...s, reminders: [] });
    }
    if (name.trim()) await db.character.update('me', { name: name.trim() });
    await setMeta('pendingReturnChest', 30);
    await db.settings.update('settings', { onboarded: true });
  };

  const restore = async () => {
    const text = await pickTextFile();
    if (!text) return;
    try {
      await importSave(JSON.parse(text));
      await db.settings.update('settings', { onboarded: true });
      toast({ text: 'Save restored. Welcome back, Ashbearer.', tone: 'ember' });
    } catch (e) {
      toast({ text: (e as Error).message || 'That file couldn’t be read.', tone: 'plain', ms: 6000 });
    }
  };

  const pages = [
    <div key="0" className="text-center">
      <Icon name="flame" size={96} className="flicker mx-auto text-ember" style={{ filter: 'drop-shadow(0 0 24px var(--accent))' }} />
      <h1 className="text-glow mt-4 text-3xl font-bold">Emberfall</h1>
      <p className="mt-4 text-lg leading-relaxed text-bone">
        The world is ash. A slow Blight creeps over the places you care about. You carry the last ember — you are the <span className="text-ember-bright">Ashbearer</span>.
      </p>
      <p className="mt-3 text-ash">Every small real-life task feeds the fire: XP, gold, and loot.</p>
      <label className="label mt-8 text-left" htmlFor="onb-name">
        What shall the fire call you?
      </label>
      <input id="onb-name" className="field" placeholder="Ashbearer" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="btn btn-ember mt-6 w-full text-base" onClick={() => setStep(1)}>
        Take up the ember
      </button>
      <button className="tap mt-4 min-h-11 text-sm text-ash underline decoration-dotted" onClick={() => void restore()}>
        I already have a save file
      </button>
    </div>,
    <div key="1">
      <h1 className="text-glow text-2xl font-bold">How the fire works</h1>
      <ul className="mt-5 space-y-4 text-bone">
        {[
          ['flame', 'Complete quests', 'One tap on the flame. XP, gold and a chance at loot — small tasks always count.'],
          ['torch', 'Just start', 'Stuck? Tap “Just start” for a 5-minute Dungeon Run. Starting earns the full reward.'],
          ['sparkle', 'The Blight is gentle', 'Leave a region quiet and it fogs over. Any one small quest clears it. You never lose anything.'],
          ['sun', 'No streaks. Ever.', 'Gone for days? Coming back earns a chest, not a scolding.'],
        ].map(([icon, title, body]) => (
          <li key={title} className="flex gap-3">
            <Icon name={icon} size={28} className="mt-1 shrink-0 text-ember" />
            <div>
              <div className="font-display font-bold">{title}</div>
              <div className="text-ash">{body}</div>
            </div>
          </li>
        ))}
      </ul>
      <button className="btn btn-ember mt-8 w-full" onClick={() => setStep(2)}>
        Next
      </button>
    </div>,
    <div key="2">
      <h1 className="text-glow text-2xl font-bold">Pick a few starting quests</h1>
      <p className="mt-1 text-ash">Tick only what fits your life. Skip the rest. You can add, change or banish quests any time.</p>
      <div className="mt-4 space-y-4">
        {regions
          ?.filter((r) => r.id !== 'unsorted')
          .map((r) => (
            <div key={r.id}>
              <div className="mb-1 flex items-center gap-2 font-display text-sm text-ash">
                <RegionGlyph region={r} size={12} /> {r.name}
              </div>
              <div className="space-y-1.5">
                {STARTER_QUESTS.map((q, i) =>
                  q.regionId !== r.id ? null : (
                    <button
                      key={i}
                      className={`tap flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 text-left ${picked.has(i) ? 'border-ember bg-[#24150d]' : 'border-[#3a3431] bg-[#0e0b0a]'}`}
                      onClick={() => {
                        const next = new Set(picked);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        setPicked(next);
                      }}
                      aria-pressed={picked.has(i)}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border ${picked.has(i) ? 'border-ember bg-ember text-[#1a0d05]' : 'border-[#5a524d]'}`}>{picked.has(i) && <Icon name="check" size={16} />}</span>
                      <span className="flex-1">{q.title}</span>
                      <span className="text-xs text-ash">{q.type}</span>
                      <EnergyPips tag={q.energyTag} />
                    </button>
                  ),
                )}
              </div>
            </div>
          ))}
      </div>
      <button className="btn btn-ember sticky bottom-4 mt-6 w-full text-base" onClick={() => void finish()}>
        {picked.size ? `Begin with ${picked.size} quest${picked.size > 1 ? 's' : ''}` : 'Begin with a blank slate'}
      </button>
    </div>,
  ];

  return (
    <div className="relative z-10 mx-auto max-w-lg px-5 pb-10 pt-[calc(env(safe-area-inset-top)+2.5rem)]">
      <div className="mb-6 flex justify-center gap-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-1.5 w-8 rounded-full ${i <= step ? 'bg-ember' : 'bg-iron'}`} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          {pages[step]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
