import type { ChordAnchor, PairLine } from "../types";

function stableAnchorId(index: number, col: number, chord: string) {
  return `${index}-${col}-${chord}`;
}

export function parseChordAnchors(chordLine: string): ChordAnchor[] {
  const anchors: ChordAnchor[] = [];
  const matches = chordLine.matchAll(/\S+/g);

  for (const match of matches) {
    const chord = match[0];
    const col = match.index ?? 0;
    anchors.push({ id: stableAnchorId(anchors.length, col, chord), chord, col });
  }

  return anchors;
}

export function renderChordAnchors(anchors: readonly ChordAnchor[]) {
  const ordered = [...anchors].sort((a, b) => a.col - b.col);
  let out = "";
  let cursor = 0;

  ordered.forEach((anchor, index) => {
    const minCol = index === 0 ? 0 : cursor + 2;
    const col = Math.max(anchor.col, minCol);
    if (col > out.length) out += " ".repeat(col - out.length);
    out += anchor.chord;
    cursor = col + anchor.chord.length - 1;
  });

  return out;
}

export function normalizeChordAnchors(value: unknown): ChordAnchor[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const source = item as Partial<ChordAnchor>;
    if (typeof source.chord !== "string" || typeof source.col !== "number" || !Number.isFinite(source.col)) return [];
    const col = Math.max(0, Math.floor(source.col));
    return [{
      id: typeof source.id === "string" && source.id ? source.id : stableAnchorId(index, col, source.chord),
      chord: source.chord,
      col,
    }];
  });
}

export function makePairLine(chords: string, lyrics: string): PairLine {
  const chordAnchors = parseChordAnchors(chords);
  return {
    type: "pair",
    chords: renderChordAnchors(chordAnchors),
    lyrics,
    chordAnchors,
  };
}

export function normalizePairLine(line: PairLine): PairLine {
  const chordAnchors = line.chordAnchors?.length ? line.chordAnchors : parseChordAnchors(line.chords);
  return {
    type: "pair",
    chords: renderChordAnchors(chordAnchors),
    lyrics: line.lyrics,
    chordAnchors,
  };
}

export function pairChordLine(line: PairLine) {
  return line.chordAnchors?.length ? renderChordAnchors(line.chordAnchors) : line.chords;
}

export function withPairChords(line: PairLine, chords: string) {
  return makePairLine(chords, line.lyrics);
}

export function withPairLyrics(line: PairLine, lyrics: string): PairLine {
  const normalized = normalizePairLine(line);
  return { ...normalized, lyrics };
}
