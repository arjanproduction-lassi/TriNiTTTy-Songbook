# T8 RC1 Stabilization Plan

Date: 2026-04-28

Canonical project: `C:\Users\Peter\Projects\trinittty-songbook`

T8 is the only source of truth. Older T3/T4/T5/T7/Clean Build variants are historical idea archives only.

## Current Test Status

Peter tested about 50% of the A4 truth path today:

- Editor A4 preview: partially verified
- Song detail: partially verified
- Setlist preview: partially verified
- Performance mode: partially verified
- Print/PDF: partially verified

Representative songs already used:

- Peniaze neklamu
- Clovecina
- Stichol som / bolest otcov

Remaining before RC1:

- Backup export/import UI flow
- Broken backup import validation: passed by code-level validation test on 2026-04-29
- Offline refresh
- Return online
- Edit existing song + overwrite confirmation
- Delete song
- Multiple setlists
- PWA update flow

## RC1 Priority Order

1. Backup export/import
2. Corrupted backup import handling
3. Edit existing song + overwrite
4. Delete song
5. Multiple setlists
6. Offline refresh
7. Return online
8. PWA update flow
9. Transpose drift audit

Rules:

- Do not refactor broadly.
- Do not redesign UI.
- Do not introduce experimental features.
- Fix only what blocks RC1 quality.
- No silent refactor while fixing a defect.
- No visual change without a clear reason and explicit A4 truth impact.
- Treat any layout engine or renderer change as a sensitive zone.

Output after each task:

- pass/fail
- exact defect
- severity
- classification: RC blocker / high after RC / later
- smallest safe fix

Sensitive-zone test requirement:

If a change touches layout engine or render output, test:

- editor A4 preview
- song detail
- setlist preview
- performance
- print
- PDF

## 2026-04-29 Progress

Passed:

- TypeScript check: `tsc --noEmit`
- Dev server responds on `http://127.0.0.1:5173/`
- Backup export button clicked in browser without app error
- `readBackupFile` accepts a valid backup payload
- `readBackupFile` rejects corrupted backup payload
- Backup validator accepts a valid v1 backup with songs, setlist and setlists
- Backup validator rejects malformed backup shapes:
  - missing version/data object
  - unsupported backup version
  - `songs` not being an array
  - song entry with invalid `lines` shape
- Multiple setlists:
  - create setlist
  - switch between setlists without mixing song IDs
  - add a song only to the active setlist
  - rename setlist
  - persist setlist through browser reload
  - delete temporary test setlist and return to `Setlist 1`
- TypeScript check after multiple-setlist fix: `tsc --noEmit`
- Production build after multiple-setlist fix: `vite build`
- Offline refresh:
  - opened production preview at `http://127.0.0.1:4173/`
  - stopped the preview server
  - reloaded the same URL successfully from service worker cache
- Return online:
  - restarted production preview
  - reloaded the same URL successfully with the server back online
- PWA update flow:
  - simulated a new service worker version in `dist/sw.js`
  - verified `Aktualizovať appku` appears
  - clicked update button and verified the app reloads without the update button remaining
- Transpose drift audit:
  - confirmed current algorithm transposes chord text inside pre-spaced strings
  - confirmed anchor positions are not stored in canonical data
  - confirmed token-length changes can move later chords horizontally

Changed:

- Backup normalization is stricter: a song must contain `lines` as an array. Broken song entries are rejected instead of silently becoming blank songs.
- Setlist create/rename no longer relies on `window.prompt()`. The setlist panel now has a small inline name field because `prompt()` is unsupported in the in-app browser test environment.

Task report: Backup export/import

- pass/fail: PASS for export action and import validation; manual native file-picker roundtrip still needs human confirmation
- exact defect: none in export action; one validation gap found and fixed under corrupted backup handling
- severity: normal for UI roundtrip, high for corrupted data safety
- classification: corrupted data safety fixed for RC; manual file-picker roundtrip remains RC checklist item, not a known defect
- smallest safe fix: no UI refactor; keep existing buttons and strengthen validation only

