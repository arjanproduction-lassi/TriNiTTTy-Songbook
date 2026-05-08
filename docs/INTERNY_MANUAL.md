# TriNiTTTy Songbook - interny manual pouzivania

## 1. Co je TriNiTTTy Songbook

TriNiTTTy Songbook je interna kapelova aplikacia na spravu piesni, akordov, setlistov, transpozicii a A4 nahladov pre skusky a koncertne pouzitie.

Zakladna filozofia aplikacie:

**A4 je pravda.**

To znamena, ze skladba sa pripravuje tak, aby bola citatelna, pouzitelna a tlacitelna ako A4 leadsheet s akordmi nad textom.

Aplikacia nie je DAW, notovy editor ani cloudovy system. Je to prakticky kapelovy songbook.

## 2. Zakladne pravidlo databazy

Databaza aplikacie je hlavny zdroj skladieb.

Databazovy subor ma priponu:

`.json`

Priklad:

`TriNiTTTy_BandDB_2026-05-08_v012.json`

Databazovy subor sluzi na import do aplikacie.

PDF subory sluzia iba na tlac, zdielanie alebo citanie mimo aplikacie.

Pravidlo:

- `.json` = import do aplikacie
- `.pdf` = tlac alebo zdielanie
- `.txt` = textovy export pre Word / Google Docs

## 3. Odporucany kapelovy workflow

### Kapelnik / admin

Kapelnik spravuje hlavnu databazu.

Postup:

1. Upravi skladby v aplikacii.
2. Skontroluje, ze vsetko sedi.
3. Exportuje databazu.
4. Ulozi databazu do kapeloveho priecinka na Google Disku alebo inom ulozisku.
5. Ostatnym oznami, ze je dostupna nova verzia.

Priklad spravy:

> Chlapci, je tam nova databaza v012. Importujte si ju pred skuskou.

### Clen kapely

Clen kapely si databazu neprepisuje podla seba ako master verziu.

Postup:

1. Stiahne alebo otvori aktualny databazovy `.json` subor.
2. V aplikacii pouzije import databazy.
3. Aplikacia pred importom vytvori zalohu.
4. Po importe ma aktualny songbook.

## 4. Verzie databazy

Kazdy export databazy vytvara novy verzovany subor.

Priklad:

`TriNiTTTy_BandDB_2026-05-08_v012.json`

Verzia databazy je dolezita, aby bolo jasne, kto ma aku verziu nacitanu.

V hlavicke aplikacie sa zobrazuje aktualna verzia databazy, napriklad:

`DB v012`

Pred skuskou je dobre skontrolovat, ci vsetci pouzivaju rovnaku verziu.

## 5. Odporucane usporiadanie Google Disku

Odporucany priecinok:

`TriNiTTTy SONGBOOK`

V nom napriklad:

```text
DATABASE
PDF
ARCHIV
```

Alebo jednoduchsie:

```text
TriNiTTTy SONGBOOK
- databazy JSON
- PDF exporty
- starsie verzie
```

## 6. Import databazy

Pri importe databazy aplikacia zobrazi:

- aktualnu verziu databazy,
- importovanu verziu,
- datum exportu,
- pocet skladieb,
- pocet setlistov.

Pred nahradenim aktualnej databazy sa automaticky vytvori zaloha.

Ak importujes starsiu verziu, aplikacia zobrazi varovanie.

Nikdy neimportuj databazu naslepo.

## 7. Export databazy

Export databazy vytvori novy subor s verziou.

Priklad:

`TriNiTTTy_BandDB_2026-05-08_v013.json`

Kazdy export je archivna verzia. Starsie exporty sa nemazu, pokial nie je iste, ze uz nie su potrebne.

## 8. Kapelovy zdroj databazy / remote URL

Aplikacia ma sekciu **Kapelovy zdroj databazy**.

Tato funkcia sluzi na kontrolovane nacitanie databazy z verejneho alebo priamo dostupneho internetoveho odkazu.

Do pola nemozno zadavat lokalnu cestu typu:

```text
F:\...
C:\...
```

Prehliadac/PWA z bezpecnostnych dovodov nemoze sam citat subory z disku pocitaca.

Spravna cesta musi byt internetova URL, napriklad:

`https://.../TriNiTTTy_BandDB_latest.json`

Bezny Google Drive share link nemusi fungovat ako priamy JSON zdroj. Pre plnu Google Drive integraciu bude neskor potrebne pouzit Google Drive API.

Zatial je najbezpecnejsi hotovy workflow:

**export databazy -> ulozit na Google Disk -> manualny import v aplikacii**

## 9. Google Drive integracia - buduci plan

Do buducna sa planuje moznost, aby pouzivatel/admin v aplikacii vybral konkretny Google Drive subor alebo priecinok.

Aplikacia by potom vedela:

- nacitat databazove JSON subory,
- automaticky najst najnovsiu verziu,
- ponuknut aj starsie verzie,
- zobrazit datum, verziu a pocty skladieb,
- pred importom vytvorit zalohu.

Toto zatial nie je hlavny pracovny workflow.

## 10. PDF export / tlac

### PC / notebook

Na PC je PDF export najvernejsia cesta.

Postup:

