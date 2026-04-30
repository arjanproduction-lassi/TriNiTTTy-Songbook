import type { ImportDraft, Line, SectionGroup, Song } from "../types";
import { makePairLine, pairChordLine } from "./chordAnchors";
import { isChordLikeLine, normalizeKeyInput } from "./chords";

export function normalizeSongTitle(title: string) {
  return title.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
}

export function cleanImportText(text: string) {
  const normalized = text
    .replace(/\u00A0/g, " ")
    .replace(/♯/g, "#")
    .replace(/♭/g, "b")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r/g, "")
    .replace(/\t/g, "    ");

  return normalized
    .split("\n")
    .map((raw) => {
      const trimmedRight = raw.replace(/[ \t]+$/g, "");
      const sectionMatch = trimmedRight.match(/^\s*\[(.*?)\]\s*$/);
      if (sectionMatch) return `[${sectionMatch[1].replace(/\s+/g, " ").trim()}]`;
      if (/^\s*(cue:|poznámka:|note:)\s*/i.test(trimmedRight)) {
        return trimmedRight.replace(/^\s*(cue:|poznámka:|note:)\s*/i, "cue: ");
      }
      return trimmedRight;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isSection(text: string) {
  return text.startsWith("[") && text.endsWith("]");
}

function isCue(text: string) {
  return /^(cue:|poznámka:|note:)/i.test(text);
}

export function parseImportText(text: string): Line[] {
  const rows = text.replace(/\r/g, "").split("\n");
  const out: Line[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const line = rows[i].replace(/\t/g, "    ").trimEnd();
    const trimmed = line.trim();

    if (!trimmed) out.push({ type: "space" });
    else if (isSection(trimmed)) out.push({ type: "section", text: trimmed.slice(1, -1) });
    else if (trimmed.startsWith("/:") && trimmed.includes(":/")) out.push({ type: "repeat", text: line });
    else if (isCue(trimmed)) out.push({ type: "cue", text: line });
    else if (isChordLikeLine(trimmed)) {
      const next = (rows[i + 1] ?? "").replace(/\t/g, "    ").trimEnd();
      const nextTrim = next.trim();
      const canPair = nextTrim && !isSection(nextTrim) && !nextTrim.startsWith("/:") && !isCue(nextTrim) && !isChordLikeLine(nextTrim);
      if (canPair) {
        out.push(makePairLine(line, next));
        i += 1;
      } else {
        out.push({ type: "chords", text: line });
      }
    } else {
      out.push({ type: "lyrics", text: line });
    }
  }

  return out;
}

export function serializeLines(lines: Line[]) {
  return lines
    .map((line) => {
      if (line.type === "section") return `[${line.text}]`;
      if (line.type === "pair") return `${pairChordLine(line)}\n${line.lyrics}`;
      if (line.type === "space") return "";
      return line.text;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildSections(lines: Line[]): SectionGroup[] {
  const sections: SectionGroup[] = [];
  let current: SectionGroup = { id: "section-0", title: "Bez sekcie", implicit: true, blocks: [] };
  let counter = 1;

  lines.forEach((line, index) => {
    if (line.type === "section") {
      if (current.blocks.length || !current.implicit) sections.push(current);
      current = { id: `section-${counter++}`, title: line.text, blocks: [] };
    } else {
      current.blocks.push({ index, line });
    }
  });

  if (current.blocks.length || !current.implicit) sections.push(current);
  return sections.length ? sections : [current];
}

export function deriveTitle(text: string) {
  const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const title = lines.find((line) => !isSection(line) && !isChordLikeLine(line) && !line.startsWith("/:") && !/^cue:/i.test(line));
  return title ? title.slice(0, 60) : "Nová pieseň";
}

export function makeSong(draft: ImportDraft, lines: Line[], id: number): Song {
  return {
    id,
    title: normalizeSongTitle(draft.title || deriveTitle(draft.rawText)),
    artist: draft.artist || "TriNiTTTy",
    bpm: Number(draft.bpm) || 80,
    key: normalizeKeyInput(draft.key || "Am"),
    duration: draft.duration || "0:00",
    capo: draft.capo || "-",
    lines,
  };
}

export function convertLine(line: Line, nextType: Line["type"]): Line {
  const fallbackText = line.type === "pair" ? line.lyrics || pairChordLine(line) : line.type === "space" ? "" : line.text;
  if (nextType === "space") return { type: "space" };
  if (nextType === "section") return { type: "section", text: fallbackText || "Nová sekcia" };
  if (nextType === "pair") {
    const chords = line.type === "pair" ? pairChordLine(line) : line.type === "chords" ? line.text : "";
    const lyrics = line.type === "pair" ? line.lyrics : line.type === "lyrics" ? line.text : fallbackText;
    return makePairLine(chords, lyrics);
  }
  if (nextType === "cue") return { type: "cue", text: line.type === "cue" ? line.text : `cue: ${fallbackText}`.trim() };
  if (nextType === "repeat") return { type: "repeat", text: line.type === "repeat" ? line.text : "/: :/ 4x" };
  if (nextType === "chords") return { type: "chords", text: line.type === "pair" ? pairChordLine(line) : fallbackText };
  return { type: "lyrics", text: line.type === "pair" ? line.lyrics : fallbackText };
}

export function importDiagnostics(lines: Line[]) {
  const counts = lines.reduce<Record<Line["type"], number>>((acc, line) => {
    acc[line.type] += 1;
    return acc;
  }, { section: 0, chords: 0, lyrics: 0, cue: 0, repeat: 0, pair: 0, space: 0 });

  return {
    counts,
    total: lines.length,
    sections: buildSections(lines).filter((section) => !section.implicit).length,
    chordRows: counts.chords + counts.pair,
  };
}
