# TriNiTTTy Songbook - dennik prac a oprav

Tento subor je jednoduchy stavebny dennik aplikacie.
Slovna pravda je stale Git historia, ale tu je ludsky citatelny prehlad:

- co sa robilo,
- preco sa to robilo,
- co bolo overene,
- co ostava na manualne testovanie.

Pravidlo projektu:

**T8 je jediny source of truth. A4 preview je vizualna pravda.**

Produktova politika:

- Appka je pre solo muzikantov a zacinajuce/pracujuce kapely, nie pre produkcie s vlastnym IT timom.
- Ciel je prakticka priprava skladieb, setlistov a koncertna poistka, nie dalsi drahy cloudovy system.
- Muzikant sa ma vdaka appke skladbu naucit, nie byt na nu navzdy priputany.
- Na podiu ma appka sluzit ako rychla poistka pri vypadku pamate, orientacii v texte, akordoch a setliste.
- Realita a citatelnost maju prednost pred efektami.
- Ziadny cirkus: ziadne zbytocne efekty, ziadna vizualna exhibicia, ziadne funkcie len preto, ze sa daju urobit.
- Pre kapely ma byt preferovany lacny, prakticky a pochopitelny workflow: offline-first, Drive-first, bez povinneho servera a bez predplatneho.
- Google Drive smer je kontrolovany databazovy zdroj, nie realtime sync.
- Stage/dark rezim, ked pride, ma menej svietit do oci a nerusit. Nie je to "cool tema", ale pracovny rezim pre podmienky na podiu.

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

### ZNAMY BUG - importovana databaza na mobile/tablete ostava v dirty stave

Stav:

- Zatial nezmenene v kode.
- Manualny workaround pre kapelu.

Problem:

- Na PC sa databazovy stav sprava zrozumitelne.
- Na mobile/tablete po importe aktualnej oficialnej databazy z Google Drive moze hlavicka stale ukazovat stav typu `Zmeny nie su exportovane`.
- Samotna verzia databazy v hlavicke pritom moze byt spravna, napriklad `DB v033`.

Docasne pravidlo pre kapelu:

- Oficialna pravda je cislo databazy v hlavicke.
- Ak je oficialna verzia `DB v033` a clen kapely ma v hlavicke `DB v033`, je aktualny.
- Hlasenie o neexportovanych zmenach po importe na mobile/tablete je zatial zname UX/data-state zavadzanie.

Zaradenie:

- High priority UX/data-state bug.
- Nie je to blokator hrania, ak DB verzia v hlavicke sedi a skladby su nacitane spravne.
- Stane sa RC blockerom, ak by import nezmenil DB verziu, nacital zle data alebo by hrozila strata dat.

Navrhovana oprava:

- Po uspesnom manualnom importe validnej databazy oznacit databazu ako clean/current.
- Po uspesnom remote importe validnej databazy oznacit databazu ako clean/current.
- Nezvysovat `databaseVersion` pri importe.
- Dirty stav zapinat az po lokalnej uprave po importe.

Manualny test po buducej oprave:

- Importovat oficialnu DB na PC, mobile a tablete.
- Overit, ze hlavicka ukazuje importovanu DB verziu.
- Overit, ze app hned po importe nesvieti ako neexportovana.
- Urobit lokalnu zmenu a overit, ze dirty varovanie sa zapne.
- Exportovat a overit, ze dirty varovanie zhasne.

### PLAN - Google Drive databazovy zdroj ako kontrolovana pravda

Stav:

- Neimplementovat hned.
- Premysliet ako dalsi systemovy krok po realnych testoch.

Produktova myslienka:

- Admin/bandleader spravuje oficialnu databazu.
- Oficialny databazovy JSON je ulozeny na Google Drive.
- Pouzivatel v appke urci jeden oficialny zdroj databazy.
- App vie z tohto zdroja nacitat metadata databazy a porovnat ich s lokalnou DB verziou.
- App vie pouzivatelovi povedat, ci je lokalna databaza aktualna.

Dolezite pravidla:

- Toto nema byt realtime sync.
- Toto nema byt spolocne online editovanie.
- Toto nema byt automaticky merge konfliktov.
- Lokalna app databaza ostava pracovna kopia.
- Drive databazovy subor je kontrolovany zdroj aktualizacii.
- Transpozicia, zoom, vybrata skladba a practice stav ostavaju iba lokalne.

Technicky dolezite:

- Nepouzivat lokalnu cestu typu `C:\` alebo `F:\`.
- Nepouzivat nazov priecinka ako stabilnu identitu.
- Stabilna identita musi byt Google Drive file ID alebo jasne vybrany remote URL/file endpoint.
- Bezne Google Drive share linky nemusia byt vhodne ako priamy JSON zdroj bez Drive API.

Mozny MVP smer:

- Faza 1: manualny export/import ostava hlavny workflow.
- Faza 2: remote DB URL vie iba kontrolovat a importovat databazovu verziu.
- Faza 3: Google Drive file picker / vybrany subor cez Drive API.
- Faza 4: admin Save to Drive / members Load from Drive, stale bez realtime syncu.

Otvorene otazky:

- Chceme najprv jednoduchy verejny HTTPS JSON endpoint?
- Alebo rovno Google Drive API s vybranym suborom?
- Kto smie zapisovat oficialnu databazu?
- Ako jasne odlisit admin workflow od member workflow bez velkeho login systemu?

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
