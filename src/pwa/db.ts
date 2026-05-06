import type { DriveFileMemory, ImportDraft, Line, NamedSetlist, Notation, PersistedState, Song } from "../types";
import { makePairLine, normalizeChordAnchors, normalizePairLine, renderChordAnchors } from "../lib/chordAnchors";

const DB_NAME = "trinittty-songbook";
const DB_VERSION = 2;
const STORE = "state";
const SONG_BACKUP_STORE = "song-before-save-backups";
const STATE_KEY = "app";

const FALLBACK_DRAFT: ImportDraft = {
  title: "",
  artist: "TriNiTTTy",
  bpm: "80",
  key: "Am",
  duration: "0:00",
  capo: "-",
  rawText: "",
};

const TEXT_LINE_TYPES = new Set(["section", "chords", "lyrics", "cue", "repeat"]);

type UnknownRecord = Record<string, unknown>;

export type SongBeforeSaveBackup = {
  version: 1;
  id: string;
  reason: "before-save";
  path: string;
  fileName: string;
  timestamp: string;
  songId: number;
  songTitle: string;
  song: Song;
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function positiveId(value: unknown, fallback: number) {
  const id = numberValue(value, fallback);
  return id > 0 ? id : fallback;
}

function normalizeLine(value: unknown): Line | null {
  if (!isRecord(value)) return null;

  if (value.type === "space") return { type: "space" };
  if (value.type === "pair") {
    const chordAnchors = normalizeChordAnchors(value.chordAnchors);
    const chords = stringValue(value.chords, chordAnchors.length ? renderChordAnchors(chordAnchors) : "");
    return chordAnchors.length
      ? normalizePairLine({ type: "pair", chords, lyrics: stringValue(value.lyrics), chordAnchors })
      : makePairLine(chords, stringValue(value.lyrics));
  }

  if (typeof value.type === "string" && TEXT_LINE_TYPES.has(value.type)) {
    return {
      type: value.type as Exclude<Line["type"], "pair" | "space">,
      text: stringValue(value.text),
    };
  }

  return null;
}

function normalizeSong(value: unknown, fallbackId: number): Song | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.lines)) return null;

  const lines = value.lines.map(normalizeLine).filter((line): line is Line => Boolean(line));
  if (value.lines.length > 0 && !lines.length) return null;

  return {
    id: positiveId(value.id, fallbackId),
    title: stringValue(value.title, "Nová pieseň").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim() || "Nová pieseň",
    artist: stringValue(value.artist, "TriNiTTTy") || "TriNiTTTy",
    bpm: numberValue(value.bpm, 80) || 80,
    key: stringValue(value.key, "Am") || "Am",
    duration: stringValue(value.duration, "0:00") || "0:00",
    capo: stringValue(value.capo, "-") || "-",
    lines: lines.length ? lines : [{ type: "lyrics", text: "" }],
    deletedAt: stringValue(value.deletedAt).trim() || undefined,
  };
}

function normalizeSongs(value: unknown) {
  if (!Array.isArray(value)) throw new Error("Backup nema pole songs.");

  const used = new Set<number>();
  let nextId = 1;

  const songs = value
    .map((item) => normalizeSong(item, nextId++))
    .filter((song): song is Song => Boolean(song))
    .map((song) => {
      if (!used.has(song.id)) {
        used.add(song.id);
        return song;
      }

      while (used.has(nextId)) nextId += 1;
      const id = nextId++;
      used.add(id);
      return { ...song, id };
    });

  if (value.length > 0 && !songs.length) throw new Error("Backup nema platne skladby.");
  return songs;
}

function normalizeIdList(value: unknown, validIds: Set<number>) {
  return Array.isArray(value)
    ? value.filter((id): id is number => typeof id === "number" && validIds.has(id))
    : [];
}

function normalizeSetlists(value: unknown, fallbackSongIds: number[], validIds: Set<number>): NamedSetlist[] {
  const source = Array.isArray(value) && value.length
    ? value
    : [{ id: 1, name: "Setlist 1", songIds: fallbackSongIds }];

  const used = new Set<number>();
  let nextId = 1;

  const setlists = source
    .filter(isRecord)
    .map((item, index) => {
      let id = positiveId(item.id, nextId++);
      while (used.has(id)) id = nextId++;
      used.add(id);

      return {
        id,
        name: stringValue(item.name, `Setlist ${index + 1}`).trim() || `Setlist ${index + 1}`,
        songIds: normalizeIdList(item.songIds, validIds),
      };
    });

  return setlists.length ? setlists : [{ id: 1, name: "Setlist 1", songIds: fallbackSongIds }];
}

function normalizeDraft(value: unknown): ImportDraft {
  if (!isRecord(value)) return FALLBACK_DRAFT;
  return {
    title: stringValue(value.title, FALLBACK_DRAFT.title),
    artist: stringValue(value.artist, FALLBACK_DRAFT.artist),
    bpm: stringValue(value.bpm, FALLBACK_DRAFT.bpm),
    key: stringValue(value.key, FALLBACK_DRAFT.key),
    duration: stringValue(value.duration, FALLBACK_DRAFT.duration),
    capo: stringValue(value.capo, FALLBACK_DRAFT.capo),
    rawText: stringValue(value.rawText, FALLBACK_DRAFT.rawText),
  };
}

function normalizeDriveFile(value: unknown): DriveFileMemory | null {
  if (!isRecord(value)) return null;
  const fileId = stringValue(value.fileId).trim();
  const fileName = stringValue(value.fileName).trim();
  if (!fileId || !fileName) return null;

  return {
    fileId,
    fileName,
    displayPath: stringValue(value.displayPath).trim() || undefined,
    rememberedAt: stringValue(value.rememberedAt, new Date().toISOString()),
  };
}

