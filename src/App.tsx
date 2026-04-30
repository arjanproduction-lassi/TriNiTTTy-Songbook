import { useEffect, useMemo, useState } from "react";
import type { DriveFileMemory, ImportDraft, ImportMode, Line, NamedSetlist, Notation, PersistedState, Song, View } from "./types";
import { DEFAULT_DRAFT, DEFAULT_IMPORT_TEXT } from "./data/defaultImport";
import { INITIAL_SONGS } from "./data/songs";
import { NavButton } from "./components/ui";
import { A4Page } from "./components/A4Sheet";
import { makePairLine } from "./lib/chordAnchors";
import { normalizeKeyInput, transposeSong } from "./lib/chords";
import { buildSections, cleanImportText, makeSong, normalizeSongTitle, parseImportText, serializeLines } from "./lib/import";
import { copyText, songToWordText } from "./lib/export";
import { clearState, downloadBackup, loadState, makePersistedBackup, readBackupFile, saveState } from "./pwa/db";
import { SERVICE_WORKER_UPDATE_EVENT, activateWaitingServiceWorker } from "./pwa/registerServiceWorker";
import { useInstallPrompt } from "./pwa/useInstallPrompt";
import { chooseDriveJsonFile, googleDriveConfigMessage, isGoogleDriveConfigured, loadBackupFromDrive, saveBackupToDrive } from "./pwa/googleDrive";
import { SongsView } from "./views/SongsView";
import { ImportView } from "./views/ImportView";
import { SongView } from "./views/SongView";
import { SetlistView } from "./views/SetlistView";
import { PerformanceView } from "./views/PerformanceView";
import { APP_VERSION, BUILD_DATE, RC_MARKER } from "./buildInfo";

const LEGACY_STORAGE_KEYS = ["trinittty-phase1-wide-t8", "trinittty-phase1-lean-t3"];
const DEFAULT_SETLISTS: NamedSetlist[] = [{ id: 1, name: "Setlist 1", songIds: [1, 2] }];
const CANONICAL_STATUS_KEY = "trinittty-canonical-save-status";

type CanonicalSaveStatus = {
  dirty: boolean;
  lastCanonicalSaveAt: string | null;
};

