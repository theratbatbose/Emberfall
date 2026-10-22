import { useEffect, useRef, useState } from 'react';
import { addSubquest, createQuest, deleteQuest, moveSubquest, restoreQuests, updateQuest } from '../actions/quests';
import { db } from '../db/db';
import type { EnergyTag, Quest, QuestType } from '../db/types';
import { UNSORTED_REGION_ID } from '../db/types';
import { isMajor } from '../game/quests';
import { questXp } from '../game/xp';
import { useQuests, type Game } from '../state/data';
import { back, navigate } from '../state/router';
import { useUi } from '../state/ui';
import { Icon } from '../ui/Icon';
import { Panel, RegionGlyph, Segmented, Toggle } from '../ui/kit';
import { justStart, useComplete } from '../ui/QuestCard';

const MINUTE_PRESETS = [2, 5, 10, 15, 25, 45, 60, 90];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toLocalInput(ts?: number) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Form {
  title: string;
  regionId: string;
  type: QuestType;
  energyTag: EnergyTag;
  estMinutes: number;
  timeOfDay: string;
  dueAt: string;
  days: number[];
  remindAt: boolean;
  remindBefore: boolean;
  isMajor: boolean;
  notes: string;
}

function formFrom(q: Quest | undefined, preAlert: boolean): Form {
  return {
    title: q?.title ?? '',
    regionId: q?.regionId ?? UNSORTED_REGION_ID,
    type: q?.type ?? 'quest',
    energyTag: q?.energyTag ?? 'low',
    estMinutes: q?.estMinutes ?? 10,
    timeOfDay: q?.timeOfDay ?? '',
    dueAt: toLocalInput(q?.dueAt),
    days: q?.recurrence?.days ?? [],
    remindAt: q ? q.reminders.includes(0) : false,
    remindBefore: q ? q.reminders.includes(10) : preAlert,
    isMajor: q?.isMajor ?? false,
    notes: q?.notes ?? '',
  };
}