export function normalizePersistedState(value: unknown): PersistedState {
  if (!isRecord(value) || value.version !== 1) throw new Error("Nepodporovana verzia backupu.");

  const songs = normalizeSongs(value.songs);
  const validIds = new Set(songs.map((song) => song.id));
  const fallbackId = songs[0]?.id ?? 0;
  const fallbackSetlist = normalizeIdList(value.setlist, validIds);
  const setlists = normalizeSetlists(value.setlists, fallbackSetlist, validIds);
  const activeSetlistId = setlists.some((setlist) => setlist.id === value.activeSetlistId)
    ? numberValue(value.activeSetlistId, setlists[0].id)
    : setlists[0].id;
  const activeSetlist = setlists.find((setlist) => setlist.id === activeSetlistId) ?? setlists[0];
  const setlist = activeSetlist.songIds;
  const notation: Notation = value.notation === "de" ? "de" : "intl";

  return {
    version: 1,
    savedAt: stringValue(value.savedAt, new Date().toISOString()),
    songs,
    setlist,
    setlists,
    activeSetlistId,
    selectedSongId: validIds.has(value.selectedSongId as number) ? numberValue(value.selectedSongId, fallbackId) : fallbackId,
    setlistPreviewSongId: validIds.has(value.setlistPreviewSongId as number) ? numberValue(value.setlistPreviewSongId, fallbackId) : setlist[0] ?? fallbackId,
    performanceIndex: Math.max(0, Math.min(numberValue(value.performanceIndex, 0), Math.max(0, setlist.length - 1))),
    transpose: numberValue(value.transpose, 0),
    notation,
    draft: normalizeDraft(value.draft),
    driveFile: normalizeDriveFile(value.driveFile),
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(SONG_BACKUP_STORE)) db.createObjectStore(SONG_BACKUP_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runObjectStore<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDatabase().then((db) =>
    new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = action(tx.objectStore(storeName));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    }),
  );
}

function runStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  return runObjectStore(STORE, mode, action);
}

export function loadState() {
  if (!("indexedDB" in window)) return Promise.resolve(null);
  return runStore<unknown>("readonly", (store) => store.get(STATE_KEY))
    .then((state) => (state ? normalizePersistedState(state) : null))
    .catch(() => null);
}

export function saveState(state: PersistedState) {
  if (!("indexedDB" in window)) return Promise.resolve();
  return runStore<IDBValidKey>("readwrite", (store) => store.put(state, STATE_KEY)).then(() => undefined);
}

export function clearState() {
  if (!("indexedDB" in window)) return Promise.resolve();
  return runStore<undefined>("readwrite", (store) => store.delete(STATE_KEY)).then(() => undefined);
}

export function makePersistedBackup(state: Omit<PersistedState, "version" | "savedAt">): PersistedState {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    ...state,
  };
}

export function downloadBackup(state: PersistedState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `trinittty-backup-v${state.version}-${backupTimestamp(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function readBackupFile(file: File): Promise<PersistedState> {
  return file.text().then((text) => normalizePersistedState(JSON.parse(text)));
}

export function createSongBeforeSaveBackup(song: Song): Promise<SongBeforeSaveBackup> {
  if (!("indexedDB" in window)) return Promise.reject(new Error("IndexedDB nie je dostupné, záloha pred prepísaním sa nedá vytvoriť."));

  const createdAt = new Date();
  const timestamp = backupFileTimestamp(createdAt);
  const id = `song-${song.id}-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
  const fileName = `${timestamp}_before-save.json`;
  const backup: SongBeforeSaveBackup = {
    version: 1,
    id,
    reason: "before-save",
    path: `backups/${song.id}/${fileName}`,
    fileName,
    timestamp: createdAt.toISOString(),
    songId: song.id,
    songTitle: song.title,
    song: JSON.parse(JSON.stringify(song)) as Song,
  };

  return runObjectStore<IDBValidKey>(SONG_BACKUP_STORE, "readwrite", (store) => store.add(backup)).then(() => backup);
}

export function listSongBeforeSaveBackups(songId?: number): Promise<SongBeforeSaveBackup[]> {
  if (!("indexedDB" in window)) return Promise.resolve([]);
  return runObjectStore<SongBeforeSaveBackup[]>(SONG_BACKUP_STORE, "readonly", (store) => store.getAll())
    .then((backups) => backups
      .filter((backup) => songId === undefined || backup.songId === songId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
}

export function getSongBeforeSaveBackup(id: string): Promise<SongBeforeSaveBackup | null> {
  if (!("indexedDB" in window)) return Promise.resolve(null);
  return runObjectStore<SongBeforeSaveBackup | undefined>(SONG_BACKUP_STORE, "readonly", (store) => store.get(id))
    .then((backup) => backup ?? null);
}

export function deleteSongBeforeSaveBackup(id: string): Promise<void> {
  if (!("indexedDB" in window)) return Promise.reject(new Error("IndexedDB nie je dostupné, zálohu sa nedá zmazať."));
  return runObjectStore<undefined>(SONG_BACKUP_STORE, "readwrite", (store) => store.delete(id)).then(() => undefined);
}

// TODO: Add full backup management, restore-over-current, export to JSON/ZIP, and optional user-chosen folder integration.

function backupTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + `-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function backupFileTimestamp(date: Date) {
  const pad = (value: number, size = 2) => String(value).padStart(size, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}-${pad(date.getMilliseconds(), 3)}`;
}
