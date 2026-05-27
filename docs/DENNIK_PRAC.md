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

Release / update / rollback politika:

- Male UI alebo textove upravy nemusia vzdy vynucovat PWA hlasku `Aktualizovat`.
- Pri malych upravach staci, ak sa zmena nacita po refreshi alebo znovuotvoreni appky.
- Vacsi release alebo citliva zmena ma bumpnut `public/sw.js` cache verziu, aby PWA vedela ponuknut aktualizaciu.
- Pred vacsim release musi prejst `npm run release:check`.
- Vacsi release sa zapisuje do dennika prac.
- Rollback appky sa robi cez Git/Vercel: revert commit alebo redeploy starsieho commitu.
- Rollback databazy sa robi cez JSON exporty, backup pred importom, lokalne before-save zalohy a kos.
- Zatial nerobime komplikovany rollback system priamo v UI.
- Tento model ma najlepsi ROI pre projekt: lacny, pochopitelny, bez vlastneho servera a bez zbytocnej technickej zataze.

## Ako zapisovat zaznam

Kazdy zaznam by mal mat:

- datum,
- typ zmeny: fix / UX / data safety / PWA / docs,
- kratky popis,
- commit hash,
- overenie,
- rizika alebo manualne testy.

---

## 2026-05-11

### BUGFIX / UX - A4 overflow warning pre dlhe piesne

Commit:

- `Warn when songs overflow A4 page` (hash je v Git historii tohto commitu)

Problem:

- Pri vacsich piesnach moze print/PDF odrezat spodne riadky A4.
- Editor alebo preview mohli vyzerat zdanlivo v poriadku, lebo screen A4 stranka mala `min-height` a vedela narast.
- Print/PDF vsak tlaci realnu A4 vysku 297mm s `overflow: hidden`.

Princip:

- A4 ostava vizualna pravda.
- Appka nesmie ticho rezat obsah bez upozornenia.
- Tento pass iba varuje, nic automaticky nezmensuje ani nepreformatuje.

Oprava:

- `A4Page` meria realnu vyrenderovanu vysku DOM stranky oproti A4 vyske 297mm.
- Ak stranka prerastie A4, wrapper zobrazi varovanie:
  `Skladba presahuje A4. Spodne riadky sa mozu pri tlaci/PDF odrezat.`
- Varovanie sa zobrazuje pri A4 preview wrapperoch.
- Print/PDF rezim zobrazi screen-only varovanie pred tlacou.
- Varovanie sa netlaci do PDF.
- Concert/performance rezim nema overlay warning, aby sme nemenili stage spravanie.

Nedotknute:

- Parser.
- Transpozitor.
- TXT export/copy.
- DB import/export.
- Remote DB.
- Setlist logika.
- Print/PDF pipeline struktura.
- A4 layout pravidla, fonty a stlpce.

Overene automaticky:

- `npm run release:check` presiel.
- `test:chords` presiel.

Manualne este vhodne otestovat:

- Kratka skladba bez presahu: bez varovania.
- Dlhasia skladba s presahom: varovanie pri A4 preview.
- Print/PDF rezim dlhej skladby: varovanie pred tlacou, nie v PDF.
- Editor A4 preview dlhej skladby: varovanie.
- Song detail, quick preview, setlist preview: konzistentne varovanie.
- A4 layout sa nezmenil.

## 2026-05-10

### CLEANUP - Capo skryte z aktivneho workflow

Commit:

- `Hide capo from active workflow` (hash je v Git historii tohto commitu)

Problem:

- `Capo` momentalne mätie workflow viac, nez pomaha.
- Capo spravanie teraz nechceme aktivne podporovat.
- Zaroven nechceme rozbit stare skladby, backupy, import/export ani datovu kompatibilitu.

Oprava:

- Capo skryte z import/editor metadata formulara.
- Capo odstranene z A4 hlavicky.
- Capo odstranene zo song info panelu.
- Capo odstranene z TXT metadata exportu/kopirovania.

Zachovane:

- `capo` pole ostava v `Song` a `ImportDraft` typoch.
- Stare skladby s `capo` sa stale nacitaju.
- Import/export/backups ostavaju tolerantne k existujucim capo hodnotam.
- Transpozitor ostal nedotknuty.
- Print/PDF logika ostala nedotknuta.

Overene automaticky:

- `npm run release:check` presiel.
- `test:chords` presiel.

