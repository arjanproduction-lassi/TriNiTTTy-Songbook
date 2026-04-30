import type { ReactNode } from "react";

export type Line =
  | { type: "section"; text: string }
  | { type: "chords"; text: string }
  | { type: "lyrics"; text: string }
  | { type: "cue"; text: string }
  | { type: "repeat"; text: string }
  | { type: "pair"; chords: string; lyrics: string }
  | { type: "space" };

export type Song = {
  id: number;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  duration: string;
  capo: string;
  lines: Line[];
};

export type NamedSetlist = {
  id: number;
  name: string;
  songIds: number[];
};

export type View = "songs" | "import" | "song" | "setlist" | "performance";
export type ImportMode = "raw" | "block";
export type Notation = "intl" | "de";

export type ImportDraft = {
  title: string;
  artist: string;
  bpm: string;
  key: string;
  duration: string;
  capo: string;
  rawText: string;
};

export type SectionGroup = {
  id: string;
  title: string;
  implicit?: boolean;
  blocks: Array<{ index: number; line: Line }>;
};

export type PersistedState = {
  version: 1;
  savedAt: string;
  songs: Song[];
  setlist: number[];
  setlists: NamedSetlist[];
  activeSetlistId: number;
  selectedSongId: number;
  setlistPreviewSongId: number;
  performanceIndex: number;
  transpose: number;
  notation: Notation;
  draft: ImportDraft;
};

export type ChildrenProps = {
  children: ReactNode;
};
