import type { ImportDraft } from "../types";

export const DEFAULT_IMPORT_TEXT = `[Intro]
Am Em Am

[Verse 1]
Am                 Em
Na Kráľovej holi stojí strom zelený,
G                  D
na Kráľovej holi stojí strom zelený,
C               G
vrch má naklonený, vrch má naklonený,
Am              Em Am
vrch má naklonený do slovenskej zemi.

[Verse 2]
Am                 Em
Odkážte vy vetry, odkázajte svetu,
G                  D
odkážte vy vetry, odkázajte svetu,
C               G
že sa moja milá, že sa moja milá,
Am              Em Am
že sa moja milá po mne nerozsmúti.

[End]`;

export const DEFAULT_DRAFT: ImportDraft = {
  title: "Na Kráľovej holi",
  artist: "Slovenská ľudová",
  bpm: "80",
  key: "Am",
  timeSignature: "4/4",
  duration: "0:00",
  capo: "-",
  rawText: DEFAULT_IMPORT_TEXT,
};

export const EMPTY_SONG_DRAFT: ImportDraft = {
  title: "",
  artist: "",
  bpm: "",
  key: "",
  timeSignature: "",
  duration: "0:00",
  capo: "-",
  rawText: "",
};
