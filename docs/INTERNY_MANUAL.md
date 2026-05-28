# LassiLAB Songbook - interny manual pouzivania

## 1. Co je LassiLAB Songbook

LassiLAB Songbook je lokalna kapelova aplikacia na spravu piesni, akordov, setlistov, transpozicii, A4 nahladov a koncertne citanie.

Default projekt/kapela je `TriNiTTTy`, ale nazov projektu sa da zmenit v aplikacii.

Zakladna filozofia:

**A4 je pravda.**

Skladba sa pripravuje tak, aby bola citatelna, pouzitelna a tlacitelna ako A4 leadsheet s akordmi nad textom.

Aplikacia nie je DAW, notovy editor ani cloudovy system. Je to prakticky offline songbook pre muzikantov.

## 2. Co je zdroj pravdy

V aplikacii platia tri jednoduche pravdy:

- Databaza je pravda pre appku.
- A4 je pravda pre oci.
- PDF je pravda pre tlac.

Hlavna databaza aplikacie je JSON subor.

Priklad:

```text
DBv047_TriNiTTTy_2026-05-28.json
```

PDF a TXT su vystupy. Nesluzia ako hlavne ulozisko appky.

## 3. Instalacia / spustenie

Odporucany sposob pre testerov a clenov kapely:

1. Otvor HTTPS adresu aplikacie v Chrome alebo Edge.
2. V prehliadaci pouzi `Install app` alebo `Add to Home screen`.
3. Spusti nainstalovanu PWA.
4. Importuj aktualnu JSON databazu.

Na Android tablete/mobile:

1. Otvor appku v Chrome.
2. Pouzi `Instalovat aplikaciu` alebo `Pridat na plochu`.
3. Spusti appku z plochy.

Na PC/notebooku:

1. Otvor appku v Chrome alebo Edge.
2. Pouzi instalacnu ikonu v adresnom riadku alebo menu prehliadaca.
3. Spusti appku ako PWA.

## 4. Nazov projektu / kapely

Nazov projektu najdes tu:

```text
Piesne -> PWA / lokalna databaza -> Nazov projektu / kapely
```

Default:

```text
TriNiTTTy
```

Mozes ho zmenit napriklad na:

```text
Jano Band
Lucie revival
Solo projekt
```

Pouziva sa:

- v hlavicke appky,
- v nazvoch exportov databazy.

Nastavenie je lokalne pre konkretne zariadenie.

## 5. Odporucany kapelovy workflow

### Kapelnik / admin

Kapelnik spravuje master databazu.

Postup:

1. Upravi skladby v aplikacii.
2. Skontroluje A4 pravdu.
3. Exportuje databazu.
4. Ulozi JSON databazu do kapeloveho priecinka, napriklad na Google Drive.
5. Ostatnym oznami cislo verzie.

Priklad spravy:

```text
Je tam nova databaza DB v047. Importujte si ju pred skuskou.
```

### Clen kapely

Clen kapely databazu neupravuje ako master verziu.

Postup:

1. Stiahne alebo otvori aktualny `.json` subor.
2. V appke pouzije import databazy.
3. Appka pred importom vytvori zalohu.
4. Po importe ma aktualny songbook pre svoje zariadenie.

## 6. Verzie databazy

Databaza ma vlastne cislo verzie, napriklad:

```text
DB v047
```

Export oficialnej databazy po realnych zmenach zvysi verziu.

Stiahnutie cistej kopie databazy verziu nezvysi.

Import zachova verziu z importovaneho JSON suboru.

Dolezite:

- `Bez lokalnych zmien` znamena iba to, ze toto zariadenie nema nerozrobene lokalne upravy.
- Neznamena to automaticky, ze zariadenie ma najnovsiu oficialnu kapelovu databazu.
- Oficialnu verziu treba zatial overit rucne podla cisla DB alebo cez kapelovy zdroj, ak je nastaveny.

## 7. Import databazy

Pri importe appka zobrazi:

- aktualnu verziu,
- importovanu verziu,
- datum exportu,
- pocet skladieb,
- pocet setlistov.

Pred nahradenim aktualnej databazy sa vytvori zaloha.

Ak importujes starsiu databazu, appka zobrazi varovanie.

Nikdy neimportuj databazu naslepo.

## 8. Export databazy

Export databazy vytvori verzovany JSON subor.

Priklad:

```text
DBv047_TriNiTTTy_2026-05-28.json
```

Ak zmenis nazov projektu, zmeni sa aj stred nazvu suboru:

```text
DBv047_Jano_Band_2026-05-28.json
```

JSON je urceny na import do aplikacie.

## 9. Kapelovy zdroj databazy

Sekcia `Kapelovy zdroj databazy` sluzi na kontrolovane nacitanie databazy z URL.

Toto nie je realtime sync.

Appka vie:

- ulozit URL zdroja,
- skontrolovat vzdialenu databazu,
- porovnat metadata/verziu,
- upozornit na novsiu alebo starsiu verziu,
- importovat az po potvrdeni,
- vytvorit zalohu pred importom.