Manualne este vhodne otestovat:

- Import/editor uz nezobrazuje Capo.
- Song detail info panel uz nezobrazuje Capo.
- A4 preview/print/PDF uz nezobrazuje Capo.
- TXT export uz nezobrazuje Capo metadata.
- Stara skladba s ulozenym capo sa nacita bez chyby.
- Transpozicia funguje rovnako ako predtym.

### FIX - mobile Setlist rychly A4 nahlad

Commit:

- `Fix mobile setlist A4 preview fit` (hash je v Git historii tohto commitu)

Problem:

- Rychly A4 nahlad v Setlist view bol rozbity iba na mobile.
- Tablet Setlist nahlad bol OK.
- Song detail A4 preview a Songs rychly A4 nahlad boli OK.

Pricina:

- Setlist view pouzival priamo `A4Sheet` aj na mobile.
- Funkcne mobilne cesty v Song detail a Songs quick preview pouzivaju `FitA4Sheet`, ktory pocita scale podla realnej sirky a vysky kontajnera.
- A4 renderer nebol problem; rozdiel bol v parent/wrapper retazci a mobilnom fit spravani.

Oprava:

- Iba mobilna vetva Setlist preview pouziva `FitA4Sheet`.
- `md` a vyssie ostavaju na povodnom `A4Sheet`, aby tablet/desktop spravanie zostalo zachovane.
- A4 renderer, print/PDF, parser, transpozitor a data model ostali nedotknute.

Overene automaticky:

- `npm run release:check` presiel.
- `test:chords` presiel.

Manualne este vhodne otestovat:

- Mobile Setlist view: A4 nahlad sa zmesti do sirky bez rozbitia.
- Tablet Setlist view: spravanie ostava OK.
- Song detail A4 preview ostava OK.
- Songs rychly A4 nahlad ostava OK.
- Print/PDF ostava bez zmeny.

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

### DB export - oddelenie oficialnej verzie od cistej kopie

Commit:

- `Separate DB copy download from versioned export`

Problem:

- V cistom stave tlacidlo `Stiahnut kopiu DB` pouzivalo rovnaku exportnu funkciu ako oficialny export po zmenach.
- Tato funkcia vzdy zvysovala `databaseVersion` o 1.
- Pouzivatel tak mohol nechtiac vytvarat nove oficialne verzie, napriklad `DBv034`, `DBv035`, aj bez realnej zmeny databazy.

Oprava:

- Oficialny export v dirty stave ostava nezmeneny: zvysi `databaseVersion` o 1 a oznaci databazu ako exportovanu.
- Stiahnutie kopie v cistom stave pouziva samostatnu cestu bez inkrementu verzie.
- Aj keby cisty stav omylom zavolal oficialnu exportnu funkciu, logika uz nevytvori novu verziu a stiahne iba kopiu aktualnej DB.
- Kopia pouziva aktualny `databaseVersion`; `exportedAt` je cas stiahnutia kopie.
- Header verzia DB sa pri stiahnuti kopie nemeni.

Overene automaticky:

- `npm run release:check` presiel.
- Fixture testy hlasia: `Chord anchor fixtures passed: 13`.

Manualne este vhodne otestovat:

- Dirty stav: `DBv040` -> export vytvori `DBv041`.
- Cisty stav: `Stiahnut kopiu DB` vytvori subor s tou istou verziou, napriklad `DBv041`, a header ostava `DBv041`.
- Import stareho aj noveho DB suboru ostava nezmeneny.

### DB import - importovana databaza je aktualna, nie dirty

Commit:

- `Mark imported database clean`

Problem:

- Po importe oficialnej databazy mohla appka, hlavne na mobile/tablete, zobrazit `Zmeny nie su exportovane`.
- Import oficialnej DB ale nie je lokalna editacia; je to prevzatie aktualnej pravdy.

Oprava:

- Manualny import po uspesnom nahradeni databazy nastavuje clean/current stav.
- Remote import po uspesnom nahradeni databazy nastavuje clean/current stav.
- Load z Drive scaffold cesty pouziva rovnaku clean logiku.
- Import zachova `databaseVersion` zo suboru a neinkrementuje ju.
- Nasledna lokalna uprava skladby alebo setlistu stale znovu oznaci databazu ako dirty.

Overene automaticky:

- `npm run release:check` presiel.
- Fixture testy hlasia: `Chord anchor fixtures passed: 13`.

