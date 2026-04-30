# TriNiTTTy Songbook T8 RC1 Sign-Off

Use this checklist for internal testing before calling T8 RC1 ready.

Build under test:

- Version: 1.0.0
- Marker: T8 RC1
- Build date: 2026-04-30

## Windows Chrome Test

Steps:

1. Run `npm run release:check`.
2. Run `npm run preview:lan`.
3. Open Chrome on Windows.
4. Open `http://127.0.0.1:4173/`.
5. Open `Piesne`.
6. Open one song detail.
7. Open `Setlist`.
8. Start performance mode.

Expected result:

- App loads without console-visible crash.
- Song library opens.
- Song detail A4 preview is visible.
- Setlist preview is visible.
- Performance mode opens with the same A4 renderer.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## Android Chrome Test

Steps:

1. On the PC, run `npm run preview:lan`.
2. Find the PC LAN IP address, for example `192.168.x.x`.
3. On Android, connect to the same Wi-Fi.
4. Open Chrome on Android.
5. Open `http://<PC-LAN-IP>:4173/`.
6. Open `Piesne`.
7. Open one song.
8. Open `Setlist`.
9. Start performance mode.

Expected result:

- App loads from the PC over LAN.
- The UI is usable on Android.
- A4 preview remains the same renderer.
- No install blocker appears from missing manifest/icon basics.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## Android PWA Install Test

Steps:

1. Prefer a deployed HTTPS URL for the real install sign-off.
2. Use LAN URL only as a local smoke test, not as final Android install proof.
3. Open the deployed HTTPS app URL in Android Chrome.
4. Wait until the page fully loads.
5. Open Chrome menu.
6. Tap `Install app` or `Add to Home screen`.
7. Confirm install.
8. Launch `TriNiTTTy` from the Android home screen.

Expected result:

- App installs from Chrome.
- Installed app launches in standalone mode.
- App icon appears on the home screen/app launcher.
- Final sign-off is based on HTTPS install, not only LAN preview.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## Windows Chrome PWA Install Test

Steps:

1. Run `npm run preview:lan`.
2. Open `http://127.0.0.1:4173/` in Chrome.
3. Wait until the page fully loads.
4. Use the install icon in the address bar, or Chrome menu -> `Save and share` -> `Install TriNiTTTy Songbook`.
5. Confirm install.
6. Launch the installed app from Windows Start.

Expected result:

- Chrome offers install.
- Installed app opens in a standalone window.
- Header shows `T8 RC1 · v1.0.0 · build 2026-04-30`.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## Native Print / Save As PDF Test

Steps:

1. Open a representative song in `Náhľad`.
2. Click `Tlačiť / PDF`.
3. In native Chrome print preview, choose paper size A4.
4. Check the preview visually.
5. Save as PDF.
6. Repeat from `Setlist` preview for one song.
7. Open the same song in performance mode and visually compare the A4 page before printing from `Setlist`.

Implementation note:

- RC1 performance mode has no separate print button.
- This is acceptable only because performance, song detail and setlist preview use the shared A4 renderer path.
- Native print/PDF uses the same `A4Page` print surface, not a Word or separate export layout.

Expected result:

- Print preview uses the same A4 page as the in-app preview.
- No app controls appear on the printed page.
- Columns, section headers, spaces, chords, lyrics, cue and repeat rows match A4 truth.
- Saved PDF matches native print preview.
- Performance visual page matches the song/setlist A4 page before printing.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## Backup Export / Import Roundtrip

Steps:

1. Open `Piesne`.
2. Click `Exportovať backup`.
3. Confirm downloaded filename format: `trinittty-backup-v1-YYYY-MM-DD-HHmm.json`.
4. Record the current number of songs and setlists.
5. Make a small safe change, for example create a temporary setlist named `RC1_RESTORE_TEST`.
6. Use `Reset dát` to create a clean restore target.
7. Confirm the app returned to demo/default data.
8. Click `Importovať backup`.
9. Select the exported JSON backup.
10. Confirm the library and setlists return exactly to the exported state.
11. Confirm `RC1_RESTORE_TEST` is not present if it was created after the backup export.

Expected result:

- Backup downloads with the expected filename format.
- JSON imports without crash.
- Songs and setlists are restored.
- Restore works into a clean/reset app state, not only over an already populated state.
- A corrupted or wrong JSON file shows a safe failure message.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## Library Setlist Picker Manual Click Test

Steps:

1. Open `Setlist`.
2. Create a second test setlist.
3. Go back to `Piesne`.
4. On any song card, click `Setlisty…`.
5. Toggle the song in the current setlist.
6. Toggle the same song in the other setlist.
7. Click outside the picker.
8. Reopen the picker.
9. Open a picker on one song, then open a picker on another song.
10. Confirm the first picker closed and did not remain stale.
11. Go to `Setlist` and delete the temporary test setlist.
12. Return to `Piesne`.
13. Confirm the deleted setlist disappeared from all `Setlisty…` pickers.
14. Confirm `In:` chips no longer show the deleted setlist name.

Expected result:

- Picker lists all setlists.
- Active setlist is marked `(aktuálny)`.
- A song can belong to multiple setlists.
- `In:` chips show setlists containing that song.
- Picker closes on outside click and on `Zavrieť`.
- Opening another song picker closes the previously open picker.
- Deleting a temporary setlist cleans up picker rows and `In:` chips.
- With only one setlist, the original simple add/remove button behavior remains.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## Offline / Online / Update Flow

Steps:

1. Run `npm run release:check`.
2. Run `npm run preview:lan`.
3. Open `http://127.0.0.1:4173/` in Chrome.
4. Wait until the app fully loads.
5. Stop the preview server.
6. Reload the same URL.
7. Restart `npm run preview:lan`.
8. Reload again.
9. For update testing, deploy or serve a newer build with a changed `public/sw.js` version.

Expected result:

- Offline reload opens the cached app shell.
- Returning online reloads normally.
- When a new service worker is available, the app offers `Aktualizovať appku`.
- Clicking update reloads into the new version.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## A4 Truth Regression Check

Steps:

1. Open `Peniaze neklamú` in editor A4 preview.
2. Open the same song in song detail.
3. Open it in setlist preview.
4. Open it in performance mode.
5. Print / Save as PDF.
6. Repeat with `Človečina`.
7. Repeat with `Stíchol som / bolesť otcov`.

Expected result:

- The same canonical A4 renderer is used.
- No line, section, chord, cue, repeat row or space disappears.
- No view introduces a different formatting engine.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-

## Transposed A4 Truth Check

Steps:

1. Open `Peniaze neklamú` in song detail.
2. Set transposition to `+1`.
3. Compare song detail A4 with setlist preview A4.
4. Open performance mode and compare the same song visually.
5. Set transposition to `-1`.
6. Repeat detail, setlist and performance comparison.
7. Repeat the same `+1` and `-1` flow with `Človečina`.
8. Repeat the same `+1` and `-1` flow with `Stíchol som / bolesť otcov`.
9. For `Stíchol som / bolesť otcov`, explicitly inspect the standalone chord row in `Intro`.

Expected result:

- Pair chords remain anchored over the same intended lyric positions.
- Detail, setlist and performance show the same transposed A4 result.
- Transposition changes chord names, not the renderer or page layout engine.
- Any remaining standalone chord-row drift is recorded as a known non-pair risk, not silently ignored.

Result:

- [ ] PASS
- [ ] FAIL

Notes:

-