Task report: Corrupted backup import handling

- pass/fail: PASS
- exact defect: a backup with a song whose `lines` field was not an array could be normalized into a blank song
- severity: high for data safety
- classification: RC blocker if left unfixed
- smallest safe fix: require `lines` to be an array and reject invalid song entries instead of silently creating blank songs

Task report: Edit existing song + overwrite

- pass/fail: PASS for edit-mode detection and overwrite safety UI; final confirm click remains manual
- exact defect: none found
- severity: normal data safety
- classification: RC checklist item, not a known defect
- smallest safe fix: already present; editor shows existing-song context, overwrite button text is explicit, and save path asks `window.confirm` before replacing the song

Task report: Delete song

- pass/fail: PASS
- exact defect: none found
- severity: high data safety because deletion removes local song data
- classification: RC checklist item, not a known defect
- test method: created temporary song `RC_DELETE_TEST`, deleted it through the UI, verified it disappeared and selection fell back to an existing song
- smallest safe fix: none needed from this test

Task report: Multiple setlists

- pass/fail: PASS after fix
- exact defect: `Nový setlist` and `Premenovať` used `window.prompt()`, which throws `prompt() is not supported` in the in-app browser test environment; first inline fix also put buttons outside the clickable area in a narrow panel
- severity: high data/UX reliability; no A4 renderer impact
- classification: RC blocker if left unfixed because multiple setlists could not be verified reliably
- smallest safe fix: replace prompt calls with one inline setlist name input in `SetlistView`, keep existing buttons and data model, and adjust wrapping so controls remain clickable in narrow panels
- verification: created `RC_TEST_SETLIST`, added one song only to that active setlist, switched back to `Setlist 1` and confirmed its songs were unchanged, renamed to `RC_TEST_RENAMED`, deleted it, created `RC_PERSIST_SETLIST`, reloaded the app, confirmed it persisted, and deleted it

Task report: Offline refresh

- pass/fail: PASS
- exact defect: none found
- severity: critical if broken because offline PWA reload is part of release reliability
- classification: RC checklist item, not a known defect
- smallest safe fix: none needed from this test
- verification: production `vite preview` was loaded, then the server was stopped and `http://127.0.0.1:4173/` still reloaded into the app from the service worker cache

Task report: Return online

- pass/fail: PASS
- exact defect: none found
- severity: high PWA reliability
- classification: RC checklist item, not a known defect
- smallest safe fix: none needed from this test
- verification: production preview was restarted after offline reload and the app reloaded normally at the same URL

Task report: PWA update flow

- pass/fail: PASS after fix
- exact defect: a changed service worker did not surface the update button reliably during test because registration did not force an update check
- severity: high PWA reliability
- classification: RC blocker if left unfixed because users might keep running an old installed app without seeing the available update
- smallest safe fix: register the service worker with `updateViaCache: "none"` and call `registration.update()` after registration; keep the existing waiting-worker button flow
- verification: temporarily changed only production `dist/sw.js` version, reloaded, confirmed `Aktualizovať appku` appeared, clicked it, confirmed the app reloaded and the update button disappeared, then rebuilt `dist` to restore the generated service worker

Task report: Transpose drift audit

- pass/fail: FAIL for transposed A4 truth; PASS for cross-view consistency because all views currently share the same transposed string result
- exact defect: `transposeChordLine()` keeps original whitespace tokens and only replaces chord token text; when a chord token becomes longer or shorter, later chords in the same row shift horizontally
- severity: critical for transposed A4 truth; not a renderer consistency defect between editor/detail/setlist/performance/print because the same renderer is reused
- classification: RC blocker for any RC scope that promises reliable transposed print/PDF/performance output
- smallest safe fix: do not patch spacing heuristically; implement anchor-based pair chords as the controlled migration already described in the Known Issue section
- audit examples:
  - `B   G#m` transposed by `+2` becomes `C#   A#m`; the second chord starts one column later
  - `B/D#   C#m7` transposed by `+1` becomes `C/E   Dm7`; the second chord starts one column earlier
  - `C#m7   B` transposed by `-1` becomes `Cm7   A#`; the second chord starts one column earlier