Manualne este vhodne otestovat:

- Importovat aktualny `DBv041` na mobile/tablete a overit, ze header neukazuje `Zmeny nie su exportovane`.
- Upravit skladbu alebo setlist po importe a overit, ze dirty warning sa znovu zapne.
- Export po takej uprave ma vytvorit dalsiu oficialnu verziu.

### DB status - lokalne cista DB nie je automaticky najnovsia kapelova DB

Commit:

- `Clarify local DB clean state wording`

Problem:

- Appka vedela zobrazit `Databaza aktualna`, aj ked iba vedela, ze zariadenie nema lokalne neexportovane zmeny.
- V kapelovom workflow to mohlo mylit: tablet s `DBv004` mohol posobit aktualne, hoci official DB u kapelnika bola napriklad `DBv046`.

Oprava:

- Dirty stav ostava `Zmeny nie su exportovane`.
- Cisty lokalny stav bez overeneho zdroja je `Bez lokalnych zmien`.
- Pri cistom stave bez remote checku sa zobrazi jemna poznamka `Oficialna verzia neoverena`.
- Aplikacia povie `Databaza aktualna podla zdroja` iba po remote/kapelovom checku so zhodnou verziou.
- Ak zdroj obsahuje novsiu DB, header a remote sekcia ukazu `Dostupna novsia DB v...`.

Overene automaticky:

- `npm run release:check` presiel.
- Fixture testy hlasia: `Chord anchor fixtures passed: 13`.

Manualne este vhodne otestovat:

- Zariadenie s lokalne cistou starsou DB nema tvrdit, ze je globalne aktualne.
- Remote check proti novsej databaze ma ukazat dostupnu novsiu DB.
- Po importe ostava stav `Bez lokalnych zmien`, kym nepride lokalna uprava.

### DB header - zdrojove overenie mimo hlavnej hlasky

Commit:

- `Simplify DB header source verification wording`

Problem:

- Hlavicka zobrazovala `Oficialna verzia neoverena` ako samostatny badge.
- Technicky to bolo pravdive, ale v manualnom kapelovom workflow to zbytocne posobilo ako varovanie aj vtedy, ked si ludia DB verziu overili rucne.

Oprava:

- Hlavicka ostava zamerana na lokalny stav:
  - `Zmeny nie su exportovane`
  - `Bez lokalnych zmien`
  - pripadne remote vysledok po skutocnom checku.
- Badge `Oficialna verzia neoverena` bol odstraneny z hlavicky.
- Pomocny text o rucnom overeni DB je iba v sekcii `Kapelovy zdroj databazy`.

Overene automaticky:

- `npm run release:check` presiel.
- Fixture testy hlasia: `Chord anchor fixtures passed: 13`.

Manualne este vhodne otestovat:

- Cista lokalna DB v hlavicke ukaze iba `Bez lokalnych zmien`.
- V sekcii kapeloveho zdroja ostava jemna pomocna veta k rucnemu overeniu.
- Dirty lokalna uprava stale ukaze warning.

### Performance - prakticky nocny rezim na podiu

Commit:

- `Add stage dark mode for performance`

Problem:

- Na podiu moze biela obrazovka tabletu zbytocne svietit do oci.
- Cielom nie je tema celej appky, ale citatelne a pokojne javiskove zobrazenie.

Oprava:

- Do koncertneho/performance rezimu bol pridany lokalny toggle `Nocny rezim`.
- Nastavenie sa uklada iba lokalne v zariadeni.
- Tmavy rezim sa vztahuje iba na performance shell a screen zobrazenie A4 v performance view.
- A4 renderer, parser, transpozicia, DB, TXT export a print/PDF ostali bez zmeny.
- Print/PDF ostava biela A4 pravda.

Overene automaticky:

- `npm run release:check` presiel.
- Fixture testy hlasia: `Chord anchor fixtures passed: 13`.

Manualne este vhodne otestovat:

- Performance view na tablete v landscape.
- Prepinanie `Nocny rezim` a citatelnost akordov/textu.
- Transpozicia a dalsia/spat navigacia v performance mode.
- Overit, ze print/PDF ostava biele A4.

### Knižnica - klikacie setlist chipy a pohodlnejsi rychly A4 nahlad

Commit:

- `Polish song library navigation and preview UX`

Problem:

