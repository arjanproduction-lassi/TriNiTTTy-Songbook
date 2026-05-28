import type { Line, Song } from "../types";
import { buildSections, normalizeSongTitle } from "./import";
import { normalizeKeyInput } from "./chords";
import { pairChordLine } from "./chordAnchors";

function songMetadataParts(song: Song) {
  return [
    song.artist ? `Interpret: ${song.artist}` : "",
    song.key ? `Tónina: ${normalizeKeyInput(song.key)}` : "",
    Number.isFinite(song.bpm) ? `BPM: ${song.bpm}` : "",
    song.timeSignature?.trim() ? `Takt: ${song.timeSignature.trim()}` : "",
    song.duration ? `Dĺžka: ${song.duration}` : "",
  ].filter(Boolean);
}

function lineToText(line: Line) {
  if (line.type === "pair") return [pairChordLine(line), line.lyrics].filter(Boolean).join("\n");
  if (line.type === "space") return "";
  if (line.type === "section") return `[${line.text}]`;
  return line.text;
}

export function songToClipboardText(song: Song) {
  return songToMonospaceText(song);
}

export function songToMonospaceText(song: Song) {
  const header = [
    normalizeSongTitle(song.title),
    songMetadataParts(song).join(" | "),
  ];

  return [...header, "", ...songBodyLines(song)].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function songBodyLines(song: Song) {
  const body = buildSections(song.lines).flatMap((section) => [
    section.implicit ? "" : `[${section.title}]`,
    ...section.blocks.map(({ line }) => lineToText(line)),
  ]);
  return body;
}

export function downloadSongText(song: Song) {
  const blob = new Blob([`\uFEFF${songToMonospaceText(song)}`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const parts = [
    normalizeSongTitle(song.title),
    song.artist,
    normalizeKeyInput(song.key),
  ].map(sanitizeFilenamePart).filter(Boolean);

  link.href = url;
  link.download = `${parts.length ? parts.join(" - ") : "LassiLAB Songbook"}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sanitizeFilenamePart(value: string) {
  return value
    .replace(/[<>:"/\\|?*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
