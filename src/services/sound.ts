// All sounds are synthesised live with the Web Audio API — no audio files, nothing copied.
import type { Rarity } from '../db/types';

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function ac(): AudioContext | null {
  if (!enabled || typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, opts: { type?: OscillatorType; gain?: number; slideTo?: number } = {}) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.15, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(start: number, dur: number, gain = 0.12, lowpass = 1200) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + start;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lowpass;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

export const sfx = {
  tap() {
    tone(520, 0, 0.05, { type: 'triangle', gain: 0.05 });
  },
  complete() {
    noise(0, 0.25, 0.1, 2500);
    tone(392, 0.02, 0.18, { type: 'triangle', gain: 0.12 });
    tone(587, 0.1, 0.25, { type: 'triangle', gain: 0.12 });
    tone(784, 0.18, 0.35, { type: 'sine', gain: 0.1 });
  },
  coin() {
    tone(1318, 0, 0.08, { type: 'square', gain: 0.04 });
    tone(1760, 0.07, 0.18, { type: 'square', gain: 0.04 });
  },
  chestShake() {
    noise(0, 0.12, 0.15, 400);
    tone(90, 0, 0.15, { type: 'sawtooth', gain: 0.06, slideTo: 60 });
  },
  loot(rarity: Rarity) {
    noise(0, 0.4, 0.12, 900);
    const base = { worn: 330, enchanted: 440, rare: 523, relic: 392 }[rarity];
    const notes = rarity === 'relic' ? [1, 1.25, 1.5, 2, 2.5] : rarity === 'rare' ? [1, 1.26, 1.5, 2] : rarity === 'enchanted' ? [1, 1.5, 2] : [1, 1.5];
    notes.forEach((m, i) => tone(base * m, 0.15 + i * 0.09, 0.6, { type: i % 2 ? 'sine' : 'triangle', gain: 0.1 }));
    if (rarity === 'relic') tone(65, 0.1, 1.4, { type: 'sawtooth', gain: 0.08, slideTo: 55 });
  },
  levelUp() {
    [262, 330, 392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.5, { type: 'triangle', gain: 0.1 }));
    noise(0.4, 0.6, 0.06, 3000);
  },
  cleanse() {
    tone(220, 0, 0.6, { type: 'sine', gain: 0.1, slideTo: 660 });
    tone(330, 0.1, 0.6, { type: 'sine', gain: 0.08, slideTo: 990 });
  },
  torchOut() {
    noise(0, 0.6, 0.14, 700);
    tone(196, 0.1, 0.8, { type: 'triangle', gain: 0.1 });
    tone(294, 0.3, 0.8, { type: 'triangle', gain: 0.08 });
  },
};
