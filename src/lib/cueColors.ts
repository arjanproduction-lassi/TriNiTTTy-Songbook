import type { CSSProperties } from "react";
import type { CueColorId, Line } from "../types";

export type CueColorOption = {
  id: CueColorId;
  label: string;
  description: string;
  swatch: string;
};

export const CUE_COLOR_OPTIONS: CueColorOption[] = [
  { id: "male", label: "Muž", description: "Mužský spev", swatch: "#2563eb" },
  { id: "female", label: "Žena", description: "Ženský spev", swatch: "#dc2626" },
  { id: "duet", label: "Duet", description: "Spoločný spev", swatch: "#16a34a" },
  { id: "solo", label: "Sólo", description: "Sólo / medzihra", swatch: "#ca8a04" },
  { id: "choir", label: "Zbor", description: "Zbor / viac hlasov", swatch: "#0d9488" },
  { id: "cue", label: "Nástup", description: "Nástup / cue", swatch: "#7c3aed" },
  { id: "stop", label: "Stop", description: "Stop / pozor", swatch: "#db2777" },
  { id: "spoken", label: "Hovorené", description: "Hovorené slovo", swatch: "#0891b2" },
  { id: "neutral", label: "Neutral", description: "Neutrálna cue farba", swatch: "#52525b" },
];

const CUE_COLOR_IDS = new Set<CueColorId>(CUE_COLOR_OPTIONS.map((option) => option.id));

export function normalizeCueColorId(value: unknown): CueColorId | undefined {
  return typeof value === "string" && CUE_COLOR_IDS.has(value as CueColorId) ? value as CueColorId : undefined;
}

export function lineCueColorId(line: Line): CueColorId | undefined {
  return line.type === "space" ? undefined : line.cueColorId;
}

export function hasCueColors(lines: readonly Line[]) {
  return lines.some((line) => Boolean(lineCueColorId(line)));
}

export function setLineCueColor(line: Line, cueColorId: CueColorId | ""): Line {
  if (line.type === "space") return line;
  if (!cueColorId) {
    const next = { ...line };
    delete next.cueColorId;
    return next;
  }
  return { ...line, cueColorId };
}

export function copyCueColor<T extends Line>(source: Line, target: T): T {
  const cueColorId = lineCueColorId(source);
  return cueColorId ? { ...target, cueColorId } : target;
}

export function cueColorStyle(cueColorId: CueColorId | undefined): CSSProperties | undefined {
  if (!cueColorId) return undefined;
  return { "--a4-cue-color": `var(--cue-${cueColorId})` } as CSSProperties;
}

export function cueColorClassName(cueColorId: CueColorId | undefined) {
  return cueColorId ? "a4-cue-color" : "";
}

export function cueColorLabel(cueColorId: CueColorId | undefined) {
  return CUE_COLOR_OPTIONS.find((option) => option.id === cueColorId)?.label ?? "Bez farby";
}