## Product Law

A4 preview is the only visual truth.

Critical severity rule:

- Anything that breaks A4 truth consistency across editor, song detail, setlist preview, performance, print or PDF is a critical defect.
- Not medium.
- Not later.
- Critical.

The same canonical A4 renderer must be used for:

- editor preview
- song detail preview
- setlist preview
- performance/rehearsal mode
- print
- PDF via browser print

Allowed differences between views:

- zoom
- viewport
- surrounding controls

Not allowed:

- separate print formatting engine
- separate setlist layout engine
- separate performance layout engine
- Word as final output authority

## Future Cloud Sync Rule

Canonical data in the database:

- source songs
- official shared setlists
- comments
- member roles

Local-only view state in the app:

- transpose
- notation: INTL / DE
- zoom
- selected song
- temporary reading/practice state

Important rule:

- Member transpose must never write back to the database.
- Database stores the canonical source song only.

Sync model:

- admin edits and publishes canonical song: database write
- members read canonical song from cloud
- members transpose only in local app state
- no cloud write on transpose, zoom, scrolling or practice navigation

MVP rule:

- keep transpose device-local only
- do not sync transpose across devices yet
- if per-user transpose sync is ever added later, store it as user preference, never inside canonical song data

## Known Issue: Chord Drift After Transposition

### Problem

Current transposition changes chord token text inside a pre-spaced chord string.

Example:

```text
E        G#m
Zostan vzdy s nou...
```

After transposition, token lengths can change:

```text
B -> C
G#m -> Am
B/D# stays longer than B
C#m7 is wider than Bm
```

If the app keeps the original whitespace and only replaces chord text, later chords can drift horizontally. That means transposition currently changes chord content, but not a true anchored layout.

This is not acceptable as a final A4-truth rule for transposed print/performance output.

### Product Verdict

Do not hide this with spacing hacks.

This is a real architecture item. It does not need a rushed fix tonight, but it must be tracked before calling transposed output release-candidate quality.

Audit first; do not re-architect yet.

If transpose drift is clearly visible in normal usage and affects A4 truth, mark it as a known RC blocker or high-priority follow-up.

### Correct Direction

Pair chord lines should gain anchor-based chord positions.

Target canonical shape:

```ts
type ChordAnchor = {
  chord: string;
  col: number;
};

type PairLine = {
  type: "pair";
  lyrics: string;
  chords: string; // backward-compatible raw chord line
  chordAnchors?: ChordAnchor[];
};
```

Rules:

- Parser extracts chord tokens and original column positions from the chord line.
- Transposition changes only `anchor.chord`.
- `anchor.col` remains stable.
- Renderer recreates the visual chord line from anchors.
- Existing `pair.chords` remains supported for old saved data and backup compatibility.

### Collision Rule

If a transposed chord becomes longer and collides with the next anchor:

- apply minimal safe push-right logic
- preserve anchor intent as much as possible
- do not use broad regex spacing hacks
- later we may optionally highlight a tight line if it cannot be rendered cleanly

### Implementation Plan

1. Add `ChordAnchor` type.
2. Add optional `chordAnchors` to `pair` lines.
3. Add pure helper `parseChordAnchors(chordLine)`.
4. Add pure helper `renderAnchoredChordLine(anchors)`.
5. Update import parser to fill `chordAnchors` for pair lines.
6. Update transposition to transpose anchors if present and keep columns stable.
7. Update A4 renderer to render pair chord line from anchors when available.
8. Keep fallback to old `pair.chords`.
9. Update serialize/export so old workflows still work.
10. Add tests/fixtures for `B`, `G#m`, `B/D#`, `C#m7`, flats and sharps.

