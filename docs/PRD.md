# PRD — "Emberfall" (working title): a dark-fantasy LifeRPG

**Owner:** you (sole user) · **Builder:** Claude Code · **Version:** 1.0 · **Date:** 22 Oct 2026

---

## 1. Problem

Off-the-shelf habit and task apps fail this user (adult, ADHD, gamer) in three predictable ways:

1. **Starting tasks.** Big tasks feel impossible to begin, so they never begin.
2. **Time blindness.** Time disappears, deadlines get missed, and the day has no shape.
3. **Guilt spirals.** A broken streak or a red "overdue" list makes the app feel like a punishment, and it gets abandoned.

## 2. Goal

Build a personal, phone-first life game with Diablo/Path-of-Exile-style loot and progression that makes starting easy, makes time visible, and **never punishes absence in a way that can't be undone in one small action.**

### Success metrics (personal, measured in-app)

| Metric | Target |
|---|---|
| Days opened, weeks 1–4 | ≥ 5 of 7 per week |
| Still opening it in week 6 | Yes. This is the real test; most gamified apps die at weeks 2–3 |
| Quests completed per active day | ≥ 3 |
| Return after a gap of 3 or more days | Comes back. The "return bonus" and the one-action cleanse are what make this possible |
| Energy check-ins per day | ≥ 2 (morning + at least one after a quest) |

### Non-goals (v1)

- Multiplayer, social features, or leaderboards
- AI features (Phase 2)
- Cloud sync and login (Phase 2)
- iOS support
- Copying any real game's art, names, items or lore. Everything must be original. Genre conventions such as rarity colour tiers are fine.

---

## 3. Platform & tech decisions

| Area | Decision | Why |
|---|---|---|
| App type | Phone-first **PWA** (installable on Android, also works on desktop browser) | User choice; Android has the best PWA support |
| Stack | React + TypeScript + Vite, `vite-plugin-pwa` (current major is 1.x), Tailwind, Framer Motion, Zustand, Dexie (IndexedDB), Recharts | Mainstream, well-documented stack that Claude Code handles reliably |
| Storage | **Local-first** in IndexedDB, with **Export / Import JSON backup** in Settings and a weekly in-app "back up your save" nudge | v1 has no backend. Clearing browser data wipes your save, so backups matter |
| Hosting | Free static host (Vercel, Netlify or Cloudflare Pages) | HTTPS is required for PWA install and notifications |
| Phase 2 | Supabase sync + login; Claude API quest breakdown | Agreed during the questionnaire |

### ⚠️ Open decision D1: reliable timed reminders (must resolve before Milestone 4)

You chose **Active** reminders (per-quest, at scheduled times). A plain PWA **cannot reliably fire a notification at a set time while the app is closed.** The browser API built for this (Notification Triggers) never shipped broadly. Reliable OS-level scheduling on Android comes from native wrappers such as Capacitor's Local Notifications plugin, which fire without the app running once scheduled.

| Option | How it works | Pros | Cons |
|---|---|---|---|
| **A. Capacitor Android wrapper** (recommended) | The same React code is packaged as an Android APK. Notifications are scheduled natively. | Reliable and works offline. No server. Same codebase. | You install an APK yourself (sideloading). The build needs Android Studio/JDK on your computer, and Claude Code will walk you through it. Android 12+ needs an exact-alarm permission for on-time delivery. |
| B. Web Push from a server | A server/cron job sends push messages at reminder times. | Stays a pure PWA. | Needs a backend from v1, which contradicts "sync in Phase 2". More setup for a non-coder. |
| C. In-app reminders only | Alerts fire only while the app is open, plus a daily push when you open the app. | Simplest. | Not truly "Active". Fails exactly when ADHD needs it, i.e. when the app is closed. |

**Recommendation:** build v1 as a PWA (Milestones 1–3), then add the Capacitor Android wrapper in Milestone 4. Keep all reminder logic behind a `NotificationService` interface so the platform can be swapped later.

### Phase 2 note on Supabase

Free-tier projects **auto-pause after about 1 week of inactivity**, and a project left paused long enough can be deleted. For an ADHD user who may drop off for a week, local-first storage is essential: the app must keep working with sync paused, and the JSON backup stays.

---

## 4. Core concept & theme

A gothic, ash-and-ember world where your life areas are **regions** under a creeping **Blight**. You are a wandering **Ashbearer**. Completing real tasks earns XP, gold and **loot drops** with Diablo-style rarity. Neglected regions become blighted, and **one small action cleanses them.**

