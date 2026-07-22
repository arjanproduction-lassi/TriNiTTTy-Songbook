import { useEffect, useRef, useState } from "react";
import type { NamedSetlist, Song } from "../types";
import { FitA4Sheet } from "../components/A4Sheet";
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
  onOpenSongInSetlist,
  onDelete,
  onRestoreDeleted,
  onInstall,
  onExportBackup,
  onDownloadDatabaseCopy,
  onDownloadOfficialLatestCopy,
  onImportBackup,
  isInSetlist,
  isSongInSetlist,
  setlistNamesForSong,
  setlists,
  activeSetlistId,
  projectName,
  onProjectNameChange,
  workingDbFolderSupported,
  workingDbFolderName,
  workingDbFolderStatus,
  onChooseWorkingDbFolder,
  onExportToWorkingDbFolder,
  onImportNewestFromWorkingDbFolder,
  officialDriveDbSourceName,
  officialDriveDbSourceLabel,
  officialDriveDbStatus,
  officialDriveDbLastCheckedVersion,
  officialDriveDbCheckStatus,
  onChooseOfficialDriveDbSource,
  onSaveOfficialDriveDbSourceFromInput,
  onCheckOfficialDriveDbSource,
  onDisconnectOfficialDriveDbSource,
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
  onOpenSongInSetlist: (songId: number, setlistId: number) => void;
  onDelete: (songId: number) => void;
  onRestoreDeleted: (songId: number) => void;
  onInstall: () => void;
  onExportBackup: () => void;
  onDownloadDatabaseCopy: () => void;
  onDownloadOfficialLatestCopy: () => void;
  onImportBackup: (file: File) => void;
  isInSetlist: (songId: number) => boolean;
  isSongInSetlist: (songId: number, setlistId: number) => boolean;
  setlistNamesForSong: (songId: number) => string[];
  setlists: NamedSetlist[];
  activeSetlistId: number;
  projectName: string;
  onProjectNameChange: (value: string) => void;
  workingDbFolderSupported: boolean;
  workingDbFolderName: string | null;
  workingDbFolderStatus: string;
  onChooseWorkingDbFolder: () => void;
  onExportToWorkingDbFolder: () => void;
  onImportNewestFromWorkingDbFolder: () => void;
  officialDriveDbSourceName: string | null;
  officialDriveDbSourceLabel: string | null;
  officialDriveDbStatus: string;
  officialDriveDbLastCheckedVersion: number | null;
  officialDriveDbCheckStatus: "newer" | "same" | "older" | null;
  onChooseOfficialDriveDbSource: () => void;
  onSaveOfficialDriveDbSourceFromInput: (input: string) => void;
  onCheckOfficialDriveDbSource: () => void;
  onDisconnectOfficialDriveDbSource: () => void;
}) {
  const [openSetlistSongId, setOpenSetlistSongId] = useState<number | null>(null);
  const [quickPreviewZoom, setQuickPreviewZoom] = useState(100);
  const [officialDriveDbInput, setOfficialDriveDbInput] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const hasMultipleSetlists = setlists.length > 1;
  const quickPreviewZoomLabel = `${quickPreviewZoom}%`;

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
    <div className="grid min-w-0 items-start gap-3 md:gap-6 xl:gap-4 lg:grid-cols-[minmax(320px,0.82fr)_minmax(520px,1.18fr)] xl:grid-cols-[minmax(300px,0.7fr)_minmax(640px,1.3fr)]">
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
              const songSetlistEntries = setlists.filter((setlist) => setlist.songIds.includes(song.id));
              const pickerOpen = openSetlistSongId === song.id;

              return (
              <div key={song.id} className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 p-3 md:rounded-2xl md:p-4 xl:p-3">
                <div className="flex min-w-0 flex-col gap-1 md:gap-2 xl:gap-1">
                  <div className="min-w-0 break-words text-base font-semibold md:text-lg xl:text-base">
                    {normalizeSongTitle(song.title)}
                    {(song.notes || "").trim() && <span className="ml-1 align-middle" title="Poznámka ku skladbe">📝</span>}
                  </div>
                  <div className="text-sm text-zinc-500">{song.artist}</div>
                  <div className="flex flex-wrap gap-1.5 md:gap-2 xl:gap-1.5">
                    <Chip>{normalizeKeyInput(song.key)}</Chip>
                    <Chip>{song.bpm} BPM</Chip>
                    <Chip>{song.duration}</Chip>
                  </div>
                </div>
                <div className="mt-3 flex min-w-0 flex-wrap gap-1.5 md:mt-4 md:gap-2 xl:mt-2 xl:gap-1.5">
                  <button onClick={() => onOpen(song)} className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white xl:py-1.5">Otvoriť</button>
                  <button onClick={() => onEdit(song)} className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white xl:py-1.5">Upraviť</button>
                  {hasMultipleSetlists ? (
                    <div className="relative min-w-0">
                      <button
                        onClick={() => setOpenSetlistSongId(pickerOpen ? null : song.id)}
                        aria-expanded={pickerOpen}
                        className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 xl:py-1.5"
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
                    <button onClick={() => onToggleSetlist(song.id)} className={`rounded-xl px-3 py-2 text-sm font-semibold ring-1 xl:py-1.5 ${isInSetlist(song.id) ? "bg-rose-50 text-rose-800 ring-rose-200" : "bg-zinc-100 text-zinc-800 ring-zinc-200"}`}>{isInSetlist(song.id) ? "Odobrať zo setlistu" : "Pridať do setlistu"}</button>
                  )}
                  <button onClick={() => onDelete(song.id)} className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white xl:py-1.5">Odstrániť</button>
                </div>
                {hasMultipleSetlists && songSetlists.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 md:mt-3 md:gap-2 xl:mt-2 xl:gap-1.5">
                    <span>In:</span>
                    {songSetlistEntries.map((setlist) => (
                      <button
                        key={setlist.id}
                        type="button"
                        onClick={() => onOpenSongInSetlist(song.id, setlist.id)}
                        className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                        title={`Otvoriť v setliste ${setlist.name}`}
                      >
                        {setlist.name}
                      </button>
                    ))}
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
          <div className="mt-3 rounded-2xl bg-zinc-50 p-3 text-sm ring-1 ring-zinc-200 md:mt-4 md:p-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Názov projektu / kapely</label>
            <input
              value={projectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              placeholder="TriNiTTTy"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none"
            />
            <div className="mt-2 text-xs text-zinc-500">Používa sa v hlavičke appky a názvoch exportov databázy.</div>
          </div>
          <div className="mt-3 rounded-2xl bg-zinc-50 p-3 text-sm ring-1 ring-zinc-200 md:mt-4 md:p-4">
            <div className="font-semibold text-zinc-900">Pracovný DB priečinok</div>
            <p className="mt-1 text-xs leading-snug text-zinc-500">
              Voliteľný lokálny priečinok pre ručný export/import JSON databáz. Nie je to sync.
            </p>
            <div className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200">
              {workingDbFolderStatus}
              {workingDbFolderName && <span className="mt-1 block text-zinc-500">Priečinok: {workingDbFolderName}</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 md:gap-2">
              <SoftButton
                onClick={onChooseWorkingDbFolder}
                disabled={!workingDbFolderSupported}
                className="disabled:cursor-not-allowed disabled:opacity-50"
              >
                Vybrať DB priečinok
              </SoftButton>
              <SoftButton
                onClick={onExportToWorkingDbFolder}
                disabled={!workingDbFolderSupported || !workingDbFolderName}
                className="disabled:cursor-not-allowed disabled:opacity-50"
              >
                Uložiť DB do priečinka
              </SoftButton>
              <SoftButton
                onClick={onImportNewestFromWorkingDbFolder}
                disabled={!workingDbFolderSupported || !workingDbFolderName}
                className="disabled:cursor-not-allowed disabled:opacity-50"
              >
                Načítať najnovšiu DB z priečinka
              </SoftButton>
            </div>
            {!workingDbFolderSupported && (
              <p className="mt-2 text-xs text-zinc-500">Použi klasický export/import nižšie.</p>
            )}
          </div>
          <div className="mt-3 rounded-2xl bg-zinc-50 p-3 text-sm ring-1 ring-zinc-200 md:mt-4 md:p-4">
            <div className="font-semibold text-zinc-900">Google Drive DB zdroj</div>
            <p className="mt-1 text-xs leading-snug text-zinc-500">
              Sleduje jeden vybraný oficiálny JSON súbor. Kontrola je vždy ručná, nie automatický sync.
            </p>
            <div className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200">
              {officialDriveDbStatus}
              {officialDriveDbSourceName && <span className="mt-1 block text-zinc-500">Súbor: {officialDriveDbSourceName}</span>}
              {officialDriveDbSourceLabel && <span className="mt-1 block text-zinc-500">Uložené: {officialDriveDbSourceLabel}</span>}
              {officialDriveDbLastCheckedVersion && <span className="mt-1 block text-zinc-500">Naposledy nájdená DB: v{String(officialDriveDbLastCheckedVersion).padStart(3, "0")}</span>}
              {officialDriveDbCheckStatus === "newer" && <span className="mt-1 block text-emerald-700">Novšia Drive DB bola nájdená.</span>}
              {officialDriveDbCheckStatus === "same" && <span className="mt-1 block text-zinc-500">Drive DB je zhodná s lokálnou po poslednej kontrole.</span>}
              {officialDriveDbCheckStatus === "older" && <span className="mt-1 block text-amber-700">Drive DB je staršia než lokálna.</span>}
            </div>
            <div className="mt-3 rounded-xl bg-white p-2.5 ring-1 ring-zinc-200">
              <label className="block text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Drive link / file ID
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={officialDriveDbInput}
                  onChange={(event) => setOfficialDriveDbInput(event.target.value)}
                  placeholder="Vlož odkaz na TriNiTTTy_latest.json alebo file ID"
                  className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none"
                />
                <SoftButton
                  onClick={() => {
                    onSaveOfficialDriveDbSourceFromInput(officialDriveDbInput);
                    setOfficialDriveDbInput("");
                  }}
                >
                  Uložiť link/ID
                </SoftButton>
              </div>
              <p className="mt-2 text-xs leading-snug text-zinc-500">
                Skopíruj odkaz na oficiálny JSON súbor z Google Drive a vlož ho sem.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 md:gap-2">
              <SoftButton
                onClick={onCheckOfficialDriveDbSource}
                disabled={!officialDriveDbSourceName}
                className="disabled:cursor-not-allowed disabled:opacity-50"
              >
                Skontrolovať DB z Google Drive
              </SoftButton>
              <SoftButton
                onClick={onDisconnectOfficialDriveDbSource}
                disabled={!officialDriveDbSourceName}
                className="disabled:cursor-not-allowed disabled:opacity-50"
              >
                Odpojiť Drive zdroj
              </SoftButton>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 md:mt-4 md:gap-2">
            {canInstall && <PrimaryButton onClick={onInstall}>Nainštalovať appku</PrimaryButton>}
            <SoftButton onClick={canonicalDirty ? onExportBackup : onDownloadDatabaseCopy}>{canonicalDirty ? "Exportovať databázu" : "Stiahnuť kópiu DB"}</SoftButton>
            <SoftButton onClick={onDownloadOfficialLatestCopy}>Stiahnuť latest kópiu</SoftButton>
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
        </Card>
      </div>

      <Card className="order-1 min-w-0 lg:sticky lg:top-4 lg:order-2 lg:max-h-[calc(100svh-2rem)] lg:overflow-hidden xl:max-h-[calc(100svh-1rem)]">
        <div className="sticky top-0 z-10 -mx-3 -mt-3 border-b border-zinc-200 bg-white/95 px-3 py-3 backdrop-blur print:hidden md:-mx-4 md:-mt-4 md:px-4 xl:py-2">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold xl:text-lg">Rýchly A4 náhľad</h2>
              <div className="mt-1 text-sm text-zinc-600 xl:hidden">Vyber pieseň vľavo a hneď ju vidíš v reálnom papierovom rozložení.</div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-sm">
              <button
                type="button"
                onClick={() => {
                  setQuickPreviewZoom(100);
                }}
                className={`rounded-xl px-3 py-2 font-semibold ring-1 ${quickPreviewZoom === 100 ? "bg-zinc-900 text-white ring-zinc-900" : "bg-zinc-100 text-zinc-800 ring-zinc-200"}`}
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setQuickPreviewZoom((value) => Math.max(60, value - 10))}
                className="rounded-xl bg-zinc-100 px-3 py-2 font-semibold text-zinc-800 ring-1 ring-zinc-200"
              >
                -
              </button>
              <span className="min-w-[3rem] rounded-xl bg-white px-3 py-2 text-center text-xs font-bold text-zinc-600 ring-1 ring-zinc-200">{quickPreviewZoomLabel}</span>
              <button
                type="button"
                onClick={() => setQuickPreviewZoom((value) => Math.min(160, value + 10))}
                className="rounded-xl bg-zinc-100 px-3 py-2 font-semibold text-zinc-800 ring-1 ring-zinc-200"
              >
                +
              </button>
            </div>
          </div>
        </div>
        <div className="pt-3 xl:pt-2">
          {selectedSong ? (
            <FitA4Sheet
              song={selectedSong}
              sections={buildSections(selectedSong.lines)}
              readerZoom={quickPreviewZoom}
              fitMode="fit"
              minZoom={60}
              maxZoom={160}
              className="h-[72svh] rounded-3xl ring-1 ring-zinc-200 lg:h-[calc(100svh-13rem)] xl:h-[calc(100svh-8rem)]"
            />
          ) : (
            <div className="rounded-2xl bg-zinc-50 p-5 text-sm text-zinc-600 ring-1 ring-zinc-200">Nie je vybraná žiadna skladba.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