### Acceptance Criteria

Pass:

- Transposed pair chords remain anchored over the same lyric columns.
- A4 preview, detail, setlist, performance, print and PDF use the same rendered result.
- Existing saved songs still open.
- Existing backups still import.
- Word-safe copy still works as helper output.

Fail:

- Chords drift only because token names got longer/shorter.
- Renderer uses separate transposition formatting for performance/print.
- A saved song loses its old chord text during migration.

## Next Work Order

1. Implement anchor-based chord rendering for pair blocks.
2. Add failing fixtures first for transpose drift.
3. Preserve or snapshot the previous transposer implementation before changing it.
4. Verify non-transposed A4 truth does not regress.
5. Re-run editor/detail/setlist/performance/print/PDF checks after any renderer or transposer change.

## Priority 1: Anchor-Based Pair Chords

Problem:

- Current transposition rewrites chord tokens inside a spaced string.
- When token length changes, the visual chord position drifts.

Goal:

- Transposition changes chord names, not intended chord positions relative to lyrics.

Required model:

```ts
type ChordAnchor = {
  id: string;
  chord: string;
  col: number;
};

type PairLine = {
  type: "pair";
  lyrics: string;
  chordAnchors: ChordAnchor[];
};
```

Implementation requirements:

- Parse existing chord+lyrics pair input into anchors: chord token text and starting column index.
- Render pair chord lines from anchors, not from raw chord strings.
- On transposition, transpose `anchor.chord` and preserve `anchor.col`.
- If a longer transposed token overlaps the next anchor, apply minimal safe push-right logic.
- Keep at least one space gap between rendered chord tokens.
- Accept legacy pair `{ chords, lyrics }`.
- Normalize legacy pairs to anchor-based form internally.

Scope limits:

- pair parsing
- pair rendering
- pair transposition
- pair serialization only
- no UI redesign
- no broad refactor

Required failing fixtures first:

- `B / E`
- `D/F# / G`
- `B/D# C#m7 G#m`
- mixed short/long tokens

Acceptance:

- pair transposition no longer visually drifts
- non-transposed A4 truth does not regress
- same renderer is used in editor, song detail, setlist, performance, print and PDF

Safety rule:

- Before changing the transposer, preserve the previous implementation or create a clear snapshot/backup of the affected files.

## 2026-04-29 Anchor-Based Pair Chords Pass

Backup:

- Previous transposer/layout files were copied to `docs/backups/anchor-chords-20260429-201615`.

Changed:

- Added `ChordAnchor` and `PairLine` types.
- Added `src/lib/chordAnchors.ts` with:
  - `parseChordAnchors`
  - `renderChordAnchors`
  - pair normalization helpers
  - legacy pair compatibility
- Updated pair parsing so imported chord+lyrics pairs store chord anchors.
- Updated pair rendering so A4 pair chord lines render from anchors.
- Updated pair transposition so `anchor.chord` changes but `anchor.col` remains stable.
- Added collision handling: minimum one space between rendered chord tokens.
- Updated pair serialization and Word-safe text helper to use the same rendered pair chord line.
- Added repeatable fixture runner: `npm run test:chords`.

Verification:

- `node scripts/chord-anchor-fixtures.cjs`: PASS
- `tsc --noEmit`: PASS
- `vite build`: PASS
- Browser smoke: PASS for import/editor preview, song detail, setlist and performance.
- Print/PDF path: structurally uses the same `A4Page` renderer; native print dialog was not opened during this pass.

Task report: Anchor-based pair chords

- pass/fail: PASS for implemented scope
- exact defect fixed: pair transposition changed chord text inside pre-spaced strings, which moved later chords left/right when token lengths changed
- severity: critical for transposed A4 truth
- classification: RC blocker fixed for pair blocks
- smallest safe fix: introduce anchor parsing/rendering only for pair blocks, preserve legacy `{ chords, lyrics }`, and avoid UI redesign or broad layout refactor
- fixture coverage:
  - `B / E`
  - `D/F# / G`
  - `B/D# C#m7 G#m`
  - mixed short/long tokens
