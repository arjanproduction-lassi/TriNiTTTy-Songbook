# LassiLAB Songbook - používateľský manuál

Krátky praktický manuál pre testerov a muzikantov. LassiLAB Songbook je lokálna PWA appka na piesne, akordy, A4 náhľady, setlisty a koncertné čítanie.

Základné pravidlo:

**A4 je pravda pre papier. Appka je pracovný songbook.**

---

## Rýchly štart

1. Otvor appku.
2. Pozri si demo skladbu.
3. Otvor skladbu a skús A4 náhľad.
4. Skús transpozíciu.
5. Vytvor vlastnú skladbu cez Import alebo Pridať skladbu.
6. Po úpravách exportuj databázu ako JSON súbor.

---

## Knižnica piesní

- Vyhľadávanie filtruje názov, interpreta a obsah skladby.
- Tlačidlo Otvoriť zobrazí detail skladby.
- Tlačidlo Upraviť otvorí editor skladby.
- Setlist chipy pri skladbe slúžia na rýchly prechod do setlistu.
- Ikona 📝 znamená, že skladba má poznámku.

---

## Editor skladby

- Vyplň názov, interpreta, BPM, tóninu, takt a dĺžku.
- Bloky môžu byť `section`, `chords`, `lyrics`, `pair`, `repeat` alebo `cue` podľa existujúcej logiky appky.
- A4 master preview slúži ako kontrola papierového leadsheetu.
- Uloženie skladby zmení lokálnu databázu v tomto zariadení.

---

## Poznámky ku skladbe

- Poznámka je jednoduchý text ku konkrétnej skladbe.
- Keď existuje, v knižnici svieti 📝.
- Po vybavení poznámku zmaž.
- Poznámky nie sú task manager: nemajú priority, termíny, históriu ani checklisty.

---

## Setlisty

- Vytvor setlist, pomenuj ho a pridaj skladby z knižnice.
- Skontroluj poradie skladieb.
- Otvor skladbu v setlist náhľade.
- Setlist slúži na skúšobňu aj prípravu koncertného poradia.

---

## Koncertný režim

- Koncertný režim je určený na hranie a čítanie, nie na editáciu.
- Použi späť/ďalšia na prechod skladbami.
- Transpozícia platí pre aktuálne zobrazenú skladbu.
- Reader zoom si nastav podľa zariadenia.
- Nočný režim zníži svietenie displeja.
- Nezhasínať displej zapne Wake Lock tam, kde ho prehliadač podporuje.

---

## A4 / tlač / PDF

- A4 preview je kontrolný papierový náhľad.
- Print/PDF ostáva biela A4 pravda aj v nočnom režime.
- Varovanie pri presahu A4 znamená, že sa skladba môže nezmestiť na jednu stranu.
- Nočný režim je iba obrazovka, nie tlač.

---

## TXT export / copy

- Export TXT a Kopírovať TXT sú čistý monospaced text pre Word alebo Google Docs.
- Pre zachovanie akordov použi Courier New veľkosť 9 pt.
- TXT nie je Word dokument, je to čistý text.

---

## Databáza

- Appka ukladá dáta lokálne v zariadení.
- Export databázy vytvorí JSON súbor.
- Import databázy načíta JSON databázu.
- Pred importom appka používa existujúcu bezpečnostnú logiku záloh.
- Najvyššie DBv číslo je prakticky najnovšia verzia.
- Medzi zariadeniami je zatiaľ manuálny export/import.

### Pracovný DB priečinok

- Pracovný DB priečinok je voliteľná pomôcka pre ručný export/import databázy.
- Môže to byť Google Drive for Desktop, OneDrive, Dropbox, USB alebo obyčajný lokálny priečinok.
- Appka si pamätá priečinok v tomto prehliadači, ak to prehliadač dovolí.
- Nie je to cloud sync: appka nič sama neimportuje ani neexportuje na pozadí.
- Synchronizáciu Google Drive/OneDrive/Dropbox rieši operačný systém alebo ich desktopová aplikácia, nie LassiLAB Songbook.
- Ak prehliadač túto funkciu nepodporuje, použi klasický export/import JSON súboru.

### Google Drive DB zdroj

- Google Drive DB zdroj je voliteľné ručné načítanie jedného oficiálneho JSON súboru.
- Nie je to sync: appka Drive kontroluje iba po kliknutí na `Skontrolovať DB z Google Drive`.
- Admin stále robí normálne verzované exporty `DBv###_Projekt_YYYY-MM-DD.json` ako archív.
- Pre členov kapely môže admin udržiavať stabilnú latest kópiu, napríklad `TriNiTTTy_latest.json`.
- Súbor `latest` obsahuje normálnu databázu s `databaseVersion` vo vnútri.
- Ak Drive ukáže novšiu DB, appka importuje až po potvrdení a pred importom vytvorí zálohu.
- Ak Drive zlyhá, použi klasický export/import alebo pracovný DB priečinok.

---

## PWA inštalácia

- PC Chrome/Edge: použi Install app v prehliadači.
- Android Chrome: použi Add to Home screen alebo Install app.
- iPad/iPhone Safari: Share → Add to Home Screen.
- Prvé načítanie potrebuje internet.
- Offline správanie závisí od PWA cache a prehliadača.

---

## Bezpečnostné pravidlo

- Ostrú databázu pravidelne exportuj.
- Public demo dáta nie sú tvoja osobná databáza.
- Súkromné DB exporty necommituj do repozitára.
- Reálna pracovná databáza patrí do manuálneho importu, nie do verejného buildu appky.