export function QuestEditor({ game, id }: { game: Game; id?: string; now: number }) {
  const quests = useQuests();
  const isNew = !id || id === 'new';
  const existing = isNew ? undefined : quests?.find((q) => q.id === id);
  const [form, setForm] = useState<Form | null>(isNew ? formFrom(undefined, game.settings.preAlertDefault) : null);
  const [draftSteps, setDraftSteps] = useState<string[]>([]);
  const [stepTitle, setStepTitle] = useState('');
  const [error, setError] = useState('');
  const toast = useUi((s) => s.toast);
  const complete = useComplete();
  const completeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!form && existing) setForm(formFrom(existing, game.settings.preAlertDefault));
  }, [existing, form, game.settings.preAlertDefault]);

  if (!quests) return null;
  if (!isNew && !existing) {
    return (
      <div className="pt-10 text-center">
        <p className="text-ash">This quest has been banished or finished.</p>
        <button className="btn btn-iron mt-4" onClick={() => navigate('/quests')}>
          Back to quests
        </button>
      </div>
    );
  }
  if (!form) return null;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...form, [k]: v });
  const steps = existing ? quests.filter((q) => q.parentId === existing.id).sort((a, b) => a.order - b.order) : [];
  const stepCount = existing ? steps.length : draftSteps.length;
  const xpPreview = questXp({ type: form.type, energyTag: form.energyTag, estMinutes: form.estMinutes, regionId: form.regionId }, game.bonuses, { blighted: false });

  const save = async () => {
    if (!form.title.trim()) return setError('Give it a name — even one word.');
    if (form.type === 'boss' && stepCount === 0) return setError('A Boss is beaten one step at a time. Add at least one step below.');
    const reminders = [...(form.remindAt ? [0] : []), ...(form.remindBefore ? [10] : [])];
    const due = form.dueAt ? new Date(form.dueAt).getTime() : undefined;
    const patch: Partial<Quest> = {
      title: form.title.trim(),
      regionId: form.regionId,
      type: form.type,
      energyTag: form.energyTag,
      estMinutes: Math.max(1, Math.min(600, Math.round(form.estMinutes || 1))),
      timeOfDay: form.timeOfDay || undefined,
      dueAt: form.type === 'quest' || form.type === 'boss' ? due : undefined,
      recurrence: form.type === 'daily' ? { days: form.days } : undefined,
      reminders: form.timeOfDay || due ? reminders : [],
      isMajor: form.isMajor,
      notes: form.notes.trim() || undefined,
    };
    if (existing) {
      await updateQuest(existing.id, patch);
      // Keep sub-quests in the same region as their parent.
      if (patch.regionId !== existing.regionId) {
        await db.quests.where('parentId').equals(existing.id).modify({ regionId: patch.regionId });
      }
      toast({ text: 'Quest updated.', tone: 'plain', ms: 1800 });
    } else {
      const q = await createQuest({ ...patch, title: patch.title! });
      for (const s of draftSteps) await addSubquest(q.id, s);
      toast({ text: 'A new quest is written.', tone: 'ember', ms: 2000 });
    }
    back('/quests');
  };

  const banish = async () => {
    if (!existing) return back('/quests');
    const deleted = await deleteQuest(existing.id);
    toast({
      text: `“${existing.title}” banished.`,
      tone: 'plain',
      ms: 6000,
      action: { label: 'Undo', run: () => void restoreQuests(deleted) },
    });
    back('/quests');
  };

  const addStep = async () => {
    const t = stepTitle.trim();
    if (!t) return;
    if (existing) await addSubquest(existing.id, t);
    else setDraftSteps([...draftSteps, t]);
    setStepTitle('');
  };

  const removeStep = async (sid: string) => {
    const deleted = await deleteQuest(sid);
    toast({ text: 'Step removed.', tone: 'plain', action: { label: 'Undo', run: () => void restoreQuests(deleted) } });
  };

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+0.5rem)]">
      <div className="flex items-center gap-2">
        <button className="tap flex h-12 w-12 items-center justify-center text-ash" onClick={() => back('/quests')} aria-label="Back">
          <Icon name="back" />
        </button>
        <h1 className="text-glow flex-1 text-xl font-bold">{isNew ? 'New quest' : 'Quest'}</h1>
        <button className="btn btn-ember" onClick={() => void save()}>
          Save
        </button>
      </div>

      {existing && existing.status === 'active' && steps.length === 0 && (
        <div className="mt-2 flex gap-2">
          <button ref={completeRef} className="btn btn-iron flex-1" onClick={() => void complete(existing, completeRef.current)}>
            <Icon name="check" size={18} /> Complete
          </button>
          <button className="btn btn-iron flex-1" onClick={() => void justStart(existing)}>
            <Icon name="torch" size={18} /> Just start
          </button>
        </div>
      )}

      <div className="mt-4 space-y-5">
        <div>
          <label className="label" htmlFor="title">
            Name
          </label>
          <input id="title" className="field" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Pay the electric bill" autoFocus={isNew} />
        </div>

        <div>
          <span className="label">Region</span>
          <div className="grid grid-cols-2 gap-2">
            {game.regions.map((r) => (
              <button key={r.id} type="button" className={`tap flex min-h-12 items-center gap-2 rounded-lg border px-2 text-left text-sm ${form.regionId === r.id ? 'border-ember bg-[#24150d]' : 'border-[#3a3431] bg-[#0e0b0a]'}`} onClick={() => set('regionId', r.id)}>
                <RegionGlyph region={r} size={14} />
                <span className="truncate">{r.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Kind</span>
          <Segmented
            value={form.type}
            onChange={(v) => set('type', v)}
            options={[
              { value: 'quest', label: 'Quest' },
              { value: 'daily', label: 'Daily' },
              { value: 'habit', label: 'Habit' },
              { value: 'boss', label: 'Boss' },
            ]}
          />
          <p className="mt-1 text-sm text-ash">
            {
              {
                quest: 'Once. Optional due date.',
                daily: 'Repeats on chosen days.',
                habit: 'Repeat whenever you like, no schedule.',
                boss: 'A big one, beaten in steps. You only ever see the next step.',
              }[form.type]
            }
          </p>
        </div>

        <div>
          <span className="label">Energy it needs</span>
          <Segmented
            value={form.energyTag}
            onChange={(v) => set('energyTag', v)}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'med', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
          />
        </div>

        <div>
          <span className="label">Rough minutes · ≈ {xpPreview} XP</span>
          <div className="flex flex-wrap gap-2">
            {MINUTE_PRESETS.map((m) => (
              <button key={m} type="button" className={`btn min-h-11 px-3 ${form.estMinutes === m ? 'btn-ember' : 'btn-ghost'}`} onClick={() => set('estMinutes', m)}>
                {m}
              </button>
            ))}
            <input type="number" inputMode="numeric" min={1} max={600} className="field w-24" value={form.estMinutes} onChange={(e) => set('estMinutes', Number(e.target.value))} aria-label="Custom minutes" />
          </div>
        </div>

        {form.type === 'daily' && (
          <div>
            <span className="label">Days (none = every day)</span>
            <div className="flex gap-1.5">
              {WEEKDAYS.map((d, i) => {
                const on = form.days.includes(i);
                return (
                  <button key={i} type="button" className={`tap h-11 flex-1 rounded-md border font-display ${on ? 'btn-ember' : 'border-[#3a3431] text-ash'}`} onClick={() => set('days', on ? form.days.filter((x) => x !== i) : [...form.days, i].sort())}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="time">
              Time on the Day Map
            </label>
            <div className="flex gap-2">
              <input id="time" type="time" className="field" value={form.timeOfDay} onChange={(e) => set('timeOfDay', e.target.value)} />
              {form.timeOfDay && (
                <button className="btn btn-ghost px-3" onClick={() => set('timeOfDay', '')} aria-label="Clear time">
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>
          </div>
          {(form.type === 'quest' || form.type === 'boss') && (
            <div>
              <label className="label" htmlFor="due">
                Due (optional)
              </label>
              <div className="flex gap-2">
                <input id="due" type="datetime-local" className="field" value={form.dueAt} onChange={(e) => set('dueAt', e.target.value)} />
                {form.dueAt && (
                  <button className="btn btn-ghost px-3" onClick={() => set('dueAt', '')} aria-label="Clear due date">
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {(form.timeOfDay || form.dueAt) && (
          <Panel className="py-1">
            <Toggle label="Remind me at the time" on={form.remindAt} onChange={(v) => set('remindAt', v)} />
            <Toggle label="Also 10 minutes before" on={form.remindBefore} onChange={(v) => set('remindBefore', v)} />
          </Panel>
        )}

        <Panel className="py-1">
          <Toggle label="Major quest (ask my energy afterwards)" on={form.isMajor || isMajor({ ...form, isMajor: false })} onChange={(v) => set('isMajor', v)} />
          {isMajor({ ...form, isMajor: false }) && <p className="pb-2 text-xs text-ash">Bosses and quests over 30 minutes always count as major.</p>}
        </Panel>

        {(form.type === 'boss' || form.type === 'quest') && (
          <div>
            <span className="label">Steps {form.type === 'boss' ? '(a Boss needs at least one)' : '(optional)'}</span>
            <div className="space-y-2">
              {existing
                ? steps.map((s, i) => (
                    <div key={s.id} className={`frame-iron flex items-center gap-2 px-3 py-1 ${s.status === 'done' ? 'opacity-50' : ''}`}>
                      <span className="w-5 text-center font-display text-ash">{s.status === 'done' ? '✓' : i + 1}</span>
                      <input className="min-h-11 flex-1 bg-transparent outline-none" defaultValue={s.title} onBlur={(e) => e.target.value.trim() && e.target.value !== s.title && void updateQuest(s.id, { title: e.target.value.trim() })} aria-label={`Step ${i + 1}`} />
                      <button className="tap h-11 w-9 text-ash" onClick={() => void moveSubquest(s.id, -1)} aria-label="Move up">
                        <Icon name="up" size={16} />
                      </button>
                      <button className="tap h-11 w-9 text-ash" onClick={() => void moveSubquest(s.id, 1)} aria-label="Move down">
                        <Icon name="down" size={16} />
                      </button>
                      <button className="tap h-11 w-9 text-ash" onClick={() => void removeStep(s.id)} aria-label="Remove step">
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  ))
                : draftSteps.map((s, i) => (
                    <div key={i} className="frame-iron flex items-center gap-2 px-3 py-2">
                      <span className="w-5 text-center font-display text-ash">{i + 1}</span>
                      <span className="flex-1">{s}</span>
                      <button className="tap h-11 w-9 text-ash" onClick={() => setDraftSteps(draftSteps.filter((_, j) => j !== i))} aria-label="Remove step">
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  ))}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void addStep();
                }}
              >
                <input className="field" placeholder="Next small step…" value={stepTitle} onChange={(e) => setStepTitle(e.target.value)} />
                <button className="btn btn-iron" type="submit" aria-label="Add step">
                  <Icon name="plus" size={18} />
                </button>
              </form>
              <button className="btn btn-ghost w-full opacity-60" disabled title="Coming in Phase 2">
                <Icon name="sparkle" size={16} /> Break this down · Phase 2: AI
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" className="field min-h-24" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>

        {error && <p className="rounded-md border border-[#5a524d] bg-[#1a1412] p-3 text-bone">{error}</p>}

        <button className="btn btn-ember w-full" onClick={() => void save()}>
          Save quest
        </button>
        {existing && (
          <button className="btn btn-ghost w-full" onClick={() => void banish()}>
            <Icon name="trash" size={18} /> Banish this quest
          </button>
        )}
        {existing && <p className="text-center text-xs text-ash">Not for you? Banish it — nothing is lost, and you can undo.</p>}
      </div>
    </div>
  );
}
