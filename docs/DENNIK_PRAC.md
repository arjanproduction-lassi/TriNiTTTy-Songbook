# TriNiTTTy Songbook - dennik prac a oprav

Tento subor je jednoduchy stavebny dennik aplikacie.
Slovna pravda je stale Git historia, ale tu je ludsky citatelny prehlad:

- co sa robilo,
- preco sa to robilo,
- co bolo overene,
- co ostava na manualne testovanie.

Pravidlo projektu:

**T8 je jediny source of truth. A4 preview je vizualna pravda.**

## Ako zapisovat zaznam

Kazdy zaznam by mal mat:

- datum,
- typ zmeny: fix / UX / data safety / PWA / docs,
- kratky popis,
- commit hash,
- overenie,
- rizika alebo manualne testy.

---

## 2026-05-09

### FIX - power chordy v importe, repeat a pair blokoch

Commit:

- `111409d Recognize power chords in import and repeat blocks`

Problem:

- Akordy typu `E5`, `G5`, `D5`, `A5` neboli spolahlivo rozpoznane v raw importe, repeat blokoch a pair chord riadkoch.
- Riadok `/: E5   G5   D5   A5:/ 2x` fungoval len vtedy, ked ho pouzivatel rucne prinutil ako `chords`.
- Pri type `repeat` alebo `pair` mohol obsah skoncit ako netransponovatelny text.

Oprava:

- Doplnene rozpoznanie suffixu `5` v chord tokenoch.
- Repeat znacky prilepene na akordoch, napriklad `/:E5` alebo `A5:/`, sa pri transpozicii zachovaju.
- Transponuje sa iba jadro akordu, repeat marker a suffix `2x` ostavaju zachovane.
- Pair blok transponuje chord row a lyric row ostava nedotknuty.

Overene automaticky:

- `npm run release:check` presiel.
- `test:chords` presiel.
- Fixture testy hlasia: `Chord anchor fixtures passed: 13`.

Testovane scenare:

- Raw import `/: E5   G5   D5   A5:/ 2x` ostava `repeat`, nie `lyrics`.
- Repeat blok sa transponuje: `/: E5   G5   D5   A5:/ 2x` -> `/: F5   G#5   D#5   A#5:/ 2x`.
- Pair chord row `E5   G5   D5   A5` sa transponuje, lyric row ostava text.
- Regresia pre bohatsie akordy ostala funkcna:
  `Asus4 G/B Cadd9 Bm7 F#7 Cmaj7 G9 Dm7`.
- Text s cislami ostava text:
  `Daj mi 5 minut a 2 slova`.

Manualne este vhodne otestovat:

- Import realnej skladby s power chord repeat riadkom.
- Save/reopen skladby.
- Transpozicia v song detail, setlist a concert mode.
- A4 preview po transpozicii bez posunu layoutu mimo ocakavane spravanie.

### PWA - vynutenie ponuky aktualizacie

Commit:

- `e7c0b3d Bump PWA cache version for app update`

Problem:

- Po pushnuti opravy sa na tablete nemusela ponuknut aktualizacia aplikacie.
- Service worker mal stale rovnaku cache verziu.

Oprava:

- Zvysena verzia cache v `public/sw.js`.
- Aktualizovany build stamp na `2026-05-09`.

Overene automaticky:

- `npm run release:check` presiel.

Manualne este vhodne otestovat:

- Po Vercel deployi otvorit app na tablete.
- Overit, ze sa ponukne aktualizacia alebo sa po refreshi zobrazi build `2026-05-09`.
- Overit, ze lokalna databaza ostala zachovana.

---

## Predchadzajuce zdroje historie

Pred vznikom tohto dennika sa historia prac drzala hlavne tu:

- Git historia commitov.
- `docs/NEXT_TASKS.md`
- `docs/T8-RC1-PLAN.md`
- `docs/INTERNY_MANUAL.md`
- `RC1_SIGNOFF.md`

Od tohto bodu je tento subor odporucane miesto pre ludsky citatelny prehlad oprav.
