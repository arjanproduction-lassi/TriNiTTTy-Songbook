import { useEffect, useRef, useState } from "react";
import type { DriveFileMemory, NamedSetlist, RemoteDatabaseCheck, Song } from "../types";
import { A4Sheet, FitA4Sheet } from "../components/A4Sheet";
import { Card, Chip, InfoBox, PrimaryButton, SoftButton } from "../components/ui";
import { normalizeKeyInput } from "../lib/chords";
import { buildSections, normalizeSongTitle } from "../lib/import";

export function SongsView({
  songs,
  deletedSongs,
  filteredSongs,
  query,
  selectedSong,
  storageStatus,
  canInstall,
  canonicalDirty,
  onQuery,
  onCreateNewSong,
  onOpen,
  onEdit,
  onToggleSetlist,
  onToggleSongInSetlist,
  onDelete,
  onRestoreDeleted,
  onInstall,
  onExportBackup,
  onDownloadDatabaseCopy,
  onImportBackup,
  isInSetlist,
  isSongInSetlist,
  setlistNamesForSong,
  setlists,
  activeSetlistId,
  databaseVersion,
  remoteDatabaseUrl,
  remoteDatabaseUrlDraft,
  remoteDatabaseStatus,
  remoteDatabaseCheck,
  onRemoteDatabaseUrlDraftChange,
  onSaveRemoteDatabaseUrl,
  onClearRemoteDatabaseUrl,
  onCheckRemoteDatabaseUpdate,
  onImportRemoteDatabaseUpdate,
  driveFile,
  driveStatus,
  driveConfigured,
  driveConfigMessage,
  onChooseDriveFile,
  onLoadFromDrive,
  onSaveToDrive,
  onForgetDriveFile,
}: {
  songs: Song[];
  deletedSongs: Song[];
  filteredSongs: Song[];
  query: string;
  selectedSong: Song | null;
  storageStatus: string;
  canInstall: boolean;
  canonicalDirty: boolean;
  onQuery: (value: string) => void;
  onCreateNewSong: () => void;
  onOpen: (song: Song) => void;
  onEdit: (song: Song) => void;
  onToggleSetlist: (songId: number) => void;
  onToggleSongInSetlist: (songId: number, setlistId: number) => void;
  onDelete: (songId: number) => void;
  onRestoreDeleted: (songId: number) => void;
  onInstall: () => void;
  onExportBackup: () => void;
  onDownloadDatabaseCopy: () => void;
  onImportBackup: (file: File) => void;
  isInSetlist: (songId: number) => boolean;
  isSongInSetlist: (songId: number, setlistId: number) => boolean;
  setlistNamesForSong: (songId: number) => string[];
  setlists: NamedSetlist[];
  activeSetlistId: number;
  databaseVersion: number;
  remoteDatabaseUrl: string;
  remoteDatabaseUrlDraft: string;
  remoteDatabaseStatus: string;
  remoteDatabaseCheck: RemoteDatabaseCheck | null;
  onRemoteDatabaseUrlDraftChange: (value: string) => void;
  onSaveRemoteDatabaseUrl: () => void;
  onClearRemoteDatabaseUrl: () => void;
  onCheckRemoteDatabaseUpdate: () => void;
  onImportRemoteDatabaseUpdate: () => void;
  driveFile: DriveFileMemory | null;
  driveStatus: string;
  driveConfigured: boolean;
  driveConfigMessage: string;
  onChooseDriveFile: () => void;
  onLoadFromDrive: () => void;
  onSaveToDrive: () => void;
  onForgetDriveFile: () => void;
}) {
  const [openSetlistSongId, setOpenSetlistSongId] = useState<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const hasMultipleSetlists = setlists.length > 1;
  const remoteCheckLabel = remoteDatabaseCheck ? remoteStatusLabel(remoteDatabaseCheck.status) : "";

  useEffect(() => {
    if (!hasMultipleSetlists) setOpenSetlistSongId(null);
  }, [hasMultipleSetlists]);

  useEffect(() => {
    if (openSetlistSongId === null) return undefined;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (pickerRef.current?.contains(event.target as Node)) return;
      setOpenSetlistSongId(null);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [openSetlistSongId]);

  return (
    <div className="grid min-w-0 items-start gap-3 md:gap-6 lg:grid-cols-[minmax(320px,0.82fr)_minmax(520px,1.18fr)]">
      <div className="order-2 flex min-w-0 flex-col gap-3 md:gap-4 lg:order-1">
        <Card className="order-1 lg:flex lg:h-[calc(100svh-12rem)] lg:min-h-0 lg:flex-col">
          <div className="mb-3 flex flex-col gap-2 md:mb-4 md:flex-row md:items-center md:justify-between md:gap-3">
            <h2 className="text-lg font-semibold md:text-xl">Knižnica piesní</h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button onClick={onCreateNewSong} className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white sm:w-auto">Pridať skladbu</button>
              <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Hľadať..." className="w-full rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm outline-none sm:w-64" />
            </div>
          </div>
          <div className="min-h-0 max-h-[52svh] space-y-2 overflow-auto pr-1 md:max-h-[58svh] md:space-y-3 lg:max-h-none lg:flex-1">
            {!filteredSongs.length && (
              <div className="rounded-2xl bg-zinc-50 p-5 text-sm text-zinc-600 ring-1 ring-zinc-200">
                Knižnica je prázdna. Novú skladbu pridáš cez Import alebo obnovíš zo zálohy.
              </div>
            )}
            {filteredSongs.map((song) => {
              const songSetlists = setlistNamesForSong(song.id);
              const pickerOpen = openSetlistSongId === song.id;

              return (
              <div key={song.id} className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 p-3 md:rounded-2xl md:p-4">
                <div className="flex min-w-0 flex-col gap-1 md:gap-2">
                  <div className="min-w-0 break-words text-base font-semibold md:text-lg">{normalizeSongTitle(song.title)}</div>
                  <div className="text-sm text-zinc-500">{song.artist}</div>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    <Chip>{normalizeKeyInput(song.key)}</Chip>
                    <Chip>{song.bpm} BPM</Chip>
                    <Chip>{song.duration}</Chip>
                  </div>
                </div>
                <div className="mt-3 flex min-w-0 flex-wrap gap-1.5 md:mt-4 md:gap-2">
                  <button onClick={() => onOpen(song)} className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white">Otvoriť</button>
                  <button onClick={() => onEdit(song)} className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white">Upraviť</button>
                  {hasMultipleSetlists ? (
                    <div className="relative min-w-0">
                      <button
                        onClick={() => setOpenSetlistSongId(pickerOpen ? null : song.id)}
                        aria-expanded={pickerOpen}
                        className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200"
                      >
                        Setlisty…
                      </button>
                      {pickerOpen && (
                        <div ref={pickerRef} className="absolute left-0 z-20 mt-2 w-[min(18rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-3 text-sm shadow-lg ring-1 ring-zinc-200">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="font-semibold text-zinc-800">Setlisty</div>
                            <button onClick={() => setOpenSetlistSongId(null)} className="text-xs font-semibold text-zinc-500 hover:text-zinc-900">Zavrieť</button>
                          </div>
                          <div className="space-y-2">
                            {setlists.map((setlist) => {
                              const checked = isSongInSetlist(song.id, setlist.id);
                              return (
                                <button
                                  key={setlist.id}
                                  type="button"
                                  onClick={() => onToggleSongInSetlist(song.id, setlist.id)}
                                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ring-1 ${checked ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-zinc-50 text-zinc-800 ring-zinc-200"}`}
                                >
                                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs font-bold ring-1 ${checked ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-transparent ring-zinc-300"}`}>✓</span>
                                  <span className="min-w-0 flex-1 truncate">
                                    {setlist.name}{setlist.id === activeSetlistId ? " (aktuálny)" : ""}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => onToggleSetlist(song.id)} className={`rounded-xl px-3 py-2 text-sm font-semibold ring-1 ${isInSetlist(song.id) ? "bg-rose-50 text-rose-800 ring-rose-200" : "bg-zinc-100 text-zinc-800 ring-zinc-200"}`}>{isInSetlist(song.id) ? "Odobrať zo setlistu" : "Pridať do setlistu"}</button>
                  )}
                  <button onClick={() => onDelete(song.id)} className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white">Odstrániť</button>
                </div>
                {hasMultipleSetlists && songSetlists.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 md:mt-3 md:gap-2">
                    <span>In:</span>
                    {songSetlists.map((name) => <Chip key={name}>{name}</Chip>)}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </Card>

        <Card className="order-3">
          <details>
            <summary className="cursor-pointer text-lg font-semibold">Kôš ({deletedSongs.length})</summary>
            <div className="mt-3 space-y-2">
              {!deletedSongs.length && (
                <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-600 ring-1 ring-zinc-200">Kôš je prázdny.</div>
              )}
              {deletedSongs.map((song) => (
                <div key={song.id} className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200">
                  <div className="font-semibold">{normalizeSongTitle(song.title)}</div>
                  <div className="mt-1 text-sm text-zinc-500">
                    Odstránené: {song.deletedAt ? new Date(song.deletedAt).toLocaleString("sk-SK") : "neznáme"}
                  </div>
                  <div className="mt-3">
                    <SoftButton onClick={() => onRestoreDeleted(song.id)}>Obnoviť</SoftButton>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </Card>

        <Card className="order-2">
          <h2 className="text-lg font-semibold md:text-xl">PWA / lokálna databáza</h2>
          <div className="mt-3"><InfoBox tone="emerald">{storageStatus}</InfoBox></div>
          <div className="mt-3 flex flex-wrap gap-1.5 md:mt-4 md:gap-2">
            {canInstall && <PrimaryButton onClick={onInstall}>Nainštalovať appku</PrimaryButton>}
            <SoftButton onClick={canonicalDirty ? onExportBackup : onDownloadDatabaseCopy}>{canonicalDirty ? "Exportovať databázu" : "Stiahnuť kópiu DB"}</SoftButton>
            <label className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200">
              Importovať backup
              <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportBackup(file);
                e.currentTarget.value = "";
              }} />
            </label>
          </div>
          <p className="mt-3 text-sm text-zinc-500">Piesne, setlist a nastavenia sa ukladajú do IndexedDB v tomto zariadení.</p>

          <div className="mt-3 rounded-2xl bg-zinc-50 p-3 text-sm ring-1 ring-zinc-200 md:mt-4 md:p-4">
            <div className="font-semibold text-zinc-800">Kapelový zdroj databázy</div>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">URL kapelovej databázy</label>
            <input
              value={remoteDatabaseUrlDraft}
              onChange={(event) => onRemoteDatabaseUrlDraftChange(event.target.value)}
              placeholder="https://.../DBv003_TriNiTTTy_2026-05-08.json"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none"
            />
            <div className="mt-2 text-xs text-zinc-500">
              {remoteDatabaseUrl ? `Uložený zdroj: ${remoteDatabaseUrl}` : "Zdroj databázy zatiaľ nie je uložený."}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 md:gap-2">
              <SoftButton onClick={onSaveRemoteDatabaseUrl}>Uložiť URL</SoftButton>
              <SoftButton disabled={!remoteDatabaseUrl && !remoteDatabaseUrlDraft.trim()} onClick={onCheckRemoteDatabaseUpdate}>Skontrolovať aktualizáciu</SoftButton>
              <SoftButton disabled={!remoteDatabaseUrl && !remoteDatabaseUrlDraft.trim()} onClick={onClearRemoteDatabaseUrl}>Vymazať URL</SoftButton>
            </div>
            <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-zinc-700 ring-1 ring-zinc-200">{remoteDatabaseStatus}</div>
            {remoteDatabaseCheck && (
              <div className="mt-3 rounded-xl bg-white p-3 text-sm ring-1 ring-zinc-200">
                <div className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ring-1 ${remoteStatusClass(remoteDatabaseCheck.status)}`}>
                  {remoteCheckLabel}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>Aktuálna verzia: <strong>{formatLocalDatabaseVersion(databaseVersion)}</strong></div>
                  <div>Dostupná verzia: <strong>{formatLocalDatabaseVersion(remoteDatabaseCheck.state.databaseVersion)}</strong></div>
                  <div>Exportované: <strong>{formatRemoteDate(remoteDatabaseCheck.state.exportedAt || remoteDatabaseCheck.state.savedAt)}</strong></div>
                  <div>Skontrolované: <strong>{formatRemoteDate(remoteDatabaseCheck.checkedAt)}</strong></div>
                  <div>Skladby: <strong>{remoteDatabaseCheck.state.songCount}</strong></div>
                  <div>Setlisty: <strong>{remoteDatabaseCheck.state.setlistCount}</strong></div>
                </div>
                <div className="mt-3 text-xs font-semibold text-amber-700">Pred importom sa vytvorí záloha aktuálnej lokálnej databázy.</div>
                <div className="mt-3">
                  <PrimaryButton onClick={onImportRemoteDatabaseUpdate}>Importovať túto verziu</PrimaryButton>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 rounded-2xl bg-zinc-50 p-3 text-sm ring-1 ring-zinc-200 md:mt-4 md:p-4">
            <div className="font-semibold text-zinc-800">Google Drive admin</div>
            <div className="mt-1 text-zinc-600">
              {driveFile ? `Drive file: ${driveFile.fileName}` : "Drive file nie je vybraný."}
            </div>
            {!!driveFile?.displayPath && <div className="mt-1 text-xs text-zinc-500">{driveFile.displayPath}</div>}
            <div className="mt-2 text-xs text-zinc-500">{driveConfigured ? driveStatus : driveConfigMessage}</div>
            <div className="mt-3 flex flex-wrap gap-1.5 md:gap-2">
              <SoftButton disabled={!driveConfigured} onClick={onChooseDriveFile}>{driveFile ? "Change Drive file" : "Choose Drive file"}</SoftButton>
              <SoftButton disabled={!driveConfigured} onClick={onLoadFromDrive}>Load from Drive</SoftButton>
              <SoftButton disabled={!driveConfigured} onClick={onSaveToDrive}>Save to Drive</SoftButton>
              {driveFile && <SoftButton onClick={onForgetDriveFile}>Zabudnúť Drive file</SoftButton>}
            </div>
          </div>
        </Card>
      </div>

      <Card className="order-1 min-w-0 lg:sticky lg:top-4 lg:order-2 lg:max-h-[calc(100svh-2rem)] lg:overflow-hidden">
        <h2 className="text-xl font-semibold">Rýchly A4 náhľad</h2>
        <div className="mt-2 text-sm text-zinc-600">Vyber pieseň vľavo a hneď ju vidíš v reálnom papierovom rozložení.</div>
        <div className="mt-4">
          {selectedSong ? (
            <>
              <div className="min-w-0 xl:hidden">
                <FitA4Sheet song={selectedSong} sections={buildSections(selectedSong.lines)} readerZoom={100} className="h-[72svh] rounded-3xl ring-1 ring-zinc-200" />
              </div>
              <div className="hidden min-w-0 xl:block">
                <A4Sheet song={selectedSong} sections={buildSections(selectedSong.lines)} />
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-zinc-50 p-5 text-sm text-zinc-600 ring-1 ring-zinc-200">Nie je vybraná žiadna skladba.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

function formatLocalDatabaseVersion(version: number) {
  const normalized = Math.max(1, Math.floor(Number.isFinite(version) ? version : 1));
  return `v${String(normalized).padStart(3, "0")}`;
}

function formatRemoteDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "neznáme";
  return date.toLocaleString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function remoteStatusLabel(status: RemoteDatabaseCheck["status"]) {
  if (status === "newer") return "Nová databáza dostupná";
  if (status === "older") return "Staršia verzia";
  return "Databáza je aktuálna";
}

function remoteStatusClass(status: RemoteDatabaseCheck["status"]) {
  if (status === "newer") return "bg-emerald-50 text-emerald-900 ring-emerald-200";
  if (status === "older") return "bg-amber-50 text-amber-900 ring-amber-200";
  return "bg-zinc-50 text-zinc-700 ring-zinc-200";
}