Do pola nepatri lokalna cesta:

```text
F:\...
C:\...
```

Prehliadac/PWA nemoze sam citat subory z disku pocitaca.

Bezny Google Drive share link nemusi fungovat ako priamy JSON zdroj. Plna Google Drive integracia je buduci plan.

## 10. Google Drive dnes

Najbezpecnejsi aktualny workflow:

```text
export databazy -> ulozit na Google Drive -> clenovia manualne importuju JSON
```

Google Drive zatial sluzi hlavne ako miesto, kam kapela odlozi JSON databazu a PDF exporty.

## 11. PDF / tlac

### PC / notebook

1. Otvor skladbu.
2. Klikni `Tlacit / PDF`.
3. Otvori sa cisty A4 print rezim.
4. Klikni znovu `Tlacit / PDF`.
5. V systemovom okne vyber `Ulozit ako PDF`.
6. Po dokonceni sa vrat cez `Zavriet`.

### Android / tablet / mobil

1. Otvor skladbu.
2. Klikni `Tlacit / PDF`.
3. Zobrazi sa cisty A4 rezim.
4. Klikni znovu `Tlacit / PDF`.
5. V Android dialogu vyber ciel ulozenia.

Ak chces ulozit PDF do tabletu, v Android dialogu vyber:

- `Subory`,
- `Stiahnute`.

Ak chces ulozit PDF na Google Drive, vyber Google Disk.

Android moze ponukat rozne moznosti podla zariadenia, verzie Androidu a nastavenia Drive.

## 12. A4 overflow warning

Ak skladba presahuje A4, appka zobrazi warning:

```text
Skladba presahuje A4. Spodne riadky sa mozu pri tlaci/PDF odrezat.
```

Appka obsah automaticky nezmensuje, neprepisuje ani nestranka.

Pouzivatel ma obsah upravit tak, aby A4 pravda sedela.

## 13. TXT export a Word / Docs

Appka vie exportovat skladbu ako cisty monospaced TXT.

Pouzitie:

- `Kopirovat TXT` skopiruje cisty text do schranky.
- `Export TXT` stiahne `.txt` subor.

Pre Word alebo Google Docs nastav:

```text
Courier New, 9 pt
```

TXT nie je Word dokument. Zarovnanie akordov drzi iba v monospace fonte.

## 14. Setlisty

Setlist sluzi na pripravu poradia skladieb.

Odporucanie:

1. Pred skuskou priprav setlist.
2. Skontroluj poradie.
3. Skontroluj toniny.
4. V koncertnom rezime citaj skladby podla setlistu.

Skladba moze byt vo viacerych setlistoch.

V kniznici su setlistove chipy klikatelne a vedia otvorit prislusny setlist.

## 15. Koncertny rezim

Koncertny rezim sluzi na hranie/citanie podla setlistu.

Dolezite:

- Kazda skladba sa pri prepnutii v koncertnom rezime spusti s transpoziciou `0`.
- Transpozicia sa robi vedome iba na aktualnej skladbe.
- Transpozicia jednej skladby sa neprenasa na dalsiu skladbu.
- Default reader zoom je `115 %`.

## 16. Nocny / denny rezim

Nocny rezim je screen-only pomocnik pre vecernu pracu a podiu.

Pravidla:

- app shell a A4 nahlady na obrazovke mozu byt tmave,
- print/PDF ostava biele A4,
- A4 geometria, fonty, stlpce a layout sa nemenia,
- tlacidlo vzdy ukazuje akciu: `Nocny rezim` alebo `Denny rezim`.

Setlist aj koncertny rezim pouzivaju rovnaky globalny screen night mode.

## 17. Zalohy

Appka vytvara zalohy najma:

- pred importom databazy,
- pred prepisom existujucej skladby,
- pri bezpecnych restore/copy workflowoch.

Odporucanie:

- pred velkou upravou exportuj databazu,
- starsie exporty nemaz hned,
- pri pochybnosti obnov zalohu ako kopiu.

## 18. Co zatial nerobime

Zamerne sa zatial neriesi:

- realtime sync,
- ucty pouzivatelov,
- spolocne online editovanie,
- cloud server,
- automaticke merge konfliktov,
- notovy editor,
- DAW funkcie,
- APK/desktop wrapper ako hlavny distribucny model.

## 19. Buduci backlog

Mozne buduce rozsirenia:

- read-only concert mode,
- Google Drive integracia cez vybrany subor/priecinok,
- lepsia kontrola oficialnej kapelovej databazy,
- jemne farebne zvyraznenie hlasov a cue poznamok,
- setlist package export/import,
- nativny PDF export mimo systemoveho print dialogu,
- lokalizacia.

## 20. Motto

Databaza je pravda pre appku.

A4 je pravda pre oci.

PDF je pravda pre tlac.

Kapelnik drzi poriadok.

Android ma vlastnu povahu.
