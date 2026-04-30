import type { Song } from "../types";
import { DEFAULT_DRAFT, DEFAULT_IMPORT_TEXT } from "./defaultImport";
import { makePairLine } from "../lib/chordAnchors";
import { makeSong, parseImportText } from "../lib/import";

export const INITIAL_SONGS: Song[] = [
  makeSong(DEFAULT_DRAFT, parseImportText(DEFAULT_IMPORT_TEXT), 1),
  {
    id: 2,
    title: "Človečina",
    artist: "TriNiTTTy",
    bpm: 74,
    key: "Em",
    duration: "4:02",
    capo: "-",
    lines: [
      { type: "section", text: "Verse 1" },
      makePairLine("Em      C", "Kam stratila sa nám človečina"),
      makePairLine("G       D", "V uliciach nemôžem ju nájsť"),
      { type: "space" },
      { type: "section", text: "Chorus" },
      makePairLine("C        G", "Podaj mi ruku, nech ešte nezablúdim"),
      makePairLine("D        Em", "kým ticho v nás celkom nezaspí"),
    ],
  },
  {
    id: 3,
    title: "Stíchol som / bolesť otcov",
    artist: "TriNiTTTy",
    bpm: 170,
    key: "Gm",
    duration: "0:00",
    capo: "-",
    lines: [
      { type: "section", text: "Intro" },
      { type: "chords", text: "Gm A# F Gm   Gm A# F Gm" },
      { type: "space" },
      { type: "section", text: "Verse 1" },
      makePairLine("Gm               A#", "Stíchol som… Už neverím…"),
      makePairLine("F                        Gm", "Už netúžim … Nosiť tento boj.…Váš..…"),
    ],
  },
];
