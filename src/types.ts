import type { ReactNode } from "react";

export type ChordAnchor = {
  id: string;
  chord: string;
  col: number;
};

export type CueColorId =
  | "male"
  | "female"
  | "duet"
  | "solo"
  | "choir"
  | "cue"
  | "stop"
  | "spoken"
  | "neutral";

export type CueColorMeta = {
  cueColorId?: CueColorId;
};

export type PairLine = {
  type: "pair";
  chords: string;
  lyrics: string;
  chordAnchors: ChordAnchor[];
} & CueColorMeta;

export type Line =
  | ({ type: "section"; text: string } & CueColorMeta)
  | ({ type: "chords"; text: string } & CueColorMeta)
  | ({ type: "lyrics"; text: string } & CueColorMeta)
  | ({ type: "cue"; text: string } & CueColorMeta)
  | ({ type: "repeat"; text: string } & CueColorMeta)
  | PairLine
  | { type: "space" };

export type Song = {
  id: number;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  timeSignature?: string;
  duration: string;
  capo: string;
  lines: Line[];
  deletedAt?: string;
};

export type NamedSetlist = {
  id: number;
  name: string;
  songIds: number[];
};

export type DriveFileMemory = {
  fileId: string;
  fileName: string;
  displayPath?: string;
  rememberedAt: string;
};

export type DriveFolderMemory = {
  folderId: string;
  folderName: string;
  displayPath?: string;
  rememberedAt: string;
};

export type View = "songs" | "import" | "song" | "setlist" | "performance";
export type ImportMode = "raw" | "block";
export type EditorMode = "create" | "edit";
export type Notation = "intl" | "de";

export type ImportDraft = {
  title: string;
  artist: string;
  bpm: string;
  key: string;
  timeSignature: string;
  duration: string;
  capo: string;
  rawText: string;
};

export type SectionGroup = {
  id: string;
  title: string;
  index?: number;
  cueColorId?: CueColorId;
  implicit?: boolean;
  blocks: Array<{ index: number; line: Line }>;
};

export type PersistedState = {
  version: 1;
  appName: string;
  schemaVersion: 1;
  databaseVersion: number;
  exportedAt: string;
  songCount: number;
  setlistCount: number;
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
  driveFile: DriveFileMemory | null;
};

export type RemoteDatabaseCheck = {
  checkedAt: string;
  status: "newer" | "same" | "older";
  state: PersistedState;
};

export type ChildrenProps = {
  children: ReactNode;
};
