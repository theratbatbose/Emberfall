import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../db/db';
import { daysActiveThisMonth, dailyAverages, hourlyAverages, peakWindow } from '../game/chronicle';
import { dayBounds } from '../game/dayMap';
import { energyLabel } from '../game/energy';
import { DAY, formatClock, startOfDay } from '../game/time';
import type { Game } from '../state/data';
import { Icon } from '../ui/Icon';
import { Panel, ScreenTitle, SectionTitle, Segmented } from '../ui/kit';

const AXIS = { stroke: '#4a4440', tick: { fill: '#a89a88', fontSize: 11 }, tickLine: false };
const tooltipStyle = {
  contentStyle: { background: '#15110f', border: '1px solid #3a3431', borderRadius: 8, color: '#e9dcc4', fontFamily: 'var(--font-body)' },
  labelStyle: { color: '#a89a88' },
  cursor: { stroke: '#8a817a', strokeWidth: 1 },
};

function Stat({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="frame-iron flex flex-col items-center p-3 text-center">
      <Icon name={icon} size={18} className="text-ember" />
      <div className="font-display text-2xl font-bold text-bone">{value}</div>
      <div className="text-xs uppercase tracking-wider text-ash">{label}</div>
    </div>
  );
}

export function ChronicleScreen({ game, now }: { game: Game; now: number }) {
  const [range, setRange] = useState<'7' | '30'>('7');
  const since = startOfDay(now) - 30 * DAY;
  const logs = useLiveQuery(() => db.energyLogs.where('at').aboveOrEqual(since).toArray(), [since]);
  const completions = useLiveQuery(() => db.completions.where('at').aboveOrEqual(since).toArray(), [since]);
  const monthCompletions = useLiveQuery(() => db.completions.where('at').aboveOrEqual(new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime()).toArray(), [now]);
  if (!logs || !completions || !monthCompletions) return null;

  const today0 = startOfDay(now);
  const todayLogs = logs.filter((l) => l.at >= today0).sort((a, b) => a.at - b.at);
  const todayDone = completions.filter((c) => c.at >= today0);
  const questsToday = todayDone.filter((c) => c.kind === 'quest');
  const xpToday = todayDone.reduce((s, c) => s + c.xp, 0);
  const lootToday = todayDone.filter((c) => c.itemId).length;
  const cleansedToday = new Set(todayDone.filter((c) => c.cleansed).map((c) => c.regionId));
  const focusToday = Math.round(todayDone.filter((c) => c.kind === 'run' || c.kind === 'start').reduce((s, c) => s + (c.minutes ?? 0), 0));
  const bounds = dayBounds(now, game.settings.dayStart, game.settings.dayEnd);
  const lo = Math.min(bounds.start, todayLogs[0]?.at ?? bounds.start, todayDone[0]?.at ?? bounds.start);
  const hi = Math.max(bounds.end, now);

  const energyData = todayLogs.map((l) => ({ t: l.at, energy: l.value }));
  const markerData = questsToday.map((c) => ({ t: c.at, y: 0.6, title: c.title }));

  const days = Number(range);
  const daily = dailyAverages(logs, now, days).map((d) => ({ day: d.day.slice(5), avg: d.avg === null ? null : Math.round(d.avg * 10) / 10 }));
  const hourly = hourlyAverages(logs, now, days)
    .map((v, h) => ({ h, label: `${h}:00`, avg: v === null ? 0 : Math.round(v * 10) / 10 }))
    .filter((d) => d.h >= 5);
  const peak = peakWindow(logs, now, days);
  const active = daysActiveThisMonth(monthCompletions, logs, now);

  return (
    <div>
      <ScreenTitle sub="How your fire burned.">The Ember Chronicle</ScreenTitle>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Quests lit" value={questsToday.length} icon="flame" />
        <Stat label="XP today" value={xpToday} icon="star" />
        <Stat label="Loot found" value={lootToday} icon="treasure" />
        <Stat label="Focus min" value={focusToday} icon="torch" />
        <Stat label="Cleansed" value={cleansedToday.size} icon="sparkle" />
        <Stat label="Days active this month" value={active} icon="sun" />
      </div>
      {cleansedToday.size > 0 && (
        <p className="mt-2 text-sm text-[#c9b8f0]">
          Cleansed today: {[...cleansedToday].map((id) => game.regionById.get(id)?.name ?? id).join(', ')}
        </p>
      )}

      <SectionTitle>Today’s fire</SectionTitle>
      <Panel className="px-1 pb-1 pt-3">
        {energyData.length || markerData.length ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#221c19" vertical={false} />
                <XAxis dataKey="t" type="number" domain={[lo, hi]} tickFormatter={(t: number) => formatClock(t)} {...AXIS} />
                <YAxis domain={[0, 10]} ticks={[1, 4, 7, 10]} {...AXIS} />
                <Tooltip
                  {...tooltipStyle}
                  labelFormatter={(t) => formatClock(Number(t))}
                  formatter={(v) => [`${v} · ${energyLabel(Number(v))}`, 'Energy']}
                />
                <Line data={energyData} dataKey="energy" type="monotone" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4, fill: 'var(--accent)', stroke: '#15110f', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                <Scatter data={markerData} dataKey="y" fill="var(--accent-bright)" shape="diamond" tooltipType="none" isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="p-3 italic text-ash">No energy logged yet today. Kindle the fire in the morning and after big quests to see your day take shape.</p>
        )}
        <p className="px-3 pb-2 text-xs text-ash">Line: your energy check-ins. ◆ along the bottom: quests you lit.</p>
      </Panel>

      {questsToday.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {questsToday.map((c) => (
            <li key={c.id} className="flex justify-between gap-2">
              <span className="truncate">
                <span className="text-ash">{formatClock(c.at)}</span> {c.title}
              </span>
              <span className="shrink-0 text-ember">+{c.xp}</span>
            </li>
          ))}
        </ul>
      )}

      <SectionTitle right={<div className="w-40"><Segmented value={range} onChange={setRange} options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }]} /></div>}>Trends</SectionTitle>
      <Panel>
        <p className="text-bone">{peak ? <>You’re usually brightest <span className="font-display text-ember-bright">{peak.label}</span>.</> : 'A few more check-ins and the Chronicle will show when you burn brightest.'}</p>
      </Panel>
      <Panel className="mt-2 px-1 pb-1 pt-3">
        <div className="px-3 text-xs uppercase tracking-wider text-ash">Daily average energy</div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={daily} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="#221c19" vertical={false} />
              <XAxis dataKey="day" {...AXIS} interval={days > 7 ? 6 : 0} />
              <YAxis domain={[0, 10]} ticks={[1, 4, 7, 10]} {...AXIS} />
              <Tooltip {...tooltipStyle} formatter={(v) => [v === null ? '—' : `${v} · ${energyLabel(Number(v))}`, 'Avg energy']} />
              <Line dataKey="avg" type="monotone" stroke="var(--accent)" strokeWidth={2} connectNulls dot={{ r: 3, fill: 'var(--accent)' }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel className="mt-2 px-1 pb-1 pt-3">
        <div className="px-3 text-xs uppercase tracking-wider text-ash">Energy by hour of day</div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourly} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="#221c19" vertical={false} />
              <XAxis dataKey="label" {...AXIS} interval={2} />
              <YAxis domain={[0, 10]} ticks={[1, 4, 7, 10]} {...AXIS} />
              <Tooltip {...tooltipStyle} cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} formatter={(v) => [Number(v) ? `${v} · ${energyLabel(Number(v))}` : 'no data', 'Avg energy']} />
              <Bar dataKey="avg" fill="var(--accent)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
