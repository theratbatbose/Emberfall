import { useEffect, useState } from 'react';
import { db, setMeta } from '../db/db';
import { exportSave, importSave, saveFileName } from '../db/backup';
import type { Settings } from '../db/types';
import { pickTextFile, saveTextFile } from '../services/files';
import { notifications } from '../services/notifications';
import { useMeta, type Game } from '../state/data';
import { useUi } from '../state/ui';
import { Icon } from '../ui/Icon';
import { Panel, ScreenTitle, SectionTitle, Segmented, Sheet, Toggle } from '../ui/kit';

export const APK_URL = 'https://github.com/theratbatbose/Emberfall/releases/latest';

export async function exportBackup() {
  const save = await exportSave();
  await saveTextFile(saveFileName(), JSON.stringify(save, null, 1));
  await setMeta('lastBackupAt', Date.now());
  useUi.getState().toast({ text: 'Save sealed. Keep that file somewhere safe (Drive, email to yourself…).', tone: 'ember', ms: 6000 });
}

const THEME_NAMES: Record<string, string> = { ember: 'Ember', rime: 'Rimeglass', moss: 'Mossgrave', gilt: 'Gilded Ash' };

function Reminders({ game }: { game: Game }) {
  const svc = notifications();
  const [perm, setPerm] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [exact, setExact] = useState(true);
  useEffect(() => {
    void svc.permission().then(setPerm);
    void svc.exactAllowed().then(setExact);
  }, [svc]);
  const s = game.settings;
  const update = (patch: Partial<Settings>) => void db.settings.update('settings', patch);
  const nudge = (k: keyof Settings['nudges'], v: Partial<Settings['nudges']['morning']>) => update({ nudges: { ...s.nudges, [k]: { ...s.nudges[k], ...v } } });

  return (
    <Panel className="space-y-2">
      {svc.kind === 'web' ? (
        <div className="rounded-md border border-[#3a3431] bg-[#0e0b0a] p-3 text-sm">
          <p className="text-bone">
            You’re using the web version. Phones only let web apps remind you <b>while Emberfall is open or recently used</b>.
          </p>
          <p className="mt-1 text-ash">For reminders that fire even when the app is closed, install the Android app (same game, your save moves over with Export/Import).</p>
          <a className="btn btn-iron mt-2 w-full" href={APK_URL} target="_blank" rel="noreferrer">
            <Icon name="download" size={18} /> Get the Android app
          </a>
        </div>
      ) : (
        <p className="text-sm text-ash">Android app: reminders fire even when Emberfall is closed.</p>
      )}
      {perm !== 'granted' ? (
        <button className="btn btn-ember w-full" onClick={async () => setPerm((await svc.requestPermission()) ? 'granted' : 'denied')}>
          <Icon name="bell" size={18} /> Allow reminders
        </button>
      ) : (
        <p className="text-sm text-ember">Reminders allowed ✓</p>
      )}
      {perm === 'denied' && <p className="text-sm text-ash">Notifications are blocked. Turn them on in your phone’s settings for Emberfall.</p>}
      {svc.kind === 'native' && !exact && (
        <button className="btn btn-iron w-full" onClick={() => void svc.openExactSettings().then(() => svc.exactAllowed().then(setExact))}>
          Allow on-time alarms (Android 12+)
        </button>
      )}
      {(['morning', 'midday', 'evening'] as const).map((k) => (
        <div key={k} className="flex items-center gap-3">
          <div className="flex-1">
            <Toggle label={{ morning: 'Morning ritual nudge', midday: 'Midday check', evening: 'Evening wrap-up' }[k]} on={s.nudges[k].on} onChange={(on) => nudge(k, { on })} />
          </div>
          <input type="time" className="field w-28" value={s.nudges[k].time} onChange={(e) => nudge(k, { time: e.target.value })} aria-label={`${k} nudge time`} />
        </div>
      ))}
      <Toggle label="New quests: remind 10 min before by default" on={s.preAlertDefault} onChange={(v) => update({ preAlertDefault: v })} />
    </Panel>
  );
}