export default function App() {
  const [songs, setSongs] = useState<Song[]>(INITIAL_SONGS);
  const [view, setView] = useState<View>("songs");
  const [query, setQuery] = useState("");
  const [selectedSongId, setSelectedSongId] = useState(1);
  const [transpose, setTranspose] = useState(0);
  const [notation, setNotation] = useState<Notation>("intl");
  const [setlist, setSetlist] = useState<number[]>([1, 2]);
  const [setlists, setSetlists] = useState<NamedSetlist[]>(DEFAULT_SETLISTS);
  const [activeSetlistId, setActiveSetlistId] = useState(1);
  const [setlistPreviewSongId, setSetlistPreviewSongId] = useState(1);
  const [performanceIndex, setPerformanceIndex] = useState(0);
  const [importMode, setImportMode] = useState<ImportMode>("raw");
  const [selectedImportIndex, setSelectedImportIndex] = useState<number | null>(null);
  const [editingSongId, setEditingSongId] = useState<number | null>(null);
  const [importSplit, setImportSplit] = useState(30);
  const [workSplit, setWorkSplit] = useState(47);
  const [leftEditorSplit, setLeftEditorSplit] = useState(46);
  const [importLines, setImportLines] = useState<Line[]>(() => parseImportText(DEFAULT_IMPORT_TEXT));
  const [draft, setDraft] = useState<ImportDraft>(DEFAULT_DRAFT);
  const [copyStatus, setCopyStatus] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [storageStatus, setStorageStatus] = useState("Načítavam lokálnu databázu...");
  const [canonicalSaveStatus, setCanonicalSaveStatus] = useState<CanonicalSaveStatus>(() => readCanonicalSaveStatus());
  const [lastLocalAutosaveAt, setLastLocalAutosaveAt] = useState<string | null>(null);
  const [driveFile, setDriveFile] = useState<DriveFileMemory | null>(null);
  const [driveStatus, setDriveStatus] = useState("Drive admin sync je vypnutý.");
  const [serviceWorkerUpdateReady, setServiceWorkerUpdateReady] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [printJob, setPrintJob] = useState<Song | null>(null);
  const { canInstall, installed, install } = useInstallPrompt();

  const persistedState = useMemo(() => makePersistedBackup({
    songs,
    setlist,
    setlists,
    activeSetlistId,
    selectedSongId,
    setlistPreviewSongId,
    performanceIndex,
    transpose,
    notation,
    draft,
    driveFile,
  }), [songs, setlist, setlists, activeSetlistId, selectedSongId, setlistPreviewSongId, performanceIndex, transpose, notation, draft, driveFile]);

  useEffect(() => {
    let cancelled = false;
    loadState().then((state) => {
      if (cancelled) return;
      if (state) {
        applyPersistedState(state);
        setStorageStatus(`Načítané z lokálnej databázy: ${state.songs.length} piesne.`);
      } else {
        const migrated = loadLegacyState();
        if (migrated) {
          applyPersistedState(migrated);
          setStorageStatus(`Migrované zo starého localStorage: ${migrated.songs.length} piesne.`);
        } else {
          setStorageStatus("Lokálna databáza pripravená. Piesne sa budú ukladať automaticky.");
        }
      }
      setStorageReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onUpdateReady = () => setServiceWorkerUpdateReady(true);
    const updateOnline = () => setOnline(navigator.onLine);

    window.addEventListener(SERVICE_WORKER_UPDATE_EVENT, onUpdateReady);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    return () => {
      window.removeEventListener(SERVICE_WORKER_UPDATE_EVENT, onUpdateReady);
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    writeCanonicalSaveStatus(canonicalSaveStatus);
  }, [canonicalSaveStatus]);

  useEffect(() => {
    if (!canonicalSaveStatus.dirty) return undefined;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [canonicalSaveStatus.dirty]);

  useEffect(() => {
    if (!printJob) return undefined;

    const afterPrint = () => setPrintJob(null);
    window.addEventListener("afterprint", afterPrint);
    const timer = window.setTimeout(() => window.print(), 50);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, [printJob]);

  useEffect(() => {
    if (!storageReady) return;
    const timer = window.setTimeout(() => {
      saveState(persistedState)
        .then(() => {
          const now = new Date().toISOString();
          setLastLocalAutosaveAt(now);
          setStorageStatus(`Uložené lokálne: ${songs.length} piesne, setlist ${setlist.length}.`);
        })
        .catch(() => setStorageStatus("Lokálne uloženie zlyhalo. Skús exportovať backup."));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [storageReady, persistedState, songs.length, setlist.length]);

  useEffect(() => {
    setSetlists((current) => {
      if (!current.some((item) => item.id === activeSetlistId)) return current;
      return current.map((item) => (item.id === activeSetlistId ? { ...item, songIds: setlist } : item));
    });
  }, [activeSetlistId, setlist]);

  useEffect(() => {
    if (!songs.length) {
      if (setlist.length) setSetlist([]);
      if (selectedSongId !== 0) setSelectedSongId(0);
      if (setlistPreviewSongId !== 0) setSetlistPreviewSongId(0);
      if (performanceIndex !== 0) setPerformanceIndex(0);
      return;
    }
    const validIds = new Set(songs.map((song) => song.id));
    setSetlists((current) => current.map((item) => ({ ...item, songIds: item.songIds.filter((id) => validIds.has(id)) })));
    const cleanedSetlist = setlist.filter((id) => validIds.has(id));
    if (cleanedSetlist.length !== setlist.length) {
      setSetlist(cleanedSetlist);
      return;
    }
    if (!validIds.has(selectedSongId)) setSelectedSongId(songs[0].id);
    if (!validIds.has(setlistPreviewSongId)) setSetlistPreviewSongId(cleanedSetlist[0] ?? songs[0].id);
    if (performanceIndex > Math.max(0, cleanedSetlist.length - 1)) setPerformanceIndex(Math.max(0, cleanedSetlist.length - 1));
  }, [songs, setlist, selectedSongId, setlistPreviewSongId, performanceIndex]);

  const filteredSongs = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? songs.filter((song) => `${normalizeSongTitle(song.title)} ${song.artist}`.toLowerCase().includes(q)) : songs;
  }, [songs, query]);

  const activeImportLines = useMemo(() => importMode === "block" ? importLines : parseImportText(draft.rawText), [importMode, importLines, draft.rawText]);
  const activeImportSections = useMemo(() => buildSections(activeImportLines), [activeImportLines]);
  const activeImportSong = useMemo(() => makeSong(draft, activeImportLines, 999), [draft, activeImportLines]);
  const selectedImportLine = importMode === "block" && selectedImportIndex !== null ? importLines[selectedImportIndex] ?? null : null;

  const selectedSong = songs.find((song) => song.id === selectedSongId) || songs[0] || null;
  const renderedSong = useMemo(() => selectedSong ? transposeSong(selectedSong, transpose, notation) : null, [selectedSong, transpose, notation]);
  const selectedSongSections = useMemo(() => renderedSong ? buildSections(renderedSong.lines) : [], [renderedSong]);

  const setlistSongs = setlist.map((id) => songs.find((song) => song.id === id)).filter(Boolean) as Song[];
  const activeSetlist = setlists.find((item) => item.id === activeSetlistId) ?? setlists[0] ?? DEFAULT_SETLISTS[0];
  const setlistPreviewSong = songs.find((song) => song.id === setlistPreviewSongId) || setlistSongs[0] || songs[0] || null;
  const renderedSetlistPreview = useMemo(() => setlistPreviewSong ? transposeSong(setlistPreviewSong, transpose, notation) : null, [setlistPreviewSong, transpose, notation]);
  const setlistPreviewSections = useMemo(() => renderedSetlistPreview ? buildSections(renderedSetlistPreview.lines) : [], [renderedSetlistPreview]);

  const performanceSong = setlistSongs[performanceIndex] || setlistSongs[0] || songs[0] || null;
  const renderedPerformance = useMemo(() => performanceSong ? transposeSong(performanceSong, transpose, notation) : null, [performanceSong, transpose, notation]);
  const performanceSections = useMemo(() => renderedPerformance ? buildSections(renderedPerformance.lines) : [], [renderedPerformance]);

  function applyPersistedState(state: PersistedState) {
    const safeSongs = state.songs;
    const safeIds = new Set(safeSongs.map((song) => song.id));
    const safeSetlists = normalizeNamedSetlists(state.setlists, state.setlist, safeIds);
    const safeActiveSetlistId = safeSetlists.some((item) => item.id === state.activeSetlistId) ? state.activeSetlistId : safeSetlists[0].id;
    const safeSetlist = (safeSetlists.find((item) => item.id === safeActiveSetlistId)?.songIds ?? []).filter((id) => safeIds.has(id));
    const fallbackId = safeSongs[0]?.id ?? 0;
    setSongs(safeSongs);
    setSetlists(safeSetlists);
    setActiveSetlistId(safeActiveSetlistId);
    setSetlist(safeSetlist);
    setSelectedSongId(safeIds.has(state.selectedSongId) ? state.selectedSongId : fallbackId);
    setSetlistPreviewSongId(safeIds.has(state.setlistPreviewSongId) ? state.setlistPreviewSongId : safeSetlist[0] ?? fallbackId);
    setPerformanceIndex(Math.min(state.performanceIndex || 0, Math.max(0, safeSetlist.length - 1)));
    setTranspose(state.transpose || 0);
    setNotation(state.notation === "de" ? "de" : "intl");
    setDraft(state.draft || DEFAULT_DRAFT);
    setDriveFile(state.driveFile || null);
    setImportLines(parseImportText((state.draft || DEFAULT_DRAFT).rawText));
  }

  function markCanonicalDirty() {
    setCanonicalSaveStatus((current) => current.dirty ? current : { ...current, dirty: true });
  }

  function markCanonicalSaved(savedAt = new Date().toISOString()) {
    setCanonicalSaveStatus({ dirty: false, lastCanonicalSaveAt: savedAt });
  }

  function saveCanonicalDatabase() {
    try {
      const savedAt = new Date().toISOString();
      downloadBackup({ ...persistedState, savedAt });
      markCanonicalSaved(savedAt);
      setStorageStatus(`Databáza exportovaná: ${formatShortTime(savedAt)}.`);
    } catch {
      setStorageStatus("Export databázy zlyhal. Neuložené zmeny ostávajú aktívne.");
    }
  }

  function commitImportLines(nextLines: Line[]) {
    setImportLines(nextLines);
    setDraft((current) => ({ ...current, rawText: serializeLines(nextLines) }));
  }

  function enterBlockImportMode() {
    const cleaned = cleanImportText(draft.rawText);
    const parsed = parseImportText(cleaned);
    setDraft((current) => ({ ...current, rawText: cleaned }));
    setImportLines(parsed);
    setImportMode("block");
    setSelectedImportIndex(firstEditableIndex(parsed));
  }

  function saveImportedSong() {
    const linesForSave = importMode === "block" ? importLines : parseImportText(cleanImportText(draft.rawText));
    const normalizedDraft = { ...draft, title: normalizeSongTitle(draft.title), rawText: serializeLines(linesForSave) };

    if (editingSongId !== null) {
      const title = normalizeSongTitle(normalizedDraft.title || songs.find((song) => song.id === editingSongId)?.title || "bez názvu");
      if (!window.confirm(`Naozaj chceš prepísať skladbu "${title}"? Pôvodná verzia bude nahradená.`)) return;

      const updatedSong = makeSong(normalizedDraft, linesForSave, editingSongId);
      setSongs((prev) => prev.map((song) => (song.id === editingSongId ? updatedSong : song)));
      markCanonicalDirty();
      setSelectedSongId(editingSongId);
      setSetlistPreviewSongId(editingSongId);
      setEditingSongId(null);
      setView("song");
      return;
    }

    const newId = Math.max(...songs.map((song) => song.id), 0) + 1;
    const newSong = makeSong(normalizedDraft, linesForSave, newId);
    setSongs((prev) => [newSong, ...prev]);
    markCanonicalDirty();
    setSelectedSongId(newId);
    setSetlistPreviewSongId(newId);
    setView("song");
  }

  function startEditingSong(song: Song) {
    const rawText = serializeLines(song.lines);
    const clonedLines = parseImportText(rawText);
    setDraft({
      title: normalizeSongTitle(song.title),
      artist: song.artist,
      bpm: String(song.bpm),
      key: normalizeKeyInput(song.key),
      duration: song.duration,
      capo: song.capo,
      rawText,
    });
    setImportLines(clonedLines);
    setSelectedImportIndex(firstEditableIndex(clonedLines));
    setImportMode("block");
    setEditingSongId(song.id);
    setView("import");
  }

  function resetImportTemplate() {
    setEditingSongId(null);
    setImportMode("raw");
    setImportSplit(30);
    setWorkSplit(47);
    setLeftEditorSplit(46);
    setImportLines(parseImportText(DEFAULT_IMPORT_TEXT));
    setSelectedImportIndex(null);
    setDraft(DEFAULT_DRAFT);
  }

  function replaceImportLine(index: number, nextLine: Line) {
    commitImportLines(importLines.map((line, i) => (i === index ? nextLine : line)));
  }

  function insertImportLine(index: number, direction: "above" | "below") {
    const at = direction === "above" ? index : index + 1;
    const blankLine: Line = { type: "lyrics", text: "" };
    commitImportLines([...importLines.slice(0, at), blankLine, ...importLines.slice(at)]);
    setSelectedImportIndex(at);
  }

  function deleteImportLine(index: number) {
    if (importLines.length <= 1) return;
    const next = importLines.filter((_, i) => i !== index);
    commitImportLines(next);
    setSelectedImportIndex(Math.min(index, next.length - 1));
  }

  function toggleSetlist(songId: number) {
    markCanonicalDirty();
    setSetlist((prev) => (prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId]));
    setSetlistPreviewSongId(songId);
  }

  function toggleSongInNamedSetlist(songId: number, setlistId: number) {
    markCanonicalDirty();
    setSetlists((prev) => prev.map((item) => {
      if (item.id !== setlistId) return item;
      const songIds = item.songIds.includes(songId)
        ? item.songIds.filter((id) => id !== songId)
        : [...item.songIds, songId];
      return { ...item, songIds };
    }));

    if (setlistId === activeSetlistId) {
      setSetlist((prev) => (prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId]));
      setSetlistPreviewSongId(songId);
    }
  }

  function switchSetlist(id: number) {
    const nextSetlist = setlists.find((item) => item.id === id);
    if (!nextSetlist) return;
    setActiveSetlistId(id);
    setSetlist(nextSetlist.songIds);
    setSetlistPreviewSongId(nextSetlist.songIds[0] ?? songs[0]?.id ?? 0);
    setPerformanceIndex(0);
  }

  function createSetlist(name: string) {
    markCanonicalDirty();
    const normalizedName = name.trim() || `Setlist ${setlists.length + 1}`;
    const id = Math.max(0, ...setlists.map((item) => item.id)) + 1;
    const nextSetlist: NamedSetlist = { id, name: normalizedName, songIds: [] };
    setSetlists((prev) => [...prev, nextSetlist]);
    setActiveSetlistId(id);
    setSetlist([]);
    setSetlistPreviewSongId(songs[0]?.id ?? 0);
    setPerformanceIndex(0);
  }

  function renameSetlist(name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) return;
    if (activeSetlist.name === normalizedName) return;
    markCanonicalDirty();
    setSetlists((prev) => prev.map((item) => (item.id === activeSetlistId ? { ...item, name: normalizedName } : item)));
  }

  function deleteActiveSetlist() {
    if (setlists.length <= 1) return;
    if (!window.confirm(`Zmazať setlist "${activeSetlist.name}"? Skladby v knižnici ostanú zachované.`)) return;
    markCanonicalDirty();
    const remaining = setlists.filter((item) => item.id !== activeSetlistId);
    const nextSetlist = remaining[0] ?? DEFAULT_SETLISTS[0];
    setSetlists(remaining);
    setActiveSetlistId(nextSetlist.id);
    setSetlist(nextSetlist.songIds);
    setSetlistPreviewSongId(nextSetlist.songIds[0] ?? songs[0]?.id ?? 0);
    setPerformanceIndex(0);
  }

  function moveSetlist(index: number, dir: number) {
    const target = index + dir;
    if (target < 0 || target >= setlist.length) return;
    markCanonicalDirty();
    setSetlist((prev) => {
      const next = [...prev];
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeFromSetlist(index: number) {
    markCanonicalDirty();
    setSetlist((prev) => prev.filter((_, i) => i !== index));
    setPerformanceIndex((current) => Math.max(0, Math.min(current, setlist.length - 2)));
  }

  function deleteSong(songId: number) {
    const song = songs.find((item) => item.id === songId);
    if (song && !window.confirm(`Zmazať skladbu "${normalizeSongTitle(song.title)}"?`)) return;

    const nextSongs = songs.filter((item) => item.id !== songId);
    const nextSetlist = setlist.filter((id) => id !== songId);
    const fallbackId = nextSongs[0]?.id ?? 0;
    setSongs(nextSongs);
    markCanonicalDirty();
    setSetlist(nextSetlist);
    if (selectedSongId === songId) setSelectedSongId(fallbackId);
    if (setlistPreviewSongId === songId) setSetlistPreviewSongId(nextSetlist[0] ?? fallbackId);
    setPerformanceIndex((index) => Math.min(index, Math.max(0, nextSetlist.length - 1)));
  }

  async function copySong(song: Song) {
    try {
      const ok = await copyText(songToWordText(song));
      setCopyStatus(ok ? "Skopírované do schránky." : "Kopírovanie sa nepodarilo.");
    } catch {
      setCopyStatus("Kopírovanie sa nepodarilo.");
    }
  }

  async function importBackup(file: File) {
    try {
      const state = await readBackupFile(file);
      applyPersistedState(state);
      markCanonicalSaved(state.savedAt);
      setStorageStatus(`Backup importovaný: ${state.songs.length} piesne.`);
    } catch {
      setStorageStatus("Backup sa nepodarilo importovať. Súbor nevyzerá správne.");
    }
  }

  async function chooseDriveFile() {
    try {
      const file = await chooseDriveJsonFile();
      setDriveFile(file);
      setDriveStatus(`Drive file: ${file.fileName}`);
    } catch (error) {
      setDriveStatus(error instanceof Error ? error.message : "Výber Drive súboru zlyhal.");
    }
  }

  async function loadFromDrive() {
    try {
      const file = driveFile || await chooseDriveJsonFile();
      const state = await loadBackupFromDrive(file.fileId);
      applyPersistedState(state);
      setDriveFile(file);
      markCanonicalSaved(state.savedAt);
      setDriveStatus(`Načítané z Drive: ${file.fileName}`);
    } catch (error) {
      setDriveStatus(error instanceof Error ? error.message : "Load from Drive zlyhal.");
    }
  }

  async function saveToDrive() {
    try {
      const file = driveFile || await chooseDriveJsonFile();
      const stateForDrive: PersistedState = { ...persistedState, driveFile: file, savedAt: new Date().toISOString() };
      await saveBackupToDrive(file.fileId, stateForDrive);
      setDriveFile(file);
      markCanonicalSaved(stateForDrive.savedAt);
      setDriveStatus(`Uložené do Drive: ${file.fileName}`);
    } catch (error) {
      setDriveStatus(error instanceof Error ? error.message : "Save to Drive zlyhal.");
    }
  }

  async function resetStoredAppData() {
    if (!window.confirm("Naozaj chceš zmazať lokálne uložené dáta a vrátiť demo stav?")) return;
    await clearState();
    LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    setSongs(INITIAL_SONGS);
    setView("songs");
    setQuery("");
    setSelectedSongId(INITIAL_SONGS[0].id);
    setTranspose(0);
    setNotation("intl");
    setSetlist([1, 2]);
    setSetlists(DEFAULT_SETLISTS);
    setActiveSetlistId(1);
    setSetlistPreviewSongId(1);
    setPerformanceIndex(0);
    setImportMode("raw");
    setSelectedImportIndex(null);
    setEditingSongId(null);
    setImportSplit(30);
    setWorkSplit(47);
    setLeftEditorSplit(46);
    setImportLines(parseImportText(DEFAULT_IMPORT_TEXT));
    setDraft(DEFAULT_DRAFT);
    setDriveFile(null);
    setDriveStatus("Drive admin sync je vypnutý.");
    markCanonicalDirty();
    setStorageStatus("Dáta resetované na demo stav.");
  }

  const isInSetlist = (songId: number) => setlist.includes(songId);
  const isSongInSetlist = (songId: number, setlistId: number) => setlists.some((item) => item.id === setlistId && item.songIds.includes(songId));
  const setlistNamesForSong = (songId: number) => setlists.filter((item) => item.songIds.includes(songId)).map((item) => item.name);
  const openSong = (song: Song) => { setSelectedSongId(song.id); setTranspose(0); setView("song"); };
  const openInSetlist = (songId: number) => { setSetlistPreviewSongId(songId); setView("setlist"); };
  const printA4Song = (song: Song) => setPrintJob(song);
  const startPerformance = () => {
    const selectedIndex = setlistPreviewSong ? setlist.findIndex((id) => id === setlistPreviewSong.id) : -1;
    setPerformanceIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setView("performance");
  };
  const startPerformanceAt = (index: number) => {
    setPerformanceIndex(Math.max(0, Math.min(index, setlistSongs.length - 1)));
    setView("performance");
  };
  const backToSetlistFromPerformance = () => {
    const currentSong = setlistSongs[performanceIndex];
    if (currentSong) setSetlistPreviewSongId(currentSong.id);
    setView("setlist");
  };
  const performanceView = view === "performance";
  const canonicalDirty = canonicalSaveStatus.dirty;
  const canonicalStatusText = canonicalDirty
    ? "Neuložené zmeny v databáze"
    : canonicalSaveStatus.lastCanonicalSaveAt
      ? `Databáza uložená: ${formatShortTime(canonicalSaveStatus.lastCanonicalSaveAt)}`
      : "Databáza zatiaľ nebola exportovaná";
  const localAutosaveText = lastLocalAutosaveAt ? `Lokálne uložené: ${formatShortTime(lastLocalAutosaveAt)}` : "Lokálne autosave pripravené";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className={performanceView ? "min-h-screen" : "mx-auto max-w-[1600px] p-4 md:p-6"}>
        {!performanceView && (
        <div className="mb-6 rounded-3xl bg-gradient-to-br from-white to-zinc-100 p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">TriNiTTTy</div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">Songbook PWA MVP</h1>
              {!online && <p className="mt-1 text-xs font-semibold text-amber-700">Offline režim: pracuješ z lokálnej databázy a cache.</p>}
              <p className="mt-1 text-sm text-zinc-600">Knižnica, import/edit, A4 preview, setlist, performance, transpozitor, lokálna databáza.</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400">{RC_MARKER} · v{APP_VERSION} · build {BUILD_DATE}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-2xl px-3 py-2 text-sm font-bold ring-1 ${canonicalDirty ? "bg-amber-50 text-amber-900 ring-amber-300" : "bg-emerald-50 text-emerald-900 ring-emerald-200"}`}>
                  {canonicalStatusText}
                </span>
                <span className="rounded-2xl bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200">{localAutosaveText}</span>
              </div>
              {installed && <p className="mt-1 text-xs font-semibold text-emerald-700">Appka je nainštalovaná.</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <NavButton current={view} target="songs" onClick={setView}>Piesne</NavButton>
              <NavButton current={view} target="import" onClick={setView}>Import</NavButton>
              <NavButton current={view} target="song" onClick={setView}>Náhľad</NavButton>
              <NavButton current={view} target="setlist" onClick={setView}>Setlist</NavButton>
              <button onClick={saveCanonicalDatabase} className={`rounded-2xl px-4 py-2 text-sm font-bold ring-1 ${canonicalDirty ? "bg-amber-500 text-white ring-amber-500 hover:bg-amber-600" : "bg-white text-emerald-800 ring-emerald-200 hover:bg-emerald-50"}`}>Uložiť databázu</button>
              {serviceWorkerUpdateReady && (
                <button onClick={activateWaitingServiceWorker} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Aktualizovať appku</button>
              )}
              <button onClick={() => { void resetStoredAppData(); }} className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50">Reset dát</button>
            </div>
          </div>
        </div>
        )}

        {view === "songs" && (
          <SongsView
            songs={songs}
            filteredSongs={filteredSongs}
            query={query}
            selectedSong={selectedSong}
            storageStatus={storageStatus}
            canInstall={canInstall}
            onQuery={setQuery}
            onOpen={openSong}
            onEdit={startEditingSong}
            onToggleSetlist={toggleSetlist}
            onToggleSongInSetlist={toggleSongInNamedSetlist}
            onDelete={deleteSong}
            onInstall={() => { void install(); }}
            onExportBackup={saveCanonicalDatabase}
            onImportBackup={(file) => { void importBackup(file); }}
            isInSetlist={isInSetlist}
            isSongInSetlist={isSongInSetlist}
            setlistNamesForSong={setlistNamesForSong}
            setlists={setlists}
            activeSetlistId={activeSetlistId}
            driveFile={driveFile}
            driveStatus={driveStatus}
            driveConfigured={isGoogleDriveConfigured()}
            driveConfigMessage={googleDriveConfigMessage()}
            onChooseDriveFile={() => { void chooseDriveFile(); }}
            onLoadFromDrive={() => { void loadFromDrive(); }}
            onSaveToDrive={() => { void saveToDrive(); }}
            onForgetDriveFile={() => {
              setDriveFile(null);
              setDriveStatus("Drive file zabudnutý. Vyber ho znova cez Change Drive file.");
            }}
          />
        )}

        {view === "import" && (
          <ImportView
            importMode={importMode}
            importSplit={importSplit}
            workSplit={workSplit}
            leftEditorSplit={leftEditorSplit}
            draft={draft}
            editingSongId={editingSongId}
            activeImportLines={activeImportLines}
            activeImportSong={activeImportSong}
            activeImportSections={activeImportSections}
            selectedImportIndex={selectedImportIndex}
            selectedImportLine={selectedImportLine}
            setImportSplit={setImportSplit}
            setWorkSplit={setWorkSplit}
            setLeftEditorSplit={setLeftEditorSplit}
            setDraft={setDraft}
            setSelectedImportIndex={setSelectedImportIndex}
            enterBlockImportMode={enterBlockImportMode}
            returnToRawImport={() => { setImportMode("raw"); setSelectedImportIndex(null); }}
            saveImportedSong={saveImportedSong}
            applyImportCleanup={() => setDraft((current) => ({ ...current, rawText: cleanImportText(current.rawText) }))}
            resetImportTemplate={resetImportTemplate}
            replaceImportLine={replaceImportLine}
            insertImportLine={insertImportLine}
            deleteImportLine={deleteImportLine}
          />
        )}

        {view === "song" && (
          <SongView
            songs={songs}
            selectedSongId={selectedSongId}
            selectedSong={selectedSong}
            renderedSong={renderedSong}
            sections={selectedSongSections}
            transpose={transpose}
            notation={notation}
            copyStatus={copyStatus}
            setSelectedSongId={setSelectedSongId}
            setTranspose={setTranspose}
            setNotation={setNotation}
            isInSetlist={isInSetlist}
            toggleSetlist={toggleSetlist}
            startEditingSong={startEditingSong}
            openInSetlist={openInSetlist}
            copySong={copySong}
            deleteSong={deleteSong}
            printSong={printA4Song}
          />
        )}

        {view === "setlist" && (
          <SetlistView
            setlists={setlists}
            activeSetlistId={activeSetlistId}
            setlistSongs={setlistSongs}
            setlistPreviewSong={setlistPreviewSong}
            renderedSetlistPreview={renderedSetlistPreview}
            setlistPreviewSections={setlistPreviewSections}
            transpose={transpose}
            notation={notation}
            setSetlistPreviewSongId={setSetlistPreviewSongId}
            moveSetlist={moveSetlist}
            removeFromSetlist={removeFromSetlist}
            setTranspose={setTranspose}
            setNotation={setNotation}
            switchSetlist={switchSetlist}
            createSetlist={createSetlist}
            renameSetlist={renameSetlist}
            deleteActiveSetlist={deleteActiveSetlist}
            startPerformance={startPerformance}
            startPerformanceAt={startPerformanceAt}
            printSong={printA4Song}
            setView={setView}
          />
        )}

        {view === "performance" && (
          <PerformanceView
            setlistSongs={setlistSongs}
            performanceIndex={performanceIndex}
            renderedPerformance={renderedPerformance}
            originalSong={performanceSong}
            performanceSections={performanceSections}
            setPerformanceIndex={setPerformanceIndex}
            setTranspose={setTranspose}
            transpose={transpose}
            onBackToSetlist={backToSetlistFromPerformance}
          />
        )}

        {printJob && (
          <div className="print-surface">
            <A4Page song={printJob} sections={buildSections(printJob.lines)} responsive={false} />
          </div>
        )}
      </div>
    </div>
  );
}

function firstEditableIndex(lines: Line[]) {
  const firstNonSpace = lines.findIndex((line) => line.type !== "space");
  return firstNonSpace >= 0 ? firstNonSpace : 0;
}

function readCanonicalSaveStatus(): CanonicalSaveStatus {
  try {
    const raw = window.localStorage.getItem(CANONICAL_STATUS_KEY);
    if (!raw) return { dirty: false, lastCanonicalSaveAt: null };

    const parsed = JSON.parse(raw) as Partial<CanonicalSaveStatus>;
    return {
      dirty: Boolean(parsed.dirty),
      lastCanonicalSaveAt: typeof parsed.lastCanonicalSaveAt === "string" ? parsed.lastCanonicalSaveAt : null,
    };
  } catch {
    return { dirty: false, lastCanonicalSaveAt: null };
  }
}

function writeCanonicalSaveStatus(status: CanonicalSaveStatus) {
  try {
    window.localStorage.setItem(CANONICAL_STATUS_KEY, JSON.stringify(status));
  } catch {
    // Local status is helpful, but the app can still run if localStorage is blocked.
  }
}

function formatShortTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
}

function loadLegacyState(): PersistedState | null {
  for (const key of LEGACY_STORAGE_KEYS) {
    const state = readLegacyState(key);
    if (state) return state;
  }
  return null;
}

type LegacyLine = Partial<{ type: string; text: string; chords: string; lyrics: string }>;
type LegacySong = Partial<Omit<Song, "lines">> & { lines?: LegacyLine[] };

const TEXT_LINE_TYPES = new Set(["section", "chords", "lyrics", "cue", "repeat"]);

function normalizeNamedSetlists(value: unknown, fallbackSongIds: number[], validSongIds: Set<number>): NamedSetlist[] {
  const source = (Array.isArray(value) && value.length
    ? value
    : [{ id: 1, name: "Setlist 1", songIds: fallbackSongIds }]) as Array<Partial<NamedSetlist>>;

  const used = new Set<number>();
  let nextId = Math.max(1, ...source.map((item) => typeof item?.id === "number" ? item.id : 0)) + 1;

  const normalized = source.map((item, index) => {
    const rawId = typeof item?.id === "number" && item.id > 0 ? item.id : 0;
    const id = rawId && !used.has(rawId) ? rawId : nextId++;
    used.add(id);

    const name = String(item?.name ?? `Setlist ${index + 1}`).trim() || `Setlist ${index + 1}`;
    const songIds = Array.isArray(item?.songIds)
      ? item.songIds.filter((id: unknown): id is number => typeof id === "number" && validSongIds.has(id))
      : [];

    return { id, name, songIds };
  });

  return normalized.length ? normalized : [{ id: 1, name: "Setlist 1", songIds: fallbackSongIds.filter((id) => validSongIds.has(id)) }];
}

function readLegacyState(key: string): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const songs = normalizeLegacySongs(parsed.songs);
    if (!songs.length) return null;
    const validIds = new Set(songs.map((song) => song.id));
    const setlist = Array.isArray(parsed.setlist) ? parsed.setlist.filter((id) => typeof id === "number" && validIds.has(id)) : [songs[0].id];
    const fallbackId = songs[0].id;
    return makePersistedBackup({
      songs,
      setlist,
      setlists: normalizeNamedSetlists(parsed.setlists, setlist, validIds),
      activeSetlistId: typeof parsed.activeSetlistId === "number" ? parsed.activeSetlistId : 1,
      selectedSongId: typeof parsed.selectedSongId === "number" && validIds.has(parsed.selectedSongId) ? parsed.selectedSongId : fallbackId,
      setlistPreviewSongId: typeof parsed.setlistPreviewSongId === "number" && validIds.has(parsed.setlistPreviewSongId) ? parsed.setlistPreviewSongId : setlist[0] ?? fallbackId,
      performanceIndex: typeof parsed.performanceIndex === "number" ? parsed.performanceIndex : 0,
      transpose: typeof parsed.transpose === "number" ? parsed.transpose : 0,
      notation: parsed.notation === "de" ? "de" : "intl",
      draft: parsed.draft || DEFAULT_DRAFT,
      driveFile: null,
    });
  } catch {
    return null;
  }
}

function normalizeLegacySongs(value: unknown): Song[] {
  if (!Array.isArray(value)) return [];
  const songs = value.map(normalizeLegacySong).filter((song): song is Song => Boolean(song));
  const used = new Set<number>();
  let nextId = Math.max(0, ...songs.map((song) => Number.isFinite(song.id) ? song.id : 0)) + 1;

  return songs.map((song) => {
    if (song.id > 0 && !used.has(song.id)) {
      used.add(song.id);
      return song;
    }
    const id = nextId++;
    used.add(id);
    return { ...song, id };
  });
}

function normalizeLegacySong(value: unknown): Song | null {
  if (!value || typeof value !== "object") return null;
  const song = value as LegacySong;
  const lines = Array.isArray(song.lines)
    ? song.lines.map(normalizeLegacyLine).filter((line): line is Line => Boolean(line))
    : [];

  return {
    id: typeof song.id === "number" ? song.id : 0,
    title: normalizeSongTitle(String(song.title ?? "Nová pieseň")),
    artist: String(song.artist ?? "TriNiTTTy"),
    bpm: Number(song.bpm) || 80,
    key: normalizeKeyInput(String(song.key ?? "Am")),
    duration: String(song.duration ?? "0:00"),
    capo: String(song.capo ?? "-"),
    lines: lines.length ? lines : [{ type: "lyrics", text: "" }],
  };
}

function normalizeLegacyLine(value: unknown): Line | null {
  if (!value || typeof value !== "object") return null;
  const line = value as LegacyLine;
  if (line.type === "space") return { type: "space" };
  if (line.type === "pair") return makePairLine(String(line.chords ?? ""), String(line.lyrics ?? ""));
  if (typeof line.type === "string" && TEXT_LINE_TYPES.has(line.type) && typeof line.text === "string") {
    return { type: line.type as Exclude<Line["type"], "pair" | "space">, text: line.text };
  }
  return null;
}
