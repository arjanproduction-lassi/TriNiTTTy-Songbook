import type { Line, Song } from "../types";
import { buildSections, normalizeSongTitle } from "./import";
import { normalizeKeyInput } from "./chords";
import { pairChordLine } from "./chordAnchors";

function lineToText(line: Line) {
  if (line.type === "pair") return [pairChordLine(line), line.lyrics].filter(Boolean).join("\n");
  if (line.type === "space") return "";
  if (line.type === "section") return `[${line.text}]`;
  return line.text;
}

export function songToWordText(song: Song) {
  const header = [
    `${normalizeSongTitle(song.title)} - ${song.artist}`,
    `BPM ${song.bpm} | ${normalizeKeyInput(song.key)} | Capo ${song.capo || "-"} | ${song.duration}`,
  ];
  const body = buildSections(song.lines).flatMap((section) => [
    section.implicit ? "" : `[${section.title}]`,
    ...section.blocks.map(({ line }) => lineToText(line)),
  ]);

  return [...header, "", ...body].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(area);
  return ok;
}
