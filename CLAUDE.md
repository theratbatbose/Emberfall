# Emberfall (working title) — project guide for Claude

Personal, phone-first dark-fantasy LifeRPG for one user: adult, ADHD, loves Diablo / Path of Exile-style loot.
Full spec: `docs/PRD.md` (source of truth). This file is the short version plus working rules. Keep it updated.

## Who I'm working with
- The owner is **not a coder**. Explain every install / setup / deploy step in plain language, one step at a time, copy-paste ready.
- I am the lead developer. Never silently pick the easy option when a choice changes how the app feels or works — present options + tradeoffs and let the owner choose.
- If unsure about a library version or API, check current docs / npm instead of guessing.

## Process rules
> **Owner override (22 Oct 2026):** the owner asked me to build all milestones end-to-end without stopping, and to make the decisions myself. M1–M5 were therefore built in one go. Decisions taken are logged under "Decisions" below. From now on, the default per-milestone/plan-first rules apply again to new work.

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
| Hosting | GitHub Pages via Actions (`.github/workflows/web.yml`), served at `/Emberfall/` (`BASE_PATH`) |
| Android | Capacitor 8 (`android/`), `@capacitor/local-notifications`, `filesystem`, `share`. APK built + released by `.github/workflows/android.yml` |
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
| M1 | Foundation | PWA installs on Android, dark-fantasy shell + nav, Dexie data layer, quests with regions + quick capture, completion with XP, export/import | Done |
| M2 | Game feel | Loot drops + animations, inventory + paper-doll, levels, attributes, skill tree, Merchant shop | Done |
| M3 | ADHD core | Morning ritual + energy slider + top-3, post-quest energy loop, Dungeon Runs, Day Map, Blight/cleanse, return bonus, end-of-day graph | Done |
| M4 | Reminders | D1 = option A (Capacitor APK) **plus** web fallback, behind `NotificationService` | Done |
| M5 | Polish | Sounds, bounties, world events, reduced-motion, onboarding | Done (owner testing) |
| P2 | Phase 2 | Supabase sync + login; Claude API breakdown | — |

## Decisions (made by me on the owner's instruction — revisit if they don't feel right)
- **D1 reminders:** Option A (Capacitor APK, real OS alarms) built in GitHub Actions, so nothing needs installing on the owner's computer. The web/PWA build keeps in-app reminders (option C behaviour) and points to the APK.
- **Hosting:** GitHub Pages (no extra account). Owner must enable Pages → Source: GitHub Actions once.
- **Fonts:** Cinzel (display) + EB Garamond (body), self-hosted via Fontsource (OFL).
- **XP:** (10 + 4·√min) × type (habit/daily 1, quest 1.2, boss 2) × energy (low 1, med 1.2, high 1.5); +10% "Kindled" region bonus unless blighted. Gold = XP/2. Level n→n+1 needs 100·n^1.5.
- **Just Start:** finishing the 5-min run pays the quest's full XP once per quest per day; completing the quest later the same day pays half.
- **Runs ≥5 min count as region activity** (cleanse the region).
- **Deleting quests** = "Banish" with an Undo toast (no confirm dialog).
- **Onboarding** offers optional starter quests, none pre-ticked.
- **Signing key** `android/emberfall.jks` is committed (personal sideloaded app) so updates install over each other without losing the save.

## Architecture
- `src/game/` pure game logic (unit-tested): xp, levels, loot (+pity), skillTree, blight, returnBonus, bounties, events, suggestions, runs (timestamp timer), dayMap, chronicle, reminders (plans the next 48h).
- `src/db/` Dexie schema (`SCHEMA_VERSION`), seed data, `migrations.ts`, `backup.ts` (export/import/validate).
- `src/actions/` DB transactions that apply the rules (complete quest, runs, bounties, gear, tree, merchant) + integration tests with fake-indexeddb.
- `src/services/` sound (Web Audio synth), haptics, notifications (`NotificationService`: native vs web), files (export/share), platform.
- `src/state/` hash router, Zustand UI store (toasts, floaters, loot queue…), live-query hooks, reminder/session sync.
- `src/ui/` kit, icons (original SVG), EmberField particles, Effects (overlays), LootReveal, QuestCard, Shell.
- `src/screens/` Hearth, Quests, QuestEditor, Realm/Region, Hero (gear/tree/merchant), Ritual, Run, DayMap, Chronicle, Settings, Onboarding.

## Docs & metadata
- `README.md` is the public product page (screenshots in `docs/screenshots/`, banner + `social-preview.png`). Copy follows the humanizer rules: plain, warm, no hype words.
- `index.html` has description, Open Graph and Twitter tags (`public/og-image.png`). The PWA manifest (in `vite.config.ts`) has categories and install-sheet screenshots (`public/screenshots/`, excluded from offline precache).
- Release notes for APK builds come from `.github/release-notes.md` (`{{VERSION}}` is replaced in CI).
- Screenshots are regenerated with a Playwright script driven by a fixed fake clock (not in the repo); note that a frozen clock also freezes Motion animations, so reload the page before shots taken after exit animations.

## Commands
- `npm run dev` · `npm test` · `npm run build` (typecheck + build) · `node scripts/icons.mjs` (regenerate icons)
- Android locally needs the Android SDK (not available in the cloud container); CI builds the APK.
