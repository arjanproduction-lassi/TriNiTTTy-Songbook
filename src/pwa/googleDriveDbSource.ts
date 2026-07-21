import type { DriveFileMemory, PersistedState } from "../types";
import { chooseDriveJsonFile, loadBackupFromDrive } from "./googleDrive";

const OFFICIAL_DRIVE_DB_SOURCE_KEY = "lassilab-official-drive-db-source";

export type OfficialDriveDbSource = {
  fileId: string;
  fileName: string;
  rememberedAt: string;
  lastCheckedVersion?: number;
};

export type OfficialDriveDbCandidate = {
  source: OfficialDriveDbSource;
  fileName: string;
  checkedAt: string;
  state: PersistedState;
};

export function readOfficialDriveDbSource(): OfficialDriveDbSource | null {
  try {
    const raw = window.localStorage.getItem(OFFICIAL_DRIVE_DB_SOURCE_KEY);
    if (!raw) return null;
    return normalizeOfficialDriveDbSource(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeOfficialDriveDbSource(source: OfficialDriveDbSource | null) {
  try {
    if (!source) {
      window.localStorage.removeItem(OFFICIAL_DRIVE_DB_SOURCE_KEY);
      return;
    }
    window.localStorage.setItem(OFFICIAL_DRIVE_DB_SOURCE_KEY, JSON.stringify(source));
  } catch {
    // Drive source memory is only a local convenience. Manual import/export remains available.
  }
}

export async function chooseOfficialDriveDbSource(): Promise<OfficialDriveDbSource> {
  const file = await chooseDriveJsonFile();
  const source = driveFileToOfficialSource(file);
  writeOfficialDriveDbSource(source);
  return source;
}

export async function fetchOfficialDriveDbCandidate(source: OfficialDriveDbSource): Promise<OfficialDriveDbCandidate> {
  const state = await loadBackupFromDrive(source.fileId);
  return {
    source,
    fileName: source.fileName,
    checkedAt: new Date().toISOString(),
    state,
  };
}

export function withLastCheckedVersion(source: OfficialDriveDbSource, databaseVersion: number): OfficialDriveDbSource {
  return { ...source, lastCheckedVersion: databaseVersion };
}

function driveFileToOfficialSource(file: DriveFileMemory): OfficialDriveDbSource {
  return {
    fileId: file.fileId,
    fileName: file.fileName,
    rememberedAt: new Date().toISOString(),
  };
}

function normalizeOfficialDriveDbSource(value: unknown): OfficialDriveDbSource | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<OfficialDriveDbSource>;
  const fileId = String(source.fileId || "").trim();
  const fileName = String(source.fileName || "").trim();
  if (!fileId || !fileName) return null;
  const rememberedAt = String(source.rememberedAt || new Date().toISOString());
  const lastCheckedVersion = Number.isFinite(source.lastCheckedVersion) && Number(source.lastCheckedVersion) > 0
    ? Math.floor(Number(source.lastCheckedVersion))
    : undefined;
  return { fileId, fileName, rememberedAt, lastCheckedVersion };
}