**Visual direction:** dark fantasy ARPG. Near-black backgrounds, ember orange and blood red accents, parchment and iron UI frames, serif display fonts (e.g. Cinzel or IM Fell from Google Fonts), particle embers, a screen-shake/flash on loot drops, and rarity glow colours. Icons come from an openly licensed set such as game-icons.net (CC BY; credit required) or are original SVGs.

**Loot rarity tiers (original names, genre-standard colours):**
Worn (grey) → Enchanted (blue) → Rare (yellow) → Relic (orange, named, unique effect).

---

## 5. Life areas → regions → attributes

| Region (life area) | Attribute it raises | Example quests |
|---|---|---|
| The Bloodwell — Health | **Vitality** | Meds, water, walk, workout, sleep by 12 |
| The Forge — Work/career | **Might** | Deep-work block, reply to email, ship task |
| The Hearth — Home/admin | **Fortitude** | Dishes, laundry, pay bill, paperwork |
| The Archive — Learning | **Intellect** | Read 10 pages, course lesson |
| The Lanterns — Social | **Spirit** | Text a friend, call family |

All names are editable. You can add custom regions.

---

## 6. Features (v1)

### 6.1 Morning ritual: "Kindle the Fire" (≤ 60 seconds)

- **Energy slider (1–10)** with flavour labels (1 = "Embers", 10 = "Inferno"). Stored as an energy log entry.
- Based on energy, the app suggests **at most 3 quests** for today, filtered by quest energy tag (Low/Med/High) and urgency. This is the anti-overwhelm cap; the full list is one tap away.
- Shows today's **Day Map** (6.5) and any blighted regions.

### 6.2 Quests

- Types: **Daily** (recurring), **Habit** (repeatable, no schedule), **Quest** (one-off with optional due date), **Boss** (big task, must have sub-quests).
- Fields: title, region, energy tag, estimated minutes, due date/time, reminder time(s), recurrence, sub-quests, notes.
- **Quick capture:** one floating button, title only, saves straight to the "Unsorted" inbox. Capture must take under 3 seconds.
- **Next-step-only view:** for Bosses and Quests with sub-quests, show **only the next sub-quest**. Completing it reveals the next one.
- **"Just Start" button** on every quest: begins a 5-minute Dungeon Run (6.4). It gives full XP for starting, even if you stop after 5 minutes.
- Manual sub-quest editor in v1. A **"Break this down"** button is visible but disabled, labelled "Phase 2: AI".

### 6.3 Post-quest energy check-in (the loop)

- After completing any quest marked **Major** (Boss, Quest over 30 min, or manually flagged), show the energy slider again. One tap to log, one tap to skip.
- Optional: ask for energy after every Dungeon Run.

### 6.4 Dungeon Runs (focus timer)

- Pick a quest and a duration (5 / 15 / 25 / 45 / custom). A **torch burns down** visually.
- The timer must stay accurate when the screen is off or the app is backgrounded. Use timestamps, not interval counting.
- On finish: loot chest animation, XP, and a "Continue run?" option. Actual minutes are recorded against the quest.
- Pausing is allowed. Abandoning a run still awards partial XP; no penalty.

### 6.5 Day Map (time visibility)

- Today is drawn as a **path/road** from morning to night with time blocks. Scheduled quests sit on the path at their times, and a "you are here" marker moves with the real clock.
- Show **time remaining until the next scheduled quest** prominently, e.g. "Forge quest in 47 min".
- Past blocks appear dimmed and completed quests are shown as lit braziers.

### 6.6 Reminders (Active)

- Per-quest reminders at set times, plus optional "10 min before" pre-alerts.
- Dungeon Run end alert.
- Daily fixed nudges: morning ritual, midday check, evening wrap-up. Each one can be turned off.
- Reminder copy is in-world and never shaming ("The Hearth grows cold — 2 min to cleanse?").
- Implementation per D1.

### 6.7 Recoverable Blight (failure model)

- Each region tracks its last activity. With no completed quest in a region for N days (default 3, configurable), the region becomes **Blighted** (stage 1 → 3 over time). It is shown visually as dark veins/fog on the region tile and a gloomier region screen.
- **Cleanse = complete any one quest in that region, even the smallest.** The region returns fully to normal. No permanent loss: no XP loss, no item loss, no level loss.
- Blight only removes a small **region XP bonus** while active; it never takes anything away.
- **Return bonus:** after 2 or more days away from the app, the next session grants a "Rested at the Bonfire" chest. Coming back must feel rewarding, not shameful.
- **No streak counters anywhere.** Use "days active this month" instead.

### 6.8 Progression