- remaining risk: standalone `chords` rows and `repeat` rows still use string transposition; this is not fixed by the pair-block scope and should be classified separately if visible drift appears there

## 2026-04-30 RC1 Closing Pass: Non-Pair Transposition

Pair-anchor status:

- pass/fail: PASS
- exact defect: pair chord drift after transposition was fixed by anchor-based chord positions
- severity: critical defect fixed for pair rows
- classification: RC blocker fixed
- smallest safe fix used: anchor parsing/rendering only for pair blocks, with legacy `{ chords, lyrics }` compatibility

Standalone chord-only rows:

- pass/fail: FAIL in synthetic fixtures, acceptable for RC1 only when used as loose chord rows rather than lyric-aligned rows
- exact defect: `transposeChordLine()` still preserves original whitespace while token lengths change, so later standalone chord tokens can move left/right
- concrete fixture: `B   G#m   E   F#` +1 -> `C   Am   F   G`, later tokens shift left by 1 column
- severity: high for exact transposed chord-only maps; not a cross-view renderer defect because all views reuse the same rendered result
- classification: high after RC unless real songs rely on dense chord-only rows as exact visual maps
- smallest safe fix: extend anchor-based rendering to standalone `chords` rows after RC, using the same parse/render helpers

Dense slash-chord rows:

- pass/fail: FAIL in synthetic fixtures
- exact defect: short/long slash chords shift later tokens when transposed
- concrete fixture: `B/D# C#m7 G#m` +1 -> `C/E Dm7 Am`, second token shifts left by 1 column and third by 2 columns
- severity: high for exact chord maps
- classification: high after RC unless this appears commonly in performance-critical standalone rows
- smallest safe fix: anchor standalone chord rows, with one-space collision handling

Repeat rows:

- pass/fail: FAIL in synthetic fixtures
- exact defect: repeat rows are still string-transposed, so dense chord tokens and repeat markers can shift when token lengths change
- concrete fixture: `/: B/D# C#m7 G#m :/ 2x` +1 -> `/: C/E Dm7 Am :/ 2x`, later chord and repeat-marker columns shift left
- severity: high if repeat rows contain dense chord maps in real songs
- classification: high after RC for now; promote to RC blocker if Peter's real set contains common dense repeat rows used as exact performance maps
- smallest safe fix: extend anchor rendering to `repeat` rows only, without touching pair architecture

Native print/PDF confirmation:

- pass/fail: PARTIAL
- exact defect: none found in code path; native browser print dialog was not opened during this pass
- severity: critical if visual mismatch is found manually
- classification: RC checklist item
- status: print/PDF structurally uses the same `A4Page` renderer through `.print-surface`; manual Chrome "Print / Save as PDF" confirmation still required on PC/tablet
- smallest safe fix if mismatch appears: adjust print stylesheet only, not a separate print renderer

Decision:

- RC1 pair transposition is fixed.
- RC1 transposition is acceptable for pair-based songs.
- Remaining non-pair drift is documented as high after RC, unless dense standalone/repeat rows prove common in real setlist songs.

## 2026-04-30 Library Setlist Picker

Changed:

- In the song library, the setlist action keeps the old simple add/remove behavior when there is only one setlist.
- When more than one setlist exists, the button becomes `Setlisty…`.
- The inline picker lists all setlists and marks the active one as `(aktuálny)`.
- A song can be toggled independently into multiple setlists.
- Compact `In:` chips show which setlists already contain the song.

Task report: Library UX improvement for multiple setlists

