import type { Character, EnergyTag, QuestType, Region, Settings } from './types';
import { UNSORTED_REGION_ID } from './types';

export function defaultRegions(now: number): Region[] {
  const base = { lastActivityAt: now, blightStage: 0, xp: 0, builtin: true };
  return [
    { id: 'bloodwell', name: 'The Bloodwell', attribute: 'vitality', colour: '#c0392b', icon: 'drop', order: 0, ...base },
    { id: 'forge', name: 'The Forge', attribute: 'might', colour: '#e67e22', icon: 'anvil', order: 1, ...base },
    { id: 'hearth', name: 'The Hearth', attribute: 'fortitude', colour: '#d4a24c', icon: 'hearth', order: 2, ...base },
    { id: 'archive', name: 'The Archive', attribute: 'intellect', colour: '#5d8aa8', icon: 'book', order: 3, ...base },
    { id: 'lanterns', name: 'The Lanterns', attribute: 'spirit', colour: '#b48ee0', icon: 'lantern', order: 4, ...base },
    { id: UNSORTED_REGION_ID, name: 'Unsorted', attribute: null, colour: '#8a817a', icon: 'scroll', order: 99, ...base },
  ];
}

export function defaultSettings(): Settings {
  return {
    id: 'settings',
    blightDays: 3,
    sound: true,
    motion: 'system',
    haptics: true,
    askEnergyAfterRun: false,
    preAlertDefault: true,
    nudges: {
      morning: { on: true, time: '08:30' },
      midday: { on: true, time: '13:00' },
      evening: { on: true, time: '21:00' },
    },
    dayStart: '07:00',
    dayEnd: '23:00',
    theme: 'ember',
    onboarded: false,
  };
}

export function defaultCharacter(now: number): Character {
  return {
    id: 'me',
    name: 'Ashbearer',
    xp: 0,
    gold: 0,
    attributeXp: { vitality: 0, might: 0, fortitude: 0, intellect: 0, spirit: 0 },
    allocatedNodes: [],
    equipped: {},
    createdAt: now,
  };
}

export interface StarterQuest {
  title: string;
  regionId: string;
  type: QuestType;
  energyTag: EnergyTag;
  estMinutes: number;
  timeOfDay?: string;
}

/** Optional starter quests offered during onboarding. Nothing is added unless picked. */
export const STARTER_QUESTS: StarterQuest[] = [
  { title: 'Take meds', regionId: 'bloodwell', type: 'daily', energyTag: 'low', estMinutes: 1, timeOfDay: '09:00' },
  { title: 'Drink a glass of water', regionId: 'bloodwell', type: 'habit', energyTag: 'low', estMinutes: 1 },
  { title: 'Short walk outside', regionId: 'bloodwell', type: 'daily', energyTag: 'med', estMinutes: 15 },
  { title: 'Workout', regionId: 'bloodwell', type: 'quest', energyTag: 'high', estMinutes: 30 },
  { title: 'In bed by midnight', regionId: 'bloodwell', type: 'daily', energyTag: 'low', estMinutes: 5, timeOfDay: '23:30' },
  { title: 'Deep-work block', regionId: 'forge', type: 'habit', energyTag: 'high', estMinutes: 45 },
  { title: 'Reply to one email', regionId: 'forge', type: 'habit', energyTag: 'low', estMinutes: 5 },
  { title: 'Plan tomorrow’s top task', regionId: 'forge', type: 'daily', energyTag: 'low', estMinutes: 5 },
  { title: 'Dishes', regionId: 'hearth', type: 'daily', energyTag: 'low', estMinutes: 10 },
  { title: 'One load of laundry', regionId: 'hearth', type: 'habit', energyTag: 'med', estMinutes: 15 },
  { title: 'Pay a bill', regionId: 'hearth', type: 'quest', energyTag: 'low', estMinutes: 5 },
  { title: '5-minute tidy', regionId: 'hearth', type: 'habit', energyTag: 'low', estMinutes: 5 },
  { title: 'Read 10 pages', regionId: 'archive', type: 'daily', energyTag: 'low', estMinutes: 15 },
  { title: 'One course lesson', regionId: 'archive', type: 'habit', energyTag: 'med', estMinutes: 25 },
  { title: 'Text a friend', regionId: 'lanterns', type: 'habit', energyTag: 'low', estMinutes: 2 },
  { title: 'Call family', regionId: 'lanterns', type: 'quest', energyTag: 'med', estMinutes: 20 },
];
