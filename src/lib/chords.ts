import type { Line, Notation, Song } from "../types";
import type { ChordAnchor } from "../types";
import { normalizePairLine, renderChordAnchors } from "./chordAnchors";

const CHORD_REGEX = /^(?:[A-H](?:#|b)?)(?:m(?!aj)|maj7|maj9|maj|min|sus2|sus4|dim|aug|add9|add11|add13|6|7|9|11|13|m6|m7|m9|m11|m13)?(?:\/[A-H](?:#|b)?)?$/;
const ROOT_REGEX = /^([A-H])([#b]?)([^/\s]*)(?:\/([A-H])([#b]?))?$/;
const PASS_TOKENS = new Set(["-", "/", "|", "||", "/:", ":/", "x", "2x", "4x", "8x"]);

const NOTESETS = {
  intlSharp: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
  intlFlat: ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"],
  deSharp: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "H"],
  deFlat: ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "B", "H"],
} as const;

export function normalizeKeyInput(key: string) {
  let cleaned = key.replace(/♯/g, "#").replace(/♭/g, "b").replace(/\s+/g, "").trim();
  while (cleaned.includes("mm")) cleaned = cleaned.replace(/mm/g, "m");
  return cleaned;
}

function parseRootToSemitone(root: string, source: "intl" | "de" = "intl") {
  const letter = root[0];
  const accidental = root.slice(1);
  if (letter === "H") return accidental === "b" ? 10 : accidental === "#" ? 0 : 11;
  if (letter === "B") {
    if (accidental === "b") return 10;
    if (accidental === "#") return 0;
    return source === "de" ? 10 : 11;
  }
  const naturals: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9 };
  const base = naturals[letter];
  if (base === undefined) return null;
  if (accidental === "#") return (base + 1) % 12;
  if (accidental === "b") return (base + 11) % 12;
  return base;
}

function formatSemitone(semitone: number, notation: Notation, preferFlat = false) {
  const i = ((semitone % 12) + 12) % 12;
  const set = notation === "de"
    ? preferFlat ? NOTESETS.deFlat : NOTESETS.deSharp
    : preferFlat ? NOTESETS.intlFlat : NOTESETS.intlSharp;
  return set[i];
}

function transposeRoot(root: string, steps: number, notation: Notation, preferFlat = false) {
  const semitone = parseRootToSemitone(root, "intl");
  return semitone === null ? root : formatSemitone(semitone + steps, notation, preferFlat);
}

export function transposeChordToken(token: string, steps: number, notation: Notation) {
  if (PASS_TOKENS.has(token)) return token;
  const m = token.match(ROOT_REGEX);
  if (!m) return token;

  const [, rootL, rootA = "", suffix = "", bassL, bassA = ""] = m;
  const root = `${rootL}${rootA}`;
  const bass = bassL ? `${bassL}${bassA}` : "";
  const preferFlat = rootA === "b" || bassA === "b" || /(^|\/)(Bb|Eb|Ab|Db|Gb)/.test(token);
  const nextRoot = transposeRoot(root, steps, notation, preferFlat);
  const nextBass = bass ? transposeRoot(bass, steps, notation, preferFlat) : "";

  return `${nextRoot}${suffix}${nextBass ? `/${nextBass}` : ""}`;
}

export function transposeChordLine(text: string, steps: number, notation: Notation) {
  return (text.match(/[^\s]+|\s+/g) || [])
    .map((token) => (/^\s+$/.test(token) ? token : transposeChordToken(token, steps, notation)))
    .join("");
}

export function transposeChordAnchors(anchors: readonly ChordAnchor[], steps: number, notation: Notation): ChordAnchor[] {
  return anchors.map((anchor) => ({ ...anchor, chord: transposeChordToken(anchor.chord, steps, notation) }));
}

export function renderTransposedAnchors(anchors: readonly ChordAnchor[], steps: number, notation: Notation) {
  return renderChordAnchors(transposeChordAnchors(anchors, steps, notation));
}

export function isChordToken(token: string) {
  return PASS_TOKENS.has(token) || CHORD_REGEX.test(token);
}

export function isChordLikeLine(text: string) {
  const trimmed = text.trim();
  if (!trimmed || (trimmed.startsWith("[") && trimmed.endsWith("]"))) return false;
  if (/^(cue:|poznámka:|note:)/i.test(trimmed)) return false;
  return trimmed.split(/\s+/).filter(Boolean).every(isChordToken);
}

export function transposeSong(song: Song, steps: number, notation: Notation): Song {
  const transposeLine = (line: Line): Line => {
    if (line.type === "pair") {
      const normalized = normalizePairLine(line);
      const chordAnchors = transposeChordAnchors(normalized.chordAnchors, steps, notation);
      return { ...normalized, chordAnchors, chords: renderChordAnchors(chordAnchors) };
    }
    if (line.type === "chords" || line.type === "repeat") return { ...line, text: transposeChordLine(line.text, steps, notation) };
    return line;
  };

  return {
    ...song,
    key: transposeChordToken(normalizeKeyInput(song.key), steps, notation),
    lines: song.lines.map(transposeLine),
  };
}
