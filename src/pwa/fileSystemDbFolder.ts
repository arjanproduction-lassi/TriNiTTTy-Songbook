import type { PersistedState } from "../types";
import { backupFileName, loadWorkingDbFolder, normalizePersistedState, saveWorkingDbFolder } from "./db";

type FileSystemAccessPermission = "granted" | "denied" | "prompt";
type FileSystemAccessMode = "read" | "readwrite";

type PermissionDescriptor = {
  mode?: FileSystemAccessMode;
};

type WritableFileStream = {
  write: (data: Blob | string) => Promise<void>;
  close: () => Promise<void>;
};

type FileHandle = {
  kind: "file";
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<WritableFileStream>;
};

type DirectoryHandle = {
  kind: "directory";
  name: string;
  queryPermission?: (descriptor?: PermissionDescriptor) => Promise<FileSystemAccessPermission>;
  requestPermission?: (descriptor?: PermissionDescriptor) => Promise<FileSystemAccessPermission>;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileHandle>;
  values?: () => AsyncIterable<FileHandle | DirectoryHandle>;
};

export type WorkingDbFolder = {
  handle: DirectoryHandle;
  name: string;
  rememberedAt: string;
};

export type WorkingDbCandidate = {
  fileName: string;
  state: PersistedState;
};

type WindowWithFileSystemAccess = Window & {
  showDirectoryPicker?: (options?: { mode?: FileSystemAccessMode }) => Promise<DirectoryHandle>;
};

const UNSUPPORTED_MESSAGE = "Tento prehliadač nepodporuje pracovný DB priečinok. Použi klasický export/import.";
const PERMISSION_MESSAGE = "Priečinok nie je povolený. Vyber ho znova alebo použi klasický export/import.";

export function isWorkingDbFolderSupported() {
  const api = window as WindowWithFileSystemAccess;
  return typeof api.showDirectoryPicker === "function" && "indexedDB" in window;
}

export function workingDbFolderUnsupportedMessage() {
  return UNSUPPORTED_MESSAGE;
}

export async function loadRememberedWorkingDbFolder(): Promise<WorkingDbFolder | null> {
  const stored = await loadWorkingDbFolder();
  if (!stored) return null;
  const handle = stored.handle as DirectoryHandle;
  if (!isDirectoryHandle(handle)) return null;
  return { handle, name: stored.name || handle.name, rememberedAt: stored.rememberedAt };
}

export async function chooseWorkingDbFolder(): Promise<WorkingDbFolder> {
  if (!isWorkingDbFolderSupported()) throw new Error(UNSUPPORTED_MESSAGE);
  const picker = (window as WindowWithFileSystemAccess).showDirectoryPicker;
  if (!picker) throw new Error(UNSUPPORTED_MESSAGE);
  const handle = await picker({ mode: "readwrite" });
  await ensureWorkingDbFolderPermission(handle, "readwrite");
  const stored = await saveWorkingDbFolder(handle, handle.name);
  return { handle, name: stored.name, rememberedAt: stored.rememberedAt };
}

export async function writeDatabaseToWorkingFolder(folder: WorkingDbFolder, state: PersistedState, projectName: string) {
  await ensureWorkingDbFolderPermission(folder.handle, "readwrite");
  const fileName = await nextAvailableDbFileName(folder.handle, backupFileName(state, projectName));
  const fileHandle = await folder.handle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(new Blob([JSON.stringify(state, null, 2)], { type: "application/json;charset=utf-8" }));
  await writable.close();
  return { fileName };
}

export async function findNewestDatabaseInWorkingFolder(folder: WorkingDbFolder): Promise<WorkingDbCandidate | null> {
  await ensureWorkingDbFolderPermission(folder.handle, "read");
  if (typeof folder.handle.values !== "function") {
    throw new Error("Tento prehliadač nevie bezpečne prečítať obsah pracovného priečinka.");
  }

  let best: WorkingDbCandidate | null = null;

  for await (const entry of folder.handle.values()) {
    if (entry.kind !== "file" || !entry.name.toLowerCase().endsWith(".json")) continue;

    try {
      const file = await entry.getFile();
      const state = normalizePersistedState(JSON.parse(await file.text()));
      const candidate = { fileName: entry.name, state };
      if (isBetterDatabaseCandidate(candidate, best)) best = candidate;
    } catch {
      // Ignore unrelated or invalid JSON files in the selected folder.
    }
  }

  return best;
}

async function ensureWorkingDbFolderPermission(handle: DirectoryHandle, mode: FileSystemAccessMode) {
  const descriptor = { mode };
  const current = await handle.queryPermission?.(descriptor);
  if (current === "granted") return;

  const requested = await handle.requestPermission?.(descriptor);
  if (!handle.queryPermission && !handle.requestPermission) return;
  if (requested === "granted") return;

  throw new Error(PERMISSION_MESSAGE);
}

function isDirectoryHandle(value: unknown): value is DirectoryHandle {
  return Boolean(value)
    && typeof value === "object"
    && (value as Partial<DirectoryHandle>).kind === "directory"
    && typeof (value as Partial<DirectoryHandle>).name === "string"
    && typeof (value as Partial<DirectoryHandle>).getFileHandle === "function";
}

async function nextAvailableDbFileName(directory: DirectoryHandle, preferredName: string) {
  if (!(await fileExists(directory, preferredName))) return preferredName;

  const suffix = `copy-${fileNameTimestamp(new Date())}`;
  const match = preferredName.match(/^(.*?)(\.json)$/i);
  const fallbackName = match ? `${match[1]}_${suffix}${match[2]}` : `${preferredName}_${suffix}`;
  if (!(await fileExists(directory, fallbackName))) return fallbackName;

  for (let index = 2; index <= 99; index += 1) {
    const indexedName = match ? `${match[1]}_${suffix}_${index}${match[2]}` : `${preferredName}_${suffix}_${index}`;
    if (!(await fileExists(directory, indexedName))) return indexedName;
  }

  throw new Error("V pracovnom priečinku sa nepodarilo vytvoriť bezpečný názov súboru.");
}

async function fileExists(directory: DirectoryHandle, fileName: string) {
  try {
    await directory.getFileHandle(fileName, { create: false });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") return false;
    return false;
  }
}

function isBetterDatabaseCandidate(candidate: WorkingDbCandidate, current: WorkingDbCandidate | null) {
  if (!current) return true;
  if (candidate.state.databaseVersion !== current.state.databaseVersion) {
    return candidate.state.databaseVersion > current.state.databaseVersion;
  }

  return databaseDateValue(candidate.state) > databaseDateValue(current.state);
}

function databaseDateValue(state: PersistedState) {
  const date = new Date(state.exportedAt || state.savedAt);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function fileNameTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
