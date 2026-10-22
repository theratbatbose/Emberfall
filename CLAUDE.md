# Emberfall (working title) — project guide for Claude

Personal, phone-first dark-fantasy LifeRPG for one user: adult, ADHD, loves Diablo / Path of Exile-style loot.
Full spec: `docs/PRD.md` (source of truth). This file is the short version plus working rules. Keep it updated.

## Who I'm working with
- The owner is **not a coder**. Explain every install / setup / deploy step in plain language, one step at a time, copy-paste ready.
- I am the lead developer. Never silently pick the easy option when a choice changes how the app feels or works — present options + tradeoffs and let the owner choose.
- If unsure about a library version or API, check current docs / npm instead of guessing.

## Process rules
1. **One milestone at a time** (M1 → M5). Before coding a milestone: show a short plan (what, files, installs) and **wait for OK**.
2. End of each milestone: build passes with no errors, tests pass, commit, give Android deploy + "Add to Home screen" steps, then **STOP**. Owner uses it for a few days before the next milestone.
3. **Scope creep guard:** new feature ideas mid-milestone go into `IDEAS.md`, not code. Remind the owner of the current milestone.
4. **Decision D1 (reminders)** must be re-explained (options A/B/C, plain words, with recommendation) and chosen by the owner **before M4**.
5. Branch: `claude/liferpg-app-build-qiwqdj`. Commit with clear messages.

## Stack (versions checked on npm, 22 Oct 2026)
| Area | Choice |
|---|---|
| App | PWA, React 19 + TypeScript + Vite 8 |
| PWA | `vite-plugin-pwa` 2.x (PRD said 1.x; 2.0 is current and supports Vite 8) |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Animation | Motion (`motion` package — the renamed Framer Motion) |
| State | Zustand 5 |
| Storage | Dexie 4 (IndexedDB) + `dexie-react-hooks`; schema version + migrations from day one |
| Charts | Recharts 3 (M3) |
| Tests | Vitest + `fake-indexeddb` |
| Hosting | Free static host with HTTPS, auto-deploying from GitHub |
| Phase 2 | Supabase sync/login (local-first stays), Claude API "Break this down" (user's own key) |

## Non-negotiable product rules
### Originality
- **All art, names, items, lore must be original.** Never copy real games' assets, item names, icons, sounds or lore. Genre conventions (rarity colour tiers, paper-doll, skill tree) are fine.
- Icons: original SVGs, or openly licensed (e.g. game-icons.net, CC BY 3.0 — credit required in Settings → Credits).
- Fonts: open-licensed (Google Fonts / Fontsource), self-hosted so they work offline.

### ADHD design rules (PRD §7 — apply everywhere)
1. Never show more than **3 suggested quests** at once by default.
2. Complete quest, start run, quick capture: each **≤ 2 taps** from home.
3. **No red "overdue" walls.** Overdue = neutral "Awaiting you".
4. Every completion gets **immediate** feedback: animation + numbers popping (+ sound from M5).
5. Novelty keeps coming: bounties, rare events, new nodes/cosmetics.
6. All copy is in-world, warm, **never shaming**.
7. Respect `prefers-reduced-motion` (plus an in-app toggle).

### Also always
- **No streaks anywhere.** Use "days active this month".
- Blight never removes XP, items or levels; one small quest cleanses a region fully.
- Return bonus after 2+ days away ("Rested at the Bonfire" chest).
- Timers use **timestamps** (start/end times), never interval counting, so they stay right with the screen off.
- Data local in IndexedDB; **Export / Import JSON** backup; weekly backup nudge.
- Mobile-first, big tap targets (≥ 48px), works offline.
- Look & feel from M1: near-black, ember orange / blood red accents, parchment + iron frames, serif display font, ember particles, rarity glow.
- Unit tests for game logic: XP formula, loot generation, pity timer, blight/cleanse, return bonus. Game logic lives in pure functions (`src/game/`) so it's testable without UI.

## Lore / naming (original)
- Player: the **Ashbearer**. World threat: the **Blight**.
- Regions → attributes: The Bloodwell (Health → Vitality), The Forge (Work → Might), The Hearth (Home/admin → Fortitude), The Archive (Learning → Intellect), The Lanterns (Social → Spirit). Editable; custom regions allowed. Plus an "Unsorted" inbox.
- Rarity: Worn (grey) → Enchanted (blue) → Rare (yellow) → Relic (orange, named, unique effect).
- Quest types: Daily, Habit, Quest, Boss.

## Milestones (PRD §9)
| # | Milestone | Done when | Status |
|---|---|---|---|
| M1 | Foundation | PWA installs on Android, dark-fantasy shell + nav, Dexie data layer, quests with regions + quick capture, completion with XP, export/import | **Planning** |
| M2 | Game feel | Loot drops + animations, inventory + paper-doll, levels, attributes, skill tree, Merchant shop | — |
| M3 | ADHD core | Morning ritual + energy slider + top-3, post-quest energy loop, Dungeon Runs, Day Map, Blight/cleanse, return bonus, end-of-day graph | — |
| M4 | Reminders | Per D1 (recommended: Capacitor Android APK + local notifications) — **owner must choose first** | — |
| M5 | Polish | Sounds, bounties, reduced-motion pass, performance, onboarding | — |
| P2 | Phase 2 | Supabase sync + login; Claude API breakdown | — |

## Commands
(filled in once the project is scaffolded in M1)