- **Character level** from total XP, and **5 attributes** levelled by region XP.
- **Passive skill tree** (PoE-inspired, smaller): about 30–40 nodes, 1 point per level. Nodes give real in-app effects, e.g. +10% loot chance for Hearth quests, +1 Dungeon Run XP multiplier, Blight takes 1 extra day to set in, unlock a new UI theme.
- XP formula is based on energy tag, estimated minutes and type. Low-energy quests still give meaningful XP, so small tasks are always worth it.

### 6.9 Loot & gear

- **Variable reward:** each completed quest has a chance to drop an item. The chance scales with quest size. A pity timer guarantees a drop every 5 quests.
- Item slots: weapon, helm, chest, gloves, boots, amulet, ring×2, relic.
- Items have 1–4 random affixes that grant **in-app bonuses** (XP %, gold %, drop chance, Dungeon Run XP) plus flavour text.
- Equipped gear shows on a **character paper-doll** screen.
- Drop animation: chest shakes, light beam in the rarity colour, item reveal. This must feel great; it is the dopamine core.
- Inventory, salvage for gold, and a stash.

### 6.10 Real-life reward shop: "The Merchant"

- You define rewards (e.g. "1 hr gaming = 300 gold", "Order takeaway = 800 gold").
- Buying one deducts gold and logs it. There is no real-money integration.

### 6.11 End-of-day graph: "Ember Chronicle"

- Evening view: **energy over time line chart** (morning check-in plus all post-quest check-ins), with completed quests plotted as markers on the timeline.
- A daily summary: XP gained, loot found, regions cleansed.
- 7-day and 30-day energy trend view, e.g. "you're usually highest 10am–1pm".

### 6.12 Settings

- Edit regions/attributes, blight threshold, reminder defaults, sound on/off, reduced motion, haptics.
- **Export / Import save (JSON).**
- Credits (icon licences).

---

## 7. ADHD design rules (apply everywhere)

1. Never show more than 3 suggested quests at once by default.
2. Any action must be completable in **≤ 2 taps** from the home screen: complete quest, start run, quick capture.
3. No red "overdue" walls. Overdue items are shown neutrally as "Awaiting you".
4. Every completion gets **immediate** feedback: sound, animation and numbers popping.
5. Novelty must keep coming: rotating daily "Bounties" (bonus objectives), rare world events, and new tree nodes or cosmetics.
6. All copy is in-world, warm and never shaming.
7. Respect `prefers-reduced-motion`.

---

## 8. Data model (v1, IndexedDB via Dexie)

- `character` — level, xp, gold, attributes{}, skillPoints, allocatedNodes[], equipped{}
- `regions` — id, name, attribute, colour, lastActivityAt, blightStage
- `quests` — id, title, regionId, type, energyTag, estMinutes, isMajor, dueAt, reminders[], recurrence, parentId, order, status, completedAt, actualMinutes
- `energyLogs` — id, value (1–10), at, source (morning | post-quest | manual), questId?
- `focusRuns` — id, questId, plannedMin, actualMin, startedAt, endedAt, abandoned
- `items` — id, name, slot, rarity, affixes[], flavour, obtainedAt, equipped
- `rewards` — id, name, cost; `purchases` — id, rewardId, at
- `settings` — singleton
- `meta` — schemaVersion, lastOpenedAt (used for the return bonus)

Include a schema version and migrations from day one so Phase 2 sync is not painful.

---

## 9. Milestones (each ends with a working, installable build)

| # | Milestone | Done when |
|---|---|---|
| M1 | **Foundation** | PWA installs on Android, dark-fantasy shell and navigation, Dexie data layer, quests with regions and quick capture, quest completion with XP, export/import works |
| M2 | **Game feel** | Loot drops with animations, inventory and paper-doll, levels, attributes, skill tree, Merchant shop |
| M3 | **ADHD core** | Morning ritual with energy slider and top-3 suggestions, post-quest energy loop, Dungeon Runs, Day Map, Blight and cleanse, return bonus, end-of-day graph |
| M4 | **Reminders** | Implemented per D1 (recommended: Capacitor Android APK with local notifications) |
| M5 | **Polish** | Sounds, bounties, reduced-motion pass, performance, onboarding flow |
| P2 | **Phase 2** | Supabase sync and login (local-first, offline still works), Claude API "Break this down" with your own API key stored locally |

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Novelty fades by week 3 | Bounties, rare events and a skill tree with real effects. Review usage at week 3 and add content. |
| You lose your save (browser data cleared) | Weekly backup nudge and one-tap export |
| Scope creep while building (very ADHD) | Ship M1 and **use it for 3 days** before starting M2. Park new ideas in a `IDEAS.md` file. |
| Notification reliability | Resolve D1 before M4 |
| Non-coder stuck on build/deploy | Claude Code must give copy-paste steps and explain every install |