export function SettingsScreen({ game }: { game: Game }) {
  const s = game.settings;
  const toast = useUi((st) => st.toast);
  const lastBackupAt = useMeta('lastBackupAt');
  const [pendingImport, setPendingImport] = useState<unknown>(null);
  const update = (patch: Partial<Settings>) => void db.settings.update('settings', patch);

  const startImport = async () => {
    const text = await pickTextFile();
    if (!text) return;
    try {
      setPendingImport(JSON.parse(text));
    } catch {
      toast({ text: 'That file couldn’t be read as a save.', tone: 'plain' });
    }
  };
  const confirmImport = async () => {
    try {
      await importSave(pendingImport);
      toast({ text: 'Save restored. Welcome back, Ashbearer.', tone: 'ember' });
    } catch (e) {
      toast({ text: (e as Error).message, tone: 'plain', ms: 7000 });
    }
    setPendingImport(null);
  };

  return (
    <div>
      <ScreenTitle>Settings</ScreenTitle>

      <SectionTitle>Your Ashbearer</SectionTitle>
      <Panel>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input id="name" className="field" defaultValue={game.character.name} onBlur={(e) => e.target.value.trim() && void db.character.update('me', { name: e.target.value.trim() })} />
      </Panel>

      <SectionTitle>Save & backup</SectionTitle>
      <Panel className="space-y-2">
        <p className="text-sm text-ash">
          Your save lives only on this device. Clearing browser data or uninstalling erases it — keep a backup.
          {lastBackupAt ? ` Last backup: ${new Date(lastBackupAt).toLocaleDateString()}.` : ' No backup yet.'}
        </p>
        <button className="btn btn-ember w-full" onClick={() => void exportBackup()}>
          <Icon name="download" size={18} /> Export save
        </button>
        <button className="btn btn-iron w-full" onClick={() => void startImport()}>
          <Icon name="upload" size={18} /> Import save
        </button>
      </Panel>

      <SectionTitle>Reminders</SectionTitle>
      <Reminders game={game} />

      <SectionTitle>The Blight & the day</SectionTitle>
      <Panel className="space-y-3">
        <div>
          <label className="label" htmlFor="blight">
            Quiet days before the Blight: {s.blightDays}
          </label>
          <input id="blight" type="range" min={1} max={10} value={s.blightDays} onChange={(e) => update({ blightDays: Number(e.target.value) })} className="ember-range" />
          {game.bonuses.blightGraceDays > 0 && <p className="text-xs text-ash">+{game.bonuses.blightGraceDays} from gear and passives.</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ds">
              Day starts
            </label>
            <input id="ds" type="time" className="field" value={s.dayStart} onChange={(e) => update({ dayStart: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="de">
              Day ends
            </label>
            <input id="de" type="time" className="field" value={s.dayEnd} onChange={(e) => update({ dayEnd: e.target.value })} />
          </div>
        </div>
      </Panel>

      <SectionTitle>Feel</SectionTitle>
      <Panel className="space-y-2">
        <Toggle label="Sound" on={s.sound} onChange={(v) => update({ sound: v })} />
        <Toggle label="Vibration" on={s.haptics} onChange={(v) => update({ haptics: v })} />
        <Toggle label="Ask my energy after every Dungeon Run" on={s.askEnergyAfterRun} onChange={(v) => update({ askEnergyAfterRun: v })} />
        <div>
          <span className="label">Motion</span>
          <Segmented
            value={s.motion}
            onChange={(v) => update({ motion: v })}
            options={[
              { value: 'system', label: 'Phone' },
              { value: 'reduced', label: 'Calm' },
              { value: 'full', label: 'Full' },
            ]}
          />
          <p className="mt-1 text-xs text-ash">“Phone” follows your phone’s reduce-motion setting. “Calm” turns off particles and shakes.</p>
        </div>
        {game.bonuses.themes.length > 1 && (
          <div>
            <span className="label">Theme</span>
            <div className="flex flex-wrap gap-2">
              {game.bonuses.themes.map((t) => (
                <button key={t} className={`btn ${s.theme === t ? 'btn-ember' : 'btn-iron'}`} onClick={() => update({ theme: t })}>
                  {THEME_NAMES[t] ?? t}
                </button>
              ))}
            </div>
          </div>
        )}
      </Panel>

      <SectionTitle>Credits</SectionTitle>
      <Panel className="space-y-2 text-sm text-ash">
        <p>Emberfall — a personal life game. All names, items, lore, icons and art are original.</p>
        <p>Icons: hand-drawn original SVGs. Sounds: synthesised live in your browser.</p>
        <p>Fonts: Cinzel by Natanael Gama and EB Garamond by Georg Duffner &amp; Octavio Pardo, both under the SIL Open Font License 1.1.</p>
        <p>Built with React, Vite, Tailwind CSS, Motion, Zustand, Dexie, Recharts and Capacitor (MIT / Apache-2.0 licences).</p>
      </Panel>

      <Sheet open={pendingImport !== null} onClose={() => setPendingImport(null)} title="Replace your save?">
        <p className="text-bone">Importing replaces everything on this device with the file’s contents. Export first if you want to keep what’s here.</p>
        <div className="mt-4 flex gap-2">
          <button className="btn btn-ember flex-1" onClick={() => void confirmImport()}>
            Replace
          </button>
          <button className="btn btn-ghost flex-1" onClick={() => setPendingImport(null)}>
            Cancel
          </button>
        </div>
      </Sheet>
    </div>
  );
}