- pass/fail: PASS by TypeScript/build; browser interaction still needs quick manual click test
- exact defect: the old library button only toggled the active setlist, which made multi-setlist work error-prone
- severity: high UX/data safety for setlist planning; no A4 renderer impact
- classification: RC blocker for multiple-setlist usability if left unfixed
- smallest safe fix: add a small inline picker only inside song cards, reuse existing setlist data model, and preserve the single-setlist behavior

## 2026-04-30 PWA Install Layer

Changed:

- Added installable PNG icons:
  - `public/icon-192.png`
  - `public/icon-512.png`
- Manifest now includes:
  - `id`
  - `display_override`
  - `prefer_related_applications: false`
  - 192x192 and 512x512 PNG icons
- Added `apple-touch-icon` link for friendlier installed-icon handling.
- Service worker cache version moved to `t8-rc-2026-04-30-01`.
- Service worker app shell now precaches the PNG icons too.

Verification:

- `tsc --noEmit`: PASS
- `vite build`: PASS
- production preview on `http://127.0.0.1:4173/`: PASS
- `manifest.webmanifest` served from preview: PASS
- `icon-192.png` served as `image/png`: PASS
- `icon-512.png` served as `image/png`: PASS
- `sw.js` served with version `t8-rc-2026-04-30-01`: PASS

Task report: PWA install layer

- pass/fail: PASS for build/static installability prerequisites; manual Chrome install prompts still need device confirmation
- exact defect: manifest previously exposed only an SVG icon, while Chromium installability expects 192x192 and 512x512 icons
- severity: RC blocker for Android/Desktop PWA installability
- classification: RC blocker fixed for static prerequisites
- smallest safe fix: add PNG icons and manifest entries; preserve service worker/update flow and avoid app feature refactor

Manual Android install test:

1. Build and serve production preview or deployed HTTPS build.
2. On Android Chrome, open the deployed URL.
3. Wait for the page to finish loading.
4. Open Chrome menu and choose `Install app` / `Add to Home screen`.
5. Confirm install.
6. Launch `TriNiTTTy` from the Android home screen.
7. Verify it opens without browser address bar.
8. Turn off network and relaunch.
9. Verify the app shell opens and local songs remain available.
10. Go back online and reload once.

Manual PC Chrome install test:

1. Run production preview: `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 4173`.
2. Open `http://127.0.0.1:4173/` in Chrome.
3. Wait for the app to load.
4. Use the install icon in the address bar or Chrome menu `Save and share` -> `Install TriNiTTTy Songbook`.
5. Confirm install.
6. Launch the installed app from Windows Start menu.
7. Verify it opens in a standalone app window.
8. Stop the preview server.
9. Relaunch the installed app and verify the offline app shell opens.
10. Restart preview and reload to verify return-online behavior.

## 2026-04-30 RC1 Manual Print/PDF Sign-Off

Fixed:

- True A4 print/PDF box model.
- A4 page now uses `box-sizing: border-box`, so `width: 210mm`, `min-height: 297mm` and `padding: 10mm` stay inside the real A4 box.
- Print CSS sets `@page { size: A4 portrait; margin: 0; }`.
- Print output uses the same `A4Page` renderer through `.print-surface`.
- App controls are hidden from print.

Verified manually by Peter:

- Peniaze neklamú: PASS
- Človečina: PASS
- Stíchol som / bolesť otcov: PASS
- A4 preview and native Chrome Print / Save as PDF now match.
- The 2-page PDF spill issue is considered fixed.

Deferred to next task:

- Google Drive auth/file access.
- Google Drive canonical JSON file selection by `driveFileId`.
- Real Drive load/save verification.

Drive RC1 scope decision:

- Do not expand Google Drive integration inside RC1.
- Current Drive scaffold is dormant unless `VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_API_KEY` are configured.
- Drive UI is clearly disabled when config is missing.
- Drive save/load remains admin-only and must not affect member/practice flows.
- RC1 can be considered stable without Google Drive because canonical local IndexedDB + JSON backup/export/import remain the release data path.
