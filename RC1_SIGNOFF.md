# LassiLAB Songbook Core RC1 Sign-Off

Use this checklist before treating the current build as the stable Core RC1 baseline.

Baseline target:

- App: LassiLAB Songbook
- Version: 1.0.0
- Marker: T8 RC1
- Baseline tag: `core-rc1`
- Baseline date: 2026-05-28
- Default project: `TriNiTTTy`

## 1. Automated Validation

Steps:

1. Run `npm run release:check`.
2. Confirm the production build passes.
3. Confirm chord fixture tests pass.

Expected result:

- TypeScript check passes.
- Vite production build passes.
- Chord fixtures report `Chord anchor fixtures passed: 13`.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## 2. Git / Baseline Check

Steps:

1. Confirm `git status` is clean.
2. Confirm latest code is pushed to `origin/main`.
3. Create or verify tag `core-rc1`.
4. Push tag `core-rc1` to GitHub.

Expected result:

- `main` is clean.
- `main` matches `origin/main`.
- `core-rc1` points to the signed-off baseline commit.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## 3. Desktop Smoke Test

Steps:

1. Open the deployed HTTPS app in Chrome or Edge.
2. Open `Piesne`.
3. Open one song detail.
4. Open `Setlist`.
5. Start `Koncertny rezim`.
6. Toggle `Nocny rezim` and `Denny rezim`.

Expected result:

- App loads without crash.
- Header shows `LassiLAB Songbook` and the project/band name.
- Song detail A4 preview is visible.
- Setlist preview is visible.
- Performance mode opens with `Reader 115%`.
- Night/day toggle changes both label and real visual state.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## 4. Android / Tablet Smoke Test

Steps:

1. Open the deployed HTTPS app in Android Chrome.
2. Install as PWA or open in browser.
3. Import current official JSON database.
4. Open `Piesne`.
5. Open `Setlist`.
6. Start performance mode.
7. Toggle night/day mode directly from Setlist and Performance.

Expected result:

- UI is usable on tablet/mobile.
- A4 preview does not horizontally overflow.
- Setlist and performance night/day toggles work without returning to `Piesne`.
- Performance mode starts with `Reader 115%`.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## 5. PWA Install Test

Steps:

1. Open the deployed HTTPS URL in Chrome/Edge.
2. Use browser install action.
3. Launch installed app.
4. Reload/reopen the app.

Expected result:

- App installs as PWA.
- Installed app opens in standalone/browser app mode.
- Project setting persists locally.
- Imported database persists locally.
- If a new app build is available, the app can offer an update.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## 6. Database Export / Import Safety

Steps:

1. Confirm header shows current DB version.
2. Export official database after a real local change.
3. Confirm filename starts with the next DB version.
4. Download clean DB copy with no local changes.
5. Confirm clean copy does not increment databaseVersion.
6. Import a valid database.
7. Confirm imported databaseVersion is preserved.
8. Confirm local clean state does not claim remote freshness.

Expected result:

- Dirty export increments official DB version.
- Clean copy keeps current DB version.
- Import creates backup before replace.
- Import preserves imported databaseVersion.
- Header wording separates local clean state from remote/source freshness.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## 7. A4 Truth / Print / PDF

Steps:

1. Open a normal song in song detail.
2. Open the same song in Setlist preview.
3. Open it in performance mode.
4. Use `Tlacit / PDF`.
5. Save as PDF on desktop.
6. Repeat on Android/tablet if possible.

Expected result:

- A4 visual truth is consistent.
- Print/PDF output is white A4 truth.
- No app controls appear in PDF.
- A4 screen preview may be dark in night mode, but print/PDF remains white.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## 8. A4 Overflow Warning

Steps:

1. Open a known long song.
2. Confirm overflow warning appears if rendered A4 content exceeds page capacity.
3. Open Print/PDF view.
4. Confirm warning is screen-only and not printed into the PDF.

Expected result:

- Long songs do not silently cut content without warning.
- Warning is visible before print.
- Warning UI is not part of the printed A4 page.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## 9. Transposition / Chord Parsing

Steps:

1. Open a song with normal chords.
2. Transpose up/down.
3. Test slash/sus/add/maj/min variants.
4. Test power chord line such as `/: E5   G5   D5   A5:/ 2x`.
5. Confirm lyrics with numbers remain lyrics.

Expected result:

- Normal chords transpose correctly.
- Slash/add/sus/maj/min variants stay supported.
- Power chords transpose correctly in import/repeat/pair contexts.
- Lyrics with ordinary numbers are not misclassified as chords.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## 10. TXT Export / Copy

Steps:

1. Open a song.
2. Use `Kopirovat TXT`.
3. Paste into Word/Docs and set Courier New 9 pt.
4. Use `Export TXT`.
5. Open TXT in Notepad and Word.

Expected result:

- Clipboard text has no BOM.
- Downloaded TXT has UTF-8 BOM for Word compatibility.
- Chord alignment remains correct in monospace font.
- A4/PDF output is unchanged.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## 11. Project / Band Name Setting

Steps:

1. Open `Piesne`.
2. In `PWA / lokalna databaza`, change `Nazov projektu / kapely`.
3. Reload app.
4. Export/download DB copy.

Expected result:

- Header shows `LassiLAB Songbook - <project>`.
- Setting persists locally.
- DB filename uses sanitized project name.
- Old exports with `TriNiTTTy Songbook` remain import-compatible.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## Sign-Off Decision

Core RC1 decision:

- [ ] APPROVED as stable baseline
- [ ] HOLD - fix listed issue first

Final notes:

-
