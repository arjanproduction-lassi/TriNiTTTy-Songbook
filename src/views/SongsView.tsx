import { useEffect, useRef, useState } from "react";
import type { DriveFileMemory, NamedSetlist, Song } from "../types";
import { A4Sheet } from "../components/A4Sheet";
import { Card, Chip, InfoBox, PrimaryButton, SoftButton } from "../components/ui";
import { normalizeKeyInput } from "../lib/chords";
import { buildSections, normalizeSongTitle } from "../lib/import";

export function SongsView({
  songs,
  filteredSongs,
  query,
  selectedSong,
  storageStatus,
  canInstall,
  onQuery,
  onOpen,
  onEdit,
  onToggleSetlist,
  onToggleSongInSetlist,
  onDelete,
  onInstall,
  onExportBackup,
  onImportBackup,
  isInSetlist,
  isSongInSetlist,
  setlistNamesForSong,
  setlists,
  activeSetlistId,
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
  filteredSongs: Song[];
  query: string;
  selectedSong: Song | null;
  storageStatus: string;
  canInstall: boolean;
  onQuery: (value: string) => void;
  onOpen: (song: Song) => void;
  onEdit: (song: Song) => void;
  onToggleSetlist: (songId: number) => void;
  onToggleSongInSetlist: (songId: number, setlistId: number) => void;
  onDelete: (songId: number) => void;
  onInstall: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  isInSetlist: (songId: number) => boolean;
  isSongInSetlist: (songId: number, setlistId: number) => boolean;
  setlistNamesForSong: (songId: number) => string[];
  setlists: NamedSetlist[];
  activeSetlistId: number;
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
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="space-y-4">
        <Card>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold">Knižnica piesní</h2>
            <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Hľadať..." className="w-full rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm outline-none md:max-w-xs" />
          </div>
          <div className="space-y-3">
            {!filteredSongs.length && (
              <div className="rounded-2xl bg-zinc-50 p-5 text-sm text-zinc-600 ring-1 ring-zinc-200">
                Knižnica je prázdna. Novú skladbu pridáš cez Import alebo obnovíš zo zálohy.
              </div>
            )}
            {filteredSongs.map((song) => {
              const songSetlists = setlistNamesForSong(song.id);
              const pickerOpen = openSetlistSongId === song.id;

              return (
              <div key={song.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-col gap-2">
                  <div className="text-lg font-semibold">{normalizeSongTitle(song.title)}</div>
                  <div className="text-sm text-zinc-500">{song.artist}</div>
                  <div className="flex flex-wrap gap-2">
                    <Chip>{normalizeKeyInput(song.key)}</Chip>
                    <Chip>{song.bpm} BPM</Chip>
                    <Chip>{song.duration}</Chip>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => onOpen(song)} className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">Otvoriť</button>
                  <button onClick={() => onEdit(song)} className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white">Upraviť</button>
                  {hasMultipleSetlists ? (
                    <div className="relative">
                      <button
                        onClick={() => setOpenSetlistSongId(pickerOpen ? null : song.id)}
                        aria-expanded={pickerOpen}
                        className="rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200"
                      >
                        Setlisty…
                      </button>
                      {pickerOpen && (
                        <div ref={pickerRef} className="absolute left-0 z-20 mt-2 w-72 rounded-2xl bg-white p-3 text-sm shadow-lg ring-1 ring-zinc-200">
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
                    <button onClick={() => onToggleSetlist(song.id)} className={`rounded-2xl px-4 py-2 text-sm font-semibold ring-1 ${isInSetlist(song.id) ? "bg-rose-50 text-rose-800 ring-rose-200" : "bg-zinc-100 text-zinc-800 ring-zinc-200"}`}>{isInSetlist(song.id) ? "Odobrať zo setlistu" : "Pridať do setlistu"}</button>
                  )}
                  <button onClick={() => onDelete(song.id)} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Zmazať</button>
                </div>
                {hasMultipleSetlists && songSetlists.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span>In:</span>
                    {songSetlists.map((name) => <Chip key={name}>{name}</Chip>)}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">PWA / lokálna databáza</h2>
          <div className="mt-3"><InfoBox tone="emerald">{storageStatus}</InfoBox></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {canInstall && <PrimaryButton onClick={onInstall}>Nainštalovať appku</PrimaryButton>}
            <SoftButton onClick={onExportBackup}>Exportovať backup</SoftButton>
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

          <div className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm ring-1 ring-zinc-200">
            <div className="font-semibold text-zinc-800">Google Drive admin</div>
            <div className="mt-1 text-zinc-600">
              {driveFile ? `Drive file: ${driveFile.fileName}` : "Drive file nie je vybraný."}
            </div>
            {!!driveFile?.displayPath && <div className="mt-1 text-xs text-zinc-500">{driveFile.displayPath}</div>}
            <div className="mt-2 text-xs text-zinc-500">{driveConfigured ? driveStatus : driveConfigMessage}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <SoftButton disabled={!driveConfigured} onClick={onChooseDriveFile}>{driveFile ? "Change Drive file" : "Choose Drive file"}</SoftButton>
              <SoftButton disabled={!driveConfigured} onClick={onLoadFromDrive}>Load from Drive</SoftButton>
              <SoftButton disabled={!driveConfigured} onClick={onSaveToDrive}>Save to Drive</SoftButton>
              {driveFile && <SoftButton onClick={onForgetDriveFile}>Zabudnúť Drive file</SoftButton>}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold">Rýchly A4 náhľad</h2>
        <div className="mt-2 text-sm text-zinc-600">Vyber pieseň vľavo a hneď ju vidíš v reálnom papierovom rozložení.</div>
        <div className="mt-4">
          {selectedSong ? (
            <A4Sheet song={selectedSong} sections={buildSections(selectedSong.lines)} />
          ) : (
            <div className="rounded-2xl bg-zinc-50 p-5 text-sm text-zinc-600 ring-1 ring-zinc-200">Nie je vybraná žiadna skladba.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
