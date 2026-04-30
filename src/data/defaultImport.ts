import type { ImportDraft } from "../types";

export const DEFAULT_IMPORT_TEXT = `[Intro]
D#m

[Verse 1]
D#m
Peniaze neklamú. Oni to nevedia.
Otázky nekladú, oči ti zalepia.

[Verse 2]
D#m
Z vrecák čistých ľudí po chrbtoch šplhajú,
F#                     G#
tam kde ich netreba pod nohy padajú.

[Pre-Chorus]
D#m
Kam tečú tie prúdy, tam pravdu hľadať treba.
F#
Kam tečú tie prúdy, tam - hľadať - Pravdu Treba
cue: Tam... - Tečú…

[Chorus]
C#                     D#m
Z vrecák čistých ľudí. Prúdy riek. Tečú…

[End]`;

export const DEFAULT_DRAFT: ImportDraft = {
  title: "Peniaze neklamú",
  artist: "TriNiTTTy",
  bpm: "86",
  key: "D#m",
  duration: "6:18",
  capo: "-",
  rawText: DEFAULT_IMPORT_TEXT,
};
