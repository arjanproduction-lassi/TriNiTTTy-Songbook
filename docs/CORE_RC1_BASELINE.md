# LassiLAB Songbook Core RC1 Baseline

Baseline date: 2026-05-28

Recommended tag: `core-rc1`

Purpose:

This document marks the current app state as the stable Core RC1 baseline. Future feature work should build on top of this point in small, testable commits.

## What Core RC1 Contains

Core RC1 includes:

- local-first PWA app shell,
- configurable project/band name,
- versioned database export/import,
- clean DB copy download without version increment,
- backup-before-import and before-save backups,
- safe new-song workflow with stable song IDs,
- editor undo/redo,
- backup viewer and restore-as-copy,
- safe song trash/restore,
- A4 song renderer as visual truth,
- responsive A4 previews,
- dedicated print/PDF mode,
- print/PDF filename cleanup,
- A4 overflow warning,
- TXT export/copy with Word-friendly TXT export encoding,
- clickable setlist chips in song library,
- setlist management and preview,
- performance/concert mode,
- transpose reset between performance songs,
- normal/power chord recognition fixtures,
- global screen-only night mode,
- dark screen A4 preview skin,
- performance reader default at 115%.

## Core Rules

Do not break these rules without a deliberate task and tests:

1. Internal database JSON is the app data source.
2. A4 renderer is the visual truth.
3. Print/PDF must remain white A4 truth.
4. TXT is export/copy output, not primary storage.
5. No realtime sync in Core RC1.
6. No accounts or cloud backend in Core RC1.
7. No broad refactor without a safety reason.

## Untouched / Protected Areas

Future work should be careful around:

- parser,
- chord detection,
- transposition,
- A4 renderer output/layout,
- print/PDF pipeline,
- database import/export metadata,
- backup/restore flows,
- performance mode navigation.

## Current Distribution Recommendation

Use the hosted HTTPS PWA URL, for example the Vercel deployment.

Recommended tester flow:

1. Open app URL in Chrome/Edge.
2. Install as PWA if wanted.
3. Import current official JSON database.
4. Confirm DB version in header.
5. Test Piesne, Setlist, Koncertny rezim, PDF and Night mode.

Do not build APK/Electron/Tauri wrappers for Core RC1 unless there is a concrete need. PWA is the lowest-risk distribution path now.

## Known Non-Blocking Limits

These are accepted for Core RC1:

- No automatic Google Drive folder sync.
- Remote database source is controlled pull by URL, not sync.
- Google Drive share links may not behave as direct JSON URLs.
- Android print destination is controlled by Android system dialog.
- Very long songs warn on A4 overflow; app does not auto-shrink or auto-paginate.
- Mobile phone use is possible but naturally limited by screen size.

## Recovery / Return Point

To inspect the baseline without changing current work:

```bash
git switch --detach core-rc1
```

To start a safe branch from the baseline:

```bash
git switch -c recovery/core-rc1 core-rc1
```

Avoid destructive reset commands unless the current work is backed up and the intent is explicit.

## Validation Expected At Baseline

Required command:

```bash
npm run release:check
```

Expected result:

- TypeScript passes.
- Vite production build passes.
- Chord fixtures pass with `Chord anchor fixtures passed: 13`.

## Next Work Policy

After Core RC1:

- one feature/fix per commit,
- test before push,
- update `docs/DENNIK_PRAC.md`,
- avoid mixing UX polish with parser/data changes,
- keep A4/print safety first.