- Setlist chipy v kniznici piesni boli iba informacne.
- Pouzivatel videl, v ktorom setliste skladba je, ale musel sa tam preklikavat inou cestou.
- Rychly A4 nahlad na desktope pouzival velky scrollovaci papier, co nebolo vzdy pohodlne na rychlu kontrolu celej strany.

Oprava:

- Setlist chipy v kniznici su klikacie navigacne prvky.
- Klik na chip otvori dany setlist a vyberie kliknutu skladbu ako setlist preview.
- Tlacidlo `Setlisty...` ostava na spravu clenstva skladby v setlistoch.
- Rychly A4 nahlad v kniznici pouziva fit wrapper aj na desktope/tablete, aby sa preferovalo zobrazenie celej A4 strany.
- A4 renderer, print/PDF, parser, transpozicia a databazova logika ostali bez zmeny.

Overene automaticky:

- `npm run release:check` presiel.
- Fixture testy hlasia: `Chord anchor fixtures passed: 13`.

Manualne este vhodne otestovat:

- Klik na chip `In: ...` v kniznici otvori spravny setlist.
- Existujuce `Setlisty...` menu stale pridava/odobera skladbu zo setlistov.
- Rychly A4 nahlad fituje celu stranu na PC/tablete/mobile.

### Knižnica - ovladanie rychleho A4 nahladu ostava na ociach

Commit:

- `Keep A4 preview controls fixed during zoom`

Problem:

- Pri zvacsovani rychleho A4 nahladu mohlo byt ovladanie nepohodlne alebo mimo pozornosti.
- Zoom ma menit iba papier, nie ovladacie prvky preview panelu.

Oprava:

- Rychly A4 nahlad ma sticky toolbar mimo skalovaneho A4 papiera.
- Toolbar obsahuje `Fit`, `100%`, `-`, `+` a aktualny stav zoomu.
- `Fit` preferuje celu stranu v paneli.
- `100%` zobrazi realny 100% papier v scrollovatelnom viewport-e.
- Zoom sa aplikuje iba na A4 sheet vo viewport-e.
- A4 renderer, print/PDF, parser, transpozicia a DB logika ostali bez zmeny.

Overene automaticky:

- `npm run release:check` presiel.
- Fixture testy hlasia: `Chord anchor fixtures passed: 13`.

Manualne este vhodne otestovat:

- PC/tablet: pri 100% a zvacseni ostava toolbar dostupny.
- Mobile: toolbar neprekrýva obsah a preview sa da rolovat.
- Print/PDF neobsahuje preview toolbar.

### Kniznica - desktop comfort pass pre rychly A4 nahlad a hustotu zoznamu

Commit:

- `Polish quick A4 preview controls and song density`

Problem:

- Rychly A4 nahlad na desktop/notebooku mal este zbytocny mrtvy priestor v pravom paneli.
- Zoom toolbar bol nejasny, pretoze kombinoval `Fit`, `100%` akciu a samostatny stav zoomu.
- Karty skladieb v kniznici boli na desktope este o kus vyssie, nez bolo prakticke pre pracovny zoznam.

Oprava:

- Desktop `xl` layout dava pravemu A4 preview panelu vacsi podiel sirky.
- Quick A4 preview ma kompaktnejsi desktop toolbar a vacsi desktop viewport pre papier.
- Zoom toolbar je zjednoteny na jeden model: `Fit`, `-`, aktualny zoom stav, `+`.
- `Fit` resetuje rychly nahlad na celu A4 stranu v paneli.
- Karty skladieb maju na desktopovom breakpointe mierne mensie paddingy/gapy a kompaktnejsie tlacidla.
- Tabletove `lg` spravanie, A4 renderer, print/PDF, parser, transpozicia, DB a performance mode ostali bez zmeny.

Overene automaticky:

- `npm run release:check` presiel.
- Fixture testy hlasia: `Chord anchor fixtures passed: 13`.

Manualne este vhodne otestovat:

- Desktop wide: pravy A4 panel vyuziva priestor lepsie a cela A4 je viditelna cez `Fit`.
- Notebook: kniznica ukaze o trochu viac skladieb bez straty citatelnosti.
- Tablet: Songs/Setlist/Performance vizualne bez regresie.

### Globalny screen-only nocny rezim

Commit:

- `Add global screen night mode`

Problem:

