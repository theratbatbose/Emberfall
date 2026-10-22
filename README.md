# Emberfall

A personal dark-fantasy life game: real tasks become quests that earn XP, gold and loot.
It's built for an ADHD brain, so there are no streaks and no shaming, and one small
action always undoes the Blight.

There are two ways to play. Both are the same game.

| | **Web app** (installable) | **Android app** (APK) |
|---|---|---|
| Where | `https://theratbatbose.github.io/ADHDiablo/` | [Latest release](https://github.com/theratbatbose/ADHDiablo/releases/latest) |
| Reminders | Only while the app is open or was used recently | **Fire even when the app is closed** |
| Updates | Automatic | Download the newer APK and install it over the old one |

Your save lives on the phone, inside whichever version you use. To move it between
versions, use **Settings → Export save** and then **Import save**.

---

## One-time setup (≈2 minutes, on a computer or phone browser)

**Turn on the website.** This only has to be done once.
1. Open https://github.com/theratbatbose/ADHDiablo/settings/pages
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Open https://github.com/theratbatbose/ADHDiablo/actions, click **Web app (GitHub Pages)**,
   then **Run workflow → Run workflow**. Wait for the green tick (about 1–2 minutes).

## Install the web app on Android

1. Open Chrome on your phone and go to `https://theratbatbose.github.io/ADHDiablo/`.
2. Tap the **⋮** menu (top right), then **Add to Home screen** (or **Install app**), then **Install**.
3. Open **Emberfall** from your home screen. It works offline.

## Install the Android app (for reliable reminders)

1. On your phone, open https://github.com/theratbatbose/ADHDiablo/releases/latest
2. Under **Assets**, tap `Emberfall-1.0.N.apk` to download it.
3. Open the download. Android will ask to allow installs from Chrome. Tap **Settings**, turn on
   **Allow from this source**, go back and tap **Install**.
   (Play Protect may say it doesn't recognise the app. Tap **Install anyway**. That's normal for
   apps that don't come from the Play Store.)
4. Open Emberfall, go to **Settings → Reminders**, tap **Allow reminders**, and on Android 12+
   also tap **Allow on-time alarms** if it shows.
5. To update later, install the newer APK the same way. Your save is kept.

## Back up your save

Settings → **Export save** writes a `.json` file. In the web app it goes to Downloads; in the
Android app the share sheet opens, so you can put it in Drive or email it to yourself. The
Hearth reminds you about once a week.

---

## For developers

```
npm install
npm run dev        # local dev server
npm test           # unit tests (game logic + database)
npm run build      # type-check + production build
node scripts/icons.mjs   # regenerate PNG / Android icons from public/favicon.svg
```

Pushing to the branch runs both GitHub Actions workflows (`.github/workflows/`):
the web app goes to GitHub Pages, and a signed APK is published as a GitHub Release.
See `CLAUDE.md` for the architecture and design rules.