1. Otvor skladbu.
2. Klikni na **Tlacit / PDF**.
3. Otvori sa cisty A4 print rezim.
4. Klikni znovu **Tlacit / PDF**.
5. V systemovom okne vyber **Ulozit ako PDF**.
6. Po dokonceni sa vrat do aplikacie cez **Zavriet**.

Toto je referencna A4 pravda.

### Android / tablet / mobil

Na Androide funguje PDF cez systemovy tlacovy dialog zariadenia.

Postup:

1. Otvor skladbu.
2. Klikni **Tlacit / PDF**.
3. Zobrazi sa cisty A4 rezim.
4. Klikni znovu **Tlacit / PDF**.
5. V Android dialogu vyber ciel ulozenia.
6. Po dokonceni sa vrat do aplikacie cez **Zavriet**.

Ak chces PDF ulozit do tabletu, v Android dialogu vyber:

- **Subory**
- **Stiahnute**

Ak chces PDF ulozit do kapeloveho Google Drive priecinka, vyber Google Disk.

Android moze podla zariadenia alebo verzie systemu ponukat rozne moznosti ulozenia.

## 11. Zname obmedzenie PDF na Androide

Android pouziva vlastny systemovy print engine.

Preto sa spravanie moze lisit podla:

- vyrobcu tabletu,
- verzie Androidu,
- verzie Chrome,
- nastavenia Google Drive,
- systemoveho dialogu tlace.

Najvernejsia garantovana A4 PDF cesta je desktopovy Chrome/Edge na PC.

Android PDF je prakticky pouzitelna cesta, ale vysledne ulozenie suboru riadi system Androidu.

Toto nie je chyba skladby ani A4 renderera.

## 12. TXT export a kopirovanie do Wordu / Docs

Aplikacia vie exportovat skladbu ako cisty monospaced TXT.

Pouzitie:

- **Export TXT** ulozi textovy subor.
- **Kopirovat TXT** skopiruje rovnaky monospaced obsah do schranky.

Pri vlozeni do Wordu alebo Google Docs treba nastavit:

- font: `Courier New`
- velkost: `9 pt`

Potom akordy ostanu zarovnane nad textom.

Dolezite:

- TXT nie je Word dokument.
- TXT je cisty text.
- Zarovnanie drzi iba v monospace fonte.

## 13. Koncertny rezim

Koncertny rezim sluzi na hranie podla setlistu.

Dolezite pravidlo:

**Kazda skladba sa pri otvoreni v koncertnom rezime spusti v povodnej tonine.**

Ak jednu skladbu transponujes napriklad o `+3`, dalsia skladba tuto transpoziciu nezdedi.

Nova skladba = povodna tonina.

Transpozicia sa robi vedome iba na aktualnej skladbe.

## 14. Setlisty

Setlist sluzi na pripravu poradia skladieb na skusku alebo koncert.

Odporucanie:

1. Pred skuskou priprav setlist.
2. Skontroluj poradie.
3. Skontroluj toniny.
4. V koncertnom rezime sa pohybuj cez skladby podla setlistu.

## 15. Rychly A4 nahlad

V sekcii **Piesne** je rychly A4 nahlad vybranej skladby.

Na PC a tablete sluzi na rychlu kontrolu bez otvorenia celej skladby.

Na mobile je nahlad prisposobeny tak, aby bol dostupny hore a zoznam skladieb mal vlastne rolovanie.

## 16. Zalohy

Aplikacia vytvara zalohy pri dolezitych operaciach, najma:

- pred importom databazy,
- pred prepisom existujucej skladby.

Odporucanie:

- pred velkou upravou databazu exportuj,
- starsie verzie nemaz hned,
- pri pochybnosti obnov zalohu ako kopiu.

## 17. Odporucane pravidla pre kapelu

- Master databazu spravuje kapelnik/admin.
- Ostatni clenovia si databazu iba importuju.
- Pripomienky k akordom alebo textom sa posielaju adminovi.
- Pred skuskou si kazdy skontroluje aktualnu verziu DB.
- PDF subory sluzia na tlac.
- JSON subory sluzia na import do aplikacie.
- V koncertnom rezime sa transponuje iba vedome na aktualnej skladbe.

## 18. Co zatial nerobime

Zamerne sa zatial neriesi:

- realtime sync,
- ucty pouzivatelov,
- spolocne online editovanie,
- cloud server,
- automaticke merge konfliktov,
- notovy editor,
- DAW funkcie,
- velky komercny system.

Ciel je jednoduchy:

**spolahlivy kapelovy songbook, ktory funguje v skusobni aj na podiu.**

## 19. Buduci backlog

Mozne buduce rozsirenia:

- read-only concert mode,
- dark stage mode,
- jemne farebne zvyraznenie hlasov a cue poznamok,
- overflow warning pre dlhe riadky,
- Google Drive integracia cez vybrany priecinok alebo subor,
- lokalizacia,
- LassiLab Songbook branding,
- nativny PDF export mimo systemoveho print dialogu.

Tieto veci nie su aktualne nutne pre zakladnu pracovnu verziu.

## 20. Zakladne motto

Databaza je pravda pre appku.

A4 je pravda pre oci.

PDF je pravda pre tlac.

Kapelnik drzi poriadok.

Android ma vlastnu povahu.