- Appka mala tmavy rezim iba pre performance/stage citanie.
- Pri vecernej praci bolo stale nutne pozerat do svetleho shellu kniznice, editoru a setlistu.
- A4 papier a PDF vsak musia ostat biela pravda.

Oprava:

- Do hlavnej hornej listy pribudol toggle `Nocny rezim`.
- Nastavenie sa uklada lokalne v `localStorage` pod klucom `trinittty-screen-night-mode`.
- Root app shell dostava triedu `app-night`, ktora tmavi iba screen UI.
- Karty, panely, inputy, tlacidla, chipy a shell maju centralne CSS override pravidla v `src/index.css`.
- `.a4-print-surface` je v nocnom rezime explicitne chraneny ako biely papier.
- Print/PDF root nepouziva `app-night`, aby tlac ostala nezmenena.
- Parser, transpozicia, DB, TXT export, A4 renderer a print pipeline ostali bez zmeny.

Overene automaticky:

- `npm run release:check` presiel.
- Fixture testy hlasia: `Chord anchor fixtures passed: 13`.

Manualne este vhodne otestovat:

- Desktop kniznica, detail, import/editor a setlist v nocnom rezime.
- Performance view s globalnym nocnym rezimom aj bez neho.
- A4 nahlad ostava biely.
- Print/PDF ostava biele A4 bez tmaveho shellu.

### Nocny rezim - tmavy screen skin pre A4 nahlady

Commit:

- `Darken screen A4 previews in night mode`

Problem:

- Globalny nocny rezim tmavil app shell, ale A4 nahlady v appke ostali biele.
- Na vecernu pracu a stage pouzitie to stale svietilo do oci.
- Realna papierova pravda a PDF vsak musia ostat biele.

Oprava:

- V `app-night` rezime su A4 nahlady v `.screen-surface` tmave iba vizualne na obrazovke.
- Pouziva sa ten isty `A4Page` renderer, bez zmeny rozmerov, fontov, stlpcov alebo layout flow.
- Tmavy skin meni len farbu papiera, textu a liniek na screen preview.
- Dedicated print surface a `@media print` su chranene ako biele A4 s tmavym textom.
- TXT/export/copy, parser, transpozicia, DB a print/PDF pipeline ostali bez zmeny.

Overene automaticky:

- `npm run release:check` presiel.
- Fixture testy hlasia: `Chord anchor fixtures passed: 13`.

Manualne este vhodne otestovat:

- Songs quick preview v nocnom rezime.
- Song detail, import/editor a setlist A4 nahlad v nocnom rezime.
- Performance A4 preview v nocnom rezime.
- Print/PDF ostava biele A4.

### Nocny rezim - kozmeticke zjednotenie tmaveho UI

Commit:

- `Polish dark UI surfaces`

Problem:

- Niektore screen toolbary a preview hlavicky v nocnom rezime stale posobili ako svetle pasy.
- Cast pomocnych textov bola prilis slaba alebo vizualne nesuladila so zvyskom tmaveho shellu.
- Tlacidla a stavove farby mali miestami zmiesany light/dark pocit.

Oprava:

- `bg-white/95` a podobne priesvitne svetle pasy v `app-night` rezime dostali tmavy screen-only override.
- Pomocne texty maju citatelnejsi, ale stale jemny kontrast.
- Primarne, sekundarne a tonovane tlacidla v nocnom rezime maju pokojnejsie tmave farby.
- Amber/sky/emerald/rose stavy uz nepadaju vsetky do jednej zltej farby.
- A4 screen preview zostava tmave v nocnom rezime.
- Print/PDF a `@media print` ostavaju biele A4.

Overene automaticky:

- `npm run release:check` presiel.
- Fixture testy hlasia: `Chord anchor fixtures passed: 13`.

Manualne este vhodne otestovat:

- Rychly A4 nahlad toolbar bez svetleho pasu.
- Songs, detail, import/editor a setlist v nocnom rezime.
- Performance view v nocnom rezime.
- Print/PDF ostava biele A4.

---

## Predchadzajuce zdroje historie

Pred vznikom tohto dennika sa historia prac drzala hlavne tu:

- Git historia commitov.
- `docs/NEXT_TASKS.md`
- `docs/T8-RC1-PLAN.md`
- `docs/INTERNY_MANUAL.md`
- `RC1_SIGNOFF.md`

Od tohto bodu je tento subor odporucane miesto pre ludsky citatelny prehlad oprav.
