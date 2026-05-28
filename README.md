# LassiLAB Songbook

Core RC1 offline band songbook for songs, chords, setlists, transposition, A4 previews and performance reading.

Default project/band name is `TriNiTTTy`, but it can be changed in the app under:

`Piesne -> PWA / lokalna databaza -> Nazov projektu / kapely`

## Product Philosophy

**A4 je pravda.**

The internal song model is the source of truth for app data. The A4 sheet is the visual truth for reading, printing and PDF checks.

The app is intentionally simple:

- local-first PWA,
- no accounts,
- no realtime sync,
- no cloud backend,
- no destructive hidden formatting,
- JSON database for app import/export,
- PDF/TXT as outputs, not the main storage model.

## Core RC1 Baseline

The Core RC1 baseline is the stable starting point for further work.

Recommended git tag:

```bash
core-rc1
```

Use this tag as the safe return point if later feature work breaks the app.

## User Workflow

### Install / run as PWA

For testers and band members, the preferred distribution is the hosted HTTPS app URL, for example the Vercel deployment.

On Android:

1. Open the app URL in Chrome.
2. Use `Install app` or `Add to Home screen`.
3. Launch LassiLAB Songbook from the home screen.
4. Import the current `.json` database file.

On Windows / notebook:

1. Open the app URL in Chrome or Edge.
2. Use the browser install action.
3. Launch the installed PWA.
4. Import the current `.json` database file.

### Database workflow

- Admin/bandleader edits the master database.
- Admin exports a versioned JSON database file.
- Band members import the exported JSON file.
- The app creates backups before destructive import/overwrite flows.
- Database version is visible in the app header.

Current database filename pattern:

```text
DBv047_TriNiTTTy_2026-05-28.json
DBv047_Jano_Band_2026-05-28.json
```

The project/band part comes from the local `Nazov projektu / kapely` setting.

## Developer Commands

```bash
npm install
npm run dev
npm run release:check
npm run preview
```

`npm run release:check` runs:

- TypeScript check,
- production build,
- chord fixture tests.

## Important Rules For Future Work

Do not casually change:

- parser,
- chord detection / transposition,
- A4 renderer output,
- print/PDF pipeline,
- TXT export/copy content,
- database schema/import/export behavior,
- performance/concert navigation logic.

Future features should be small, testable commits on top of Core RC1.

## Documentation

- [Internal manual](docs/INTERNY_MANUAL.md)
- [Work log](docs/DENNIK_PRAC.md)
- [Core RC1 baseline](docs/CORE_RC1_BASELINE.md)
- [RC1 sign-off checklist](RC1_SIGNOFF.md)
