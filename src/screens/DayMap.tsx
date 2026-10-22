import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef } from 'react';
import { db } from '../db/db';
import { dayBounds, dayMapEntries, nextScheduled, pathPosition } from '../game/dayMap';
import { formatClock, formatDuration, HOUR, startOfDay } from '../game/time';
import { useNow, useQuests, type Game } from '../state/data';
import { navigate } from '../state/router';
import { Icon } from '../ui/Icon';
import { ScreenTitle } from '../ui/kit';

const W = 340;
const PX_PER_HOUR = 70;

const roadX = (y: number) => W / 2 + Math.sin(y / 110) * W * 0.22;

export function DayMapScreen({ game }: { game: Game }) {
  const now = useNow(15_000);
  const quests = useQuests();
  const completions = useLiveQuery(() => db.completions.where('at').aboveOrEqual(startOfDay(now)).toArray(), [startOfDay(now)]);
  const hereRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const t = setTimeout(() => hereRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 200);
    return () => clearTimeout(t);
  }, [quests === undefined]);

  if (!quests || !completions) return null;
  const bounds = dayBounds(now, game.settings.dayStart, game.settings.dayEnd);
  const hours = (bounds.end - bounds.start) / HOUR;
  const H = Math.round(hours * PX_PER_HOUR) + 80;
  const yOf = (ts: number) => 40 + pathPosition(ts, bounds) * (H - 80);
  const entries = dayMapEntries(quests, completions, now);
  const next = nextScheduled(entries, now);
  const nowY = yOf(now);

  let d = `M ${roadX(0)} 0`;
  for (let y = 8; y <= H; y += 8) d += ` L ${roadX(y).toFixed(1)} ${y}`;
  const hourMarks: number[] = [];
  for (let t = Math.ceil(bounds.start / HOUR) * HOUR; t <= bounds.end; t += HOUR) hourMarks.push(t);

  return (
    <div>
      <ScreenTitle sub="Today, from first light to the last ember.">The Day Map</ScreenTitle>
      <div className="frame-iron sticky top-[4.5rem] z-20 flex items-center gap-3 p-3">
        <Icon name="hourglass" className="text-ember" />
        <div className="flex-1">
          {next ? (
            <>
              <div className="font-display text-lg font-bold text-bone">
                {game.regionById.get(next.regionId)?.name.replace(/^The /, '') ?? 'Quest'} quest in {formatDuration(next.at - now)}
              </div>
              <div className="text-sm text-ash">
                {next.title} · {formatClock(next.at)}
              </div>
            </>
          ) : (
            <div className="text-bone">Nothing else scheduled today. The road is yours.</div>
          )}
        </div>
      </div>

      <div className="relative mt-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }}>
          <defs>
            <linearGradient id="road" x1="0" x2="1">
              <stop offset="0" stopColor="#2b2420" />
              <stop offset=".5" stopColor="#4a3b30" />
              <stop offset="1" stopColor="#2b2420" />
            </linearGradient>
            <linearGradient id="pastShade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0c0908" stopOpacity=".7" />
              <stop offset="1" stopColor="#0c0908" stopOpacity=".35" />
            </linearGradient>
          </defs>
          {hourMarks.map((t) => (
            <g key={t}>
              <line x1="0" x2={W} y1={yOf(t)} y2={yOf(t)} stroke="#1f1a17" strokeDasharray="2 6" />
              <text x="4" y={yOf(t) - 4} fill="#8a817a" fontSize="12" fontFamily="var(--font-display)">
                {formatClock(t)}
              </text>
            </g>
          ))}
          <path d={d} stroke="#120d0b" strokeWidth="30" fill="none" strokeLinecap="round" />
          <path d={d} stroke="url(#road)" strokeWidth="24" fill="none" strokeLinecap="round" />
          <path d={d} stroke="#6b5646" strokeWidth="1.5" strokeDasharray="6 10" fill="none" />
          {/* past is dimmed */}
          <rect x="0" y="0" width={W} height={Math.max(0, nowY)} fill="url(#pastShade)" />

          {entries.map((e) => {
            const y = yOf(e.at);
            const x = roadX(y);
            const region = game.regionById.get(e.regionId);
            const left = x > W / 2;
            return (
              <g key={e.key} onClick={() => e.questId && navigate(`/quest/${quests.find((q) => q.id === e.questId)?.parentId ?? e.questId}`)} className="cursor-pointer">
                <g transform={`translate(${x} ${y})`}>
                  {/* brazier */}
                  <path d="M-11 -2 h22 l-4 10 h-14 z" fill="#3b3532" stroke="#120a06" strokeWidth="2" />
                  <path d="M-3 8 v8 M3 8 v8 M-7 16 h14" stroke="#3b3532" strokeWidth="2.5" />
                  {e.done ? (
                    <>
                      <circle r="18" cy="-10" fill="rgb(var(--glow) / .25)" />
                      <path d="M0 -22 C 5 -14 9 -11 9 -6 A 9 9 0 0 1 -9 -6 C -9 -10 -5 -13 -3 -16 C -2 -12 0 -11 1 -10 C 0 -14 0 -18 0 -22 Z" fill="var(--accent)" style={{ filter: 'drop-shadow(0 0 6px var(--accent))' }} />
                    </>
                  ) : (
                    <circle r="4" cy="-4" fill={e.past ? '#4a4440' : (region?.colour ?? '#8a817a')} />
                  )}
                </g>
                <text
                  x={left ? x - 26 : x + 26}
                  y={y + 2}
                  textAnchor={left ? 'end' : 'start'}
                  fill={e.done ? 'var(--accent-bright)' : e.past ? '#8a817a' : '#e9dcc4'}
                  fontSize="14"
                  fontFamily="var(--font-body)"
                >
                  {e.title.length > 22 ? e.title.slice(0, 21) + '…' : e.title}
                </text>
                <text x={left ? x - 26 : x + 26} y={y + 16} textAnchor={left ? 'end' : 'start'} fill="#8a817a" fontSize="11">
                  {formatClock(e.at)}
                  {e.done ? ' · lit' : ''}
                </text>
              </g>
            );
          })}

          {/* you are here */}
          <g ref={hereRef} transform={`translate(${roadX(nowY)} ${nowY})`}>
            <circle r="22" fill="rgb(var(--glow) / .25)" className="flicker" />
            <circle r="9" fill="#fff2c8" stroke="var(--accent-deep)" strokeWidth="3" />
            <text x="16" y="-12" fill="var(--accent-bright)" fontSize="12" fontFamily="var(--font-display)">
              you · {formatClock(now)}
            </text>
          </g>
        </svg>
      </div>
      <p className="mt-3 text-center text-sm text-ash">Give a quest a time in its editor to place it on the road. Change day start/end in Settings.</p>
    </div>
  );
}
