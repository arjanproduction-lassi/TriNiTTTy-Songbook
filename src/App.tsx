import { useEffect, useMemo, useState, type SetStateAction } from "react";
import type { DriveFileMemory, EditorMode, ImportDraft, ImportMode, Line, NamedSetlist, Notation, PersistedState, Song, View } from "./types";
import { DEFAULT_DRAFT, DEFAULT_IMPORT_TEXT, EMPTY_SONG_DRAFT } from "./data/defaultImport";
import { INITIAL_SONGS } from "./data/songs";
import { NavButton } from "./components/ui";
import { A4Page } from "./components/A4Sheet";
import { makePairLine, pairChordLine } from "./lib/chordAnchors";
import { normalizeKeyInput, transposeSong } from "./lib/chords";
import { buildSections, cleanImportText, makeSong, normalizeSongTitle, parseImportText, serializeLines } from "./lib/import";
import { copyText, downloadSongText, songToClipboardText } from "./lib/export";
import { clearState, createSongBeforeSaveBackup, deleteSongBeforeSaveBackup, downloadBackup, formatDatabaseVersion, getSongBeforeSaveBackup, listSongBeforeSaveBackups, loadState, makePersistedBackup, readBackupFile, saveState, type SongBeforeSaveBackup } from "./pwa/db";
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

type EditorDraftSnapshot = {
  draft: ImportDraft;
  importLines: Line[];
  importMode: ImportMode;
};

type SplitBlockRequest = {
  field: "text" | "chords" | "lyrics";
  caret: number | null;
} | null;

const EDITOR_HISTORY_LIMIT = 50;

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
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [selectedImportIndex, setSelectedImportIndex] = useState<number | null>(null);
  const [editingSongId, setEditingSongId] = useState<number | null>(null);
  const [importSplit, setImportSplit] = useState(30);
  const [importLines, setImportLines] = useState<Line[]>(() => parseImportText(DEFAULT_IMPORT_TEXT));
  const [draft, setDraft] = useState<ImportDraft>(DEFAULT_DRAFT);
  const [undoStack, setUndoStack] = useState<EditorDraftSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorDraftSnapshot[]>([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [storageStatus, setStorageStatus] = useState("Načítavam lokálnu databázu...");
  const [canonicalSaveStatus, setCanonicalSaveStatus] = useState<CanonicalSaveStatus>(() => readCanonicalSaveStatus());
  const [lastLocalAutosaveAt, setLastLocalAutosaveAt] = useState<string | null>(null);
  const [driveFile, setDriveFile] = useState<DriveFileMemory | null>(null);
  const [driveStatus, setDriveStatus] = useState("Drive admin sync je vypnutý.");
  const [songBackups, setSongBackups] = useState<SongBeforeSaveBackup[]>([]);
  const [songBackupsLoading, setSongBackupsLoading] = useState(false);
  const [songBackupStatus, setSongBackupStatus] = useState("");
  const [serviceWorkerUpdateReady, setServiceWorkerUpdateReady] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [printJob, setPrintJob] = useState<Song | null>(null);
  const [databaseVersion, setDatabaseVersion] = useState(1);
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
    databaseVersion,
  }), [songs, setlist, setlists, activeSetlistId, selectedSongId, setlistPreviewSongId, performanceIndex, transpose, notation, draft, driveFile, databaseVersion]);

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
    const onKeyDown = (event: KeyboardEvent) => {
      if (view !== "import") return;
      if (!event.ctrlKey && !event.metaKey) return;

      const target = event.target as HTMLElement | null;
      const nativeEditable = target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);

      if (nativeEditable) return;

      const key = event.key.toLowerCase();
      if (key === "z" && event.shiftKey) {
        event.preventDefault();
        redoEditorDraft();
        return;
      }
      if (key === "z") {
        event.preventDefault();
        undoEditorDraft();
        return;
      }
      if (key === "y") {
        event.preventDefault();
        redoEditorDraft();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, draft, importLines, importMode, undoStack, redoStack]);

  useEffect(() => {
    if (!printJob) return undefined;

    enterBrowserPrintMode();

    const previousTitle = document.title || "TriNiTTTy Songbook";
    document.title = makePrintDocumentTitle(printJob);

    const restoreTitle = () => {
      document.title = previousTitle;
    };
    const afterPrint = () => {
      restoreTitle();
      leaveBrowserPrintMode();
      setPrintJob(null);
    };
    window.addEventListener("afterprint", afterPrint);
    let timer = 0;
    let frameTwo = 0;
    const frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(() => {
        timer = window.setTimeout(() => {
          enterBrowserPrintMode();
          window.print();
        }, 150);
      });
    });

    return () => {
      window.cancelAnimationFrame(frameOne);
      window.cancelAnimationFrame(frameTwo);
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", afterPrint);
      leaveBrowserPrintMode();
      restoreTitle();
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
    if (view !== "import" || editorMode !== "edit" || editingSongId === null) {
      setSongBackups([]);
      setSongBackupsLoading(false);
      setSongBackupStatus("");
      return;
    }

    void refreshEditorBackups(editingSongId);
  }, [view, editorMode, editingSongId]);

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
    const activeIds = new Set(songs.filter((song) => !song.deletedAt).map((song) => song.id));
    const firstActiveId = songs.find((song) => !song.deletedAt)?.id ?? 0;
    setSetlists((current) => current.map((item) => ({ ...item, songIds: item.songIds.filter((id) => validIds.has(id)) })));
    const cleanedSetlist = setlist.filter((id) => validIds.has(id));
    if (cleanedSetlist.length !== setlist.length) {
      setSetlist(cleanedSetlist);
      return;
    }
    if (!activeIds.has(selectedSongId)) setSelectedSongId(firstActiveId);
    if (!activeIds.has(setlistPreviewSongId)) setSetlistPreviewSongId(cleanedSetlist.find((id) => activeIds.has(id)) ?? firstActiveId);
    const activeSetlistLength = cleanedSetlist.filter((id) => activeIds.has(id)).length;
    if (performanceIndex > Math.max(0, activeSetlistLength - 1)) setPerformanceIndex(Math.max(0, activeSetlistLength - 1));
  }, [songs, setlist, selectedSongId, setlistPreviewSongId, performanceIndex]);

  const activeSongs = useMemo(() => songs.filter((song) => !song.deletedAt), [songs]);
  const deletedSongs = useMemo(() => songs.filter((song) => song.deletedAt).sort((a, b) => (b.deletedAt || "").localeCompare(a.deletedAt || "")), [songs]);
  const filteredSongs = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? activeSongs.filter((song) => `${normalizeSongTitle(song.title)} ${song.artist}`.toLowerCase().includes(q)) : activeSongs;
  }, [activeSongs, query]);

  const activeImportLines = useMemo(() => importMode === "block" ? importLines : parseImportText(draft.rawText), [importMode, importLines, draft.rawText]);
  const activeImportSections = useMemo(() => buildSections(activeImportLines), [activeImportLines]);
  const activeImportSong = useMemo(() => makeSong(draft, activeImportLines, 999), [draft, activeImportLines]);
  const selectedImportLine = importMode === "block" && selectedImportIndex !== null ? importLines[selectedImportIndex] ?? null : null;

  const selectedSong = activeSongs.find((song) => song.id === selectedSongId) || activeSongs[0] || null;
  const renderedSong = useMemo(() => selectedSong ? transposeSong(selectedSong, transpose, notation) : null, [selectedSong, transpose, notation]);
  const selectedSongSections = useMemo(() => renderedSong ? buildSections(renderedSong.lines) : [], [renderedSong]);

  const setlistSongs = setlist.map((id) => songs.find((song) => song.id === id)).filter(Boolean) as Song[];
  const activeSetlistSongs = setlistSongs.filter((song) => !song.deletedAt);
  const activeSetlist = setlists.find((item) => item.id === activeSetlistId) ?? setlists[0] ?? DEFAULT_SETLISTS[0];
  const setlistPreviewSong = activeSongs.find((song) => song.id === setlistPreviewSongId) || activeSetlistSongs[0] || activeSongs[0] || null;
  const renderedSetlistPreview = useMemo(() => setlistPreviewSong ? transposeSong(setlistPreviewSong, transpose, notation) : null, [setlistPreviewSong, transpose, notation]);
  const setlistPreviewSections = useMemo(() => renderedSetlistPreview ? buildSections(renderedSetlistPreview.lines) : [], [renderedSetlistPreview]);

  const performanceSong = activeSetlistSongs[performanceIndex] || activeSetlistSongs[0] || activeSongs[0] || null;
  const renderedPerformance = useMemo(() => performanceSong ? transposeSong(performanceSong, transpose, notation) : null, [performanceSong, transpose, notation]);
  const performanceSections = useMemo(() => renderedPerformance ? buildSections(renderedPerformance.lines) : [], [renderedPerformance]);

  function currentEditorSnapshot(): EditorDraftSnapshot {
    return cloneEditorSnapshot({ draft, importLines, importMode });
  }

  function applyEditorSnapshot(snapshot: EditorDraftSnapshot, nextSelectedIndex?: number | null) {
    const next = cloneEditorSnapshot(snapshot);
    setDraft(next.draft);
    setImportLines(next.importLines);
    setImportMode(next.importMode);
    if (next.importMode !== "block") {
      setSelectedImportIndex(null);
      return;
    }

    const preservedIndex = typeof nextSelectedIndex === "number" && nextSelectedIndex >= 0 && nextSelectedIndex < next.importLines.length
      ? nextSelectedIndex
      : firstEditableIndex(next.importLines);
    setSelectedImportIndex(preservedIndex);
  }

  function applyEditorSnapshotWithHistory(nextSnapshot: EditorDraftSnapshot) {
    const current = currentEditorSnapshot();
    const next = cloneEditorSnapshot(nextSnapshot);
    if (sameEditorSnapshot(current, next)) return;
    pushUndoSnapshot(current);
    applyEditorSnapshot(next, selectedImportIndex);
  }

  function pushUndoSnapshot(snapshot: EditorDraftSnapshot) {
    setUndoStack((current) => appendEditorSnapshot(current, snapshot));
    setRedoStack([]);
  }

  function resetEditorHistory() {
    setUndoStack([]);
    setRedoStack([]);
  }

  function updateDraftWithHistory(action: SetStateAction<ImportDraft>) {
    const nextDraft = typeof action === "function" ? action(draft) : action;
    applyEditorSnapshotWithHistory({ draft: nextDraft, importLines, importMode });
  }

  function undoEditorDraft() {
    if (!undoStack.length) return;
    const previous = undoStack[undoStack.length - 1];
    const current = currentEditorSnapshot();
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => appendEditorSnapshot(stack, current));
    applyEditorSnapshot(previous, selectedImportIndex);
  }

  function redoEditorDraft() {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    const current = currentEditorSnapshot();
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => appendEditorSnapshot(stack, current));
    applyEditorSnapshot(next, selectedImportIndex);
  }

  function applyPersistedState(state: PersistedState) {
    const safeSongs = state.songs;
    const safeIds = new Set(safeSongs.map((song) => song.id));
    const safeSetlists = normalizeNamedSetlists(state.setlists, state.setlist, safeIds);
    const safeActiveSetlistId = safeSetlists.some((item) => item.id === state.activeSetlistId) ? state.activeSetlistId : safeSetlists[0].id;
    const safeSetlist = (safeSetlists.find((item) => item.id === safeActiveSetlistId)?.songIds ?? []).filter((id) => safeIds.has(id));
    const safeActiveSongs = safeSongs.filter((song) => !song.deletedAt);
    const fallbackId = safeActiveSongs[0]?.id ?? 0;
    setSongs(safeSongs);
    setSetlists(safeSetlists);
    setActiveSetlistId(safeActiveSetlistId);
    setSetlist(safeSetlist);
    setSelectedSongId(safeActiveSongs.some((song) => song.id === state.selectedSongId) ? state.selectedSongId : fallbackId);
    setSetlistPreviewSongId(safeActiveSongs.some((song) => song.id === state.setlistPreviewSongId) ? state.setlistPreviewSongId : safeSetlist.find((id) => safeActiveSongs.some((song) => song.id === id)) ?? fallbackId);
    setPerformanceIndex(Math.min(state.performanceIndex || 0, Math.max(0, safeSetlist.filter((id) => safeActiveSongs.some((song) => song.id === id)).length - 1)));
    setTranspose(state.transpose || 0);
    setNotation(state.notation === "de" ? "de" : "intl");
    setDraft(state.draft || DEFAULT_DRAFT);
    setDriveFile(state.driveFile || null);
    setDatabaseVersion(state.databaseVersion || 1);
    setImportLines(parseImportText((state.draft || DEFAULT_DRAFT).rawText));
    setImportMode("raw");
    setEditorMode("create");
    setEditingSongId(null);
    setSelectedImportIndex(null);
    resetEditorHistory();
  }

  function markCanonicalDirty() {
    setCanonicalSaveStatus((current) => current.dirty ? current : { ...current, dirty: true });
  }

  function markCanonicalSaved(savedAt = new Date().toISOString()) {
    setCanonicalSaveStatus({ dirty: false, lastCanonicalSaveAt: savedAt });
  }

  function exportCanonicalDatabase() {
    try {
      const exportedAt = new Date().toISOString();
      const nextDatabaseVersion = Math.max(1, databaseVersion + 1);
      const exportState = makePersistedBackup({ ...persistedState, databaseVersion: nextDatabaseVersion }, exportedAt);
      downloadBackup(exportState);
      setDatabaseVersion(nextDatabaseVersion);
      markCanonicalSaved(exportedAt);
      setStorageStatus(`Databáza exportovaná: ${formatDatabaseVersion(nextDatabaseVersion)} - ${formatShortTime(exportedAt)}.`);
    } catch {
      setStorageStatus("Export databázy zlyhal. Neuložené zmeny ostávajú aktívne.");
    }
  }

  function commitImportLines(nextLines: Line[]) {
    applyEditorSnapshotWithHistory({
      draft: { ...draft, rawText: serializeLines(nextLines) },
      importLines: nextLines,
      importMode,
    });
  }

  function hasActiveEditorDraft() {
    return Boolean(
      editorMode === "edit" ||
      editingSongId !== null ||
      importMode === "block" ||
      draft.title.trim() ||
      draft.rawText.trim() ||
      draft.bpm.trim() ||
      draft.key.trim() ||
      draft.timeSignature.trim() ||
      (draft.artist.trim() && draft.artist.trim() !== EMPTY_SONG_DRAFT.artist) ||
      (draft.duration.trim() && draft.duration.trim() !== EMPTY_SONG_DRAFT.duration) ||
      (draft.capo.trim() && draft.capo.trim() !== EMPTY_SONG_DRAFT.capo),
    );
  }

  function startNewSongDraft() {
    if (hasActiveEditorDraft() && !window.confirm("Rozpísaný editor sa nahradí čistou novou skladbou. Pokračovať?")) return;
    setEditingSongId(null);
    setEditorMode("create");
    setImportMode("raw");
    setImportSplit(30);
    setImportLines([]);
    setSelectedImportIndex(null);
    setDraft(EMPTY_SONG_DRAFT);
    resetEditorHistory();
    setView("import");
  }

  function enterBlockImportMode() {
    const cleaned = cleanImportText(draft.rawText);
    const parsed = parseImportText(cleaned);
    applyEditorSnapshotWithHistory({
      draft: { ...draft, rawText: cleaned },
      importLines: parsed,
      importMode: "block",
    });
    setSelectedImportIndex(firstEditableIndex(parsed));
  }

  function returnToRawImport() {
    applyEditorSnapshotWithHistory({ draft, importLines, importMode: "raw" });
    setSelectedImportIndex(null);
  }

  async function saveImportedSong() {
    const linesForSave = importMode === "block" ? importLines : parseImportText(cleanImportText(draft.rawText));
    const normalizedDraft = { ...draft, title: normalizeSongTitle(draft.title), rawText: serializeLines(linesForSave) };

    if (editorMode === "edit") {
      if (editingSongId === null) {
        setStorageStatus("Bezpečnostná brzda: editor je v režime úpravy, ale chýba pôvodné ID skladby.");
        return;
      }

      const originalSong = songs.find((song) => song.id === editingSongId);
      if (!originalSong) {
        setStorageStatus("Bezpečnostná brzda: pôvodná skladba už v databáze neexistuje. Uloženie bolo zastavené.");
        return;
      }

      const title = normalizeSongTitle(normalizedDraft.title || originalSong.title || "bez názvu");
      if (!window.confirm(`Naozaj chceš prepísať skladbu "${title}"? Pôvodná verzia bude nahradená.`)) return;

      const updatedSong = makeSong(normalizedDraft, linesForSave, editingSongId);
      if (updatedSong.id !== originalSong.id) {
        setStorageStatus("Bezpečnostná brzda: ID upravovanej skladby sa nezhoduje. Uloženie bolo zastavené.");
        return;
      }

      let backupPath = "";
      try {
        const backup = await createSongBeforeSaveBackup(originalSong);
        backupPath = backup.path;
      } catch {
        setStorageStatus("Záloha pred prepísaním zlyhala. Skladba nebola prepísaná.");
        return;
      }

      setSongs((prev) => prev.map((song) => (song.id === editingSongId ? updatedSong : song)));
      markCanonicalDirty();
      setStorageStatus(`Záloha pred prepísaním vytvorená: ${backupPath}`);
      setSelectedSongId(editingSongId);
      setSetlistPreviewSongId(editingSongId);
      setEditingSongId(null);
      setEditorMode("create");
      resetEditorHistory();
      setView("song");
      return;
    }

    if (editingSongId !== null) {
      setStorageStatus("Bezpečnostná brzda: nová skladba mala stále pôvodné ID. Klikni na Pridať skladbu a skús to znova.");
      return;
    }

    const newId = Math.max(...songs.map((song) => song.id), 0) + 1;
    const newSong = makeSong(normalizedDraft, linesForSave, newId);
    setSongs((prev) => [newSong, ...prev]);
    markCanonicalDirty();
    setSelectedSongId(newId);
    setSetlistPreviewSongId(newId);
    setEditorMode("create");
    resetEditorHistory();
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
      timeSignature: song.timeSignature || "",
      duration: song.duration,
      capo: song.capo,
      rawText,
    });
    setImportLines(clonedLines);
    setSelectedImportIndex(firstEditableIndex(clonedLines));
    setImportMode("block");
    setEditorMode("edit");
    setEditingSongId(song.id);
    resetEditorHistory();
    setView("import");
  }

  function resetImportTemplate() {
    setEditingSongId(null);
    setEditorMode("create");
    setImportMode("raw");
    setImportSplit(30);
    setImportLines(parseImportText(DEFAULT_IMPORT_TEXT));
    setSelectedImportIndex(null);
    setDraft(DEFAULT_DRAFT);
    resetEditorHistory();
  }

  async function refreshEditorBackups(songId = editingSongId) {
    if (songId === null) {
      setSongBackups([]);
      setSongBackupStatus("");
      return;
    }

    setSongBackupsLoading(true);
    try {
      const backups = await listSongBeforeSaveBackups(songId);
      setSongBackups(backups);
      setSongBackupStatus(backups.length ? `${backups.length} záloh pre túto skladbu.` : "Pre túto skladbu ešte nie sú zálohy.");
    } catch {
      setSongBackupStatus("Zálohy sa nepodarilo načítať.");
    } finally {
      setSongBackupsLoading(false);
    }
  }

  async function restoreSongBackupAsCopy(backupId: string) {
    if (hasActiveEditorDraft() && !window.confirm("Aktuálny editor sa nahradí kópiou zo zálohy. Pokračovať?")) return;

    try {
      const backup = await getSongBeforeSaveBackup(backupId);
      if (!backup) {
        setSongBackupStatus("Záloha sa nenašla.");
        return;
      }

      const restoredSong = backup.song;
      const restoredLines = JSON.parse(JSON.stringify(restoredSong.lines)) as Line[];
      const rawText = serializeLines(restoredLines);
      const title = `${normalizeSongTitle(restoredSong.title || "Bez názvu")} - obnovená záloha`;

      setEditingSongId(null);
      setEditorMode("create");
      setImportMode("block");
      setImportLines(restoredLines);
      setSelectedImportIndex(firstEditableIndex(restoredLines));
      setDraft({
        title,
        artist: restoredSong.artist,
        bpm: String(restoredSong.bpm),
        key: normalizeKeyInput(restoredSong.key),
        timeSignature: restoredSong.timeSignature || "",
        duration: restoredSong.duration,
        capo: restoredSong.capo,
        rawText,
      });
      setSongBackups([]);
      setSongBackupStatus("");
      resetEditorHistory();
      setStorageStatus(`Záloha "${normalizeSongTitle(restoredSong.title)}" otvorená ako nová kópia. Skontroluj ju a ulož ako novú skladbu.`);
      setView("import");
    } catch {
      setSongBackupStatus("Zálohu sa nepodarilo obnoviť.");
    }
  }

  async function deleteSongBackup(backupId: string) {
    const confirmed = window.confirm("Naozaj trvalo zmazať túto zálohu? Túto akciu nie je možné vrátiť.");
    if (!confirmed) return;

    try {
      await deleteSongBeforeSaveBackup(backupId);
      setSongBackupStatus("Záloha bola zmazaná.");
      await refreshEditorBackups();
    } catch {
      setSongBackupStatus("Zálohu sa nepodarilo zmazať.");
    }
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

  function splitImportLine(index: number, request: SplitBlockRequest) {
    const line = importLines[index];
    if (!line) return;

    const result = splitSelectedLine(line, request);
    if (!result.ok) {
      setStorageStatus(result.message);
      window.alert(result.message);
      return;
    }

    commitImportLines([...importLines.slice(0, index), ...result.lines, ...importLines.slice(index + 1)]);
    setSelectedImportIndex(index + 1);
    setStorageStatus("Blok rozdelený. Undo vráti pôvodný blok.");
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
    setSetlistPreviewSongId(activeSongs[0]?.id ?? 0);
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
    if (!song) return;

    const usedInSetlists = setlists.filter((item) => item.songIds.includes(songId)).map((item) => item.name);
    const setlistWarning = usedInSetlists.length
      ? `\n\nSkladba je v setliste: ${usedInSetlists.join(", ")}. Referencia ostane zachovaná a po obnove bude znova použiteľná.`
      : "";
    if (!window.confirm(`Odstrániť skladbu "${normalizeSongTitle(song.title)}" do koša? Dá sa obnoviť.${setlistWarning}`)) return;

    const deletedAt = new Date().toISOString();
    const nextSongs = songs.map((item) => (item.id === songId ? { ...item, deletedAt } : item));
    const fallbackId = nextSongs.find((item) => !item.deletedAt)?.id ?? 0;
    setSongs(nextSongs);
    markCanonicalDirty();
    if (selectedSongId === songId) setSelectedSongId(fallbackId);
    if (setlistPreviewSongId === songId) setSetlistPreviewSongId(setlist.find((id) => id !== songId && nextSongs.some((item) => item.id === id && !item.deletedAt)) ?? fallbackId);
    setPerformanceIndex((index) => Math.min(index, Math.max(0, setlist.filter((id) => nextSongs.some((item) => item.id === id && !item.deletedAt)).length - 1)));
    if (editingSongId === songId) {
      setEditingSongId(null);
      setEditorMode("create");
      setSelectedImportIndex(null);
      resetEditorHistory();
      setView("songs");
    }
    setStorageStatus(`Skladba "${normalizeSongTitle(song.title)}" presunutá do koša.`);
  }

  function restoreDeletedSong(songId: number) {
    const song = songs.find((item) => item.id === songId);
    if (!song?.deletedAt) return;

    setSongs((current) => current.map((item) => {
      if (item.id !== songId) return item;
      const { deletedAt, ...restored } = item;
      return restored;
    }));
    markCanonicalDirty();
    setSelectedSongId(songId);
    setSetlistPreviewSongId(songId);
    setStorageStatus(`Skladba "${normalizeSongTitle(song.title)}" obnovená z koša.`);
    setView("songs");
  }

  async function copySong(song: Song) {
    try {
      const ok = await copyText(songToClipboardText(song));
      setCopyStatus(ok ? "Skopírované do schránky." : "Kopírovanie sa nepodarilo.");
    } catch {
      setCopyStatus("Kopírovanie sa nepodarilo.");
    }
  }

  function exportSongText(song: Song) {
    try {
      downloadSongText(song);
      setCopyStatus("TXT export pripravený.");
    } catch {
      setCopyStatus("TXT export sa nepodaril.");
    }
  }

  async function importBackup(file: File) {
    try {
      const state = await readBackupFile(file);
      const importedOlder = state.databaseVersion < databaseVersion;
      const importSummary = [
        `Aktuálna databáza: ${formatDatabaseVersion(databaseVersion)}`,
        `Importovaný súbor: ${formatDatabaseVersion(state.databaseVersion)}`,
        `Exportované: ${formatBackupDateTime(state.exportedAt || state.savedAt)}`,
        `Skladby: ${state.songCount}`,
        `Setlisty: ${state.setlistCount}`,
        importedOlder ? "Pozor: importovaný súbor je starší než aktuálna databáza." : "",
        "",
        "Pred nahradením sa automaticky stiahne záloha aktuálnej databázy.",
        "Naozaj nahradiť aktuálnu lokálnu databázu importom?",
      ].filter(Boolean).join("\n");

      if (!window.confirm(importSummary)) return;

      try {
        const backupAt = new Date().toISOString();
        downloadBackup(makePersistedBackup({ ...persistedState, databaseVersion }, backupAt));
      } catch {
        setStorageStatus("Import zastavený: nepodarilo sa vytvoriť zálohu aktuálnej databázy.");
        return;
      }

      applyPersistedState(state);
      markCanonicalSaved(state.exportedAt || state.savedAt);
      setStorageStatus(`Backup importovaný: ${formatDatabaseVersion(state.databaseVersion)} · ${state.songs.length} piesne.`);
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
    setEditorMode("create");
    setSelectedImportIndex(null);
    setEditingSongId(null);
    setImportSplit(30);
    setImportLines(parseImportText(DEFAULT_IMPORT_TEXT));
    setDraft(DEFAULT_DRAFT);
    resetEditorHistory();
    setDriveFile(null);
    setDriveStatus("Drive admin sync je vypnutý.");
    setDatabaseVersion(1);
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
    const selectedIndex = setlistPreviewSong ? activeSetlistSongs.findIndex((song) => song.id === setlistPreviewSong.id) : -1;
    setPerformanceIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setView("performance");
  };
  const startPerformanceAt = (index: number) => {
    const song = setlistSongs[index];
    if (!song || song.deletedAt) return;
    const activeIndex = activeSetlistSongs.findIndex((item) => item.id === song.id);
    setPerformanceIndex(Math.max(0, Math.min(activeIndex, activeSetlistSongs.length - 1)));
    setView("performance");
  };
  const backToSetlistFromPerformance = () => {
    const currentSong = activeSetlistSongs[performanceIndex];
    if (currentSong) setSetlistPreviewSongId(currentSong.id);
    setView("setlist");
  };
  const performanceView = view === "performance";
  const canonicalDirty = canonicalSaveStatus.dirty;
  const canonicalStatusText = canonicalDirty
    ? "Neexportované zmeny v databáze"
    : canonicalSaveStatus.lastCanonicalSaveAt
      ? `Databáza exportovaná: ${formatShortTime(canonicalSaveStatus.lastCanonicalSaveAt)}`
      : "Databáza zatiaľ nebola exportovaná";
  const localAutosaveText = lastLocalAutosaveAt ? `Lokálne uložené: ${formatShortTime(lastLocalAutosaveAt)}` : "Lokálne autosave pripravené";

  return (
    <div className={`min-h-screen ${printJob ? "app-printing bg-white" : "bg-zinc-50"} text-zinc-900`}>
      {printJob ? (
        <div className="print-surface">
          <div className="print-mode-controls">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Tlač / PDF</div>
              <div className="mt-0.5 font-semibold text-zinc-900">{normalizeSongTitle(printJob.title)}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { enterBrowserPrintMode(); window.print(); }} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
                Tlačiť / PDF
              </button>
              <button type="button" onClick={() => setPrintJob(null)} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200">
                Zavrieť
              </button>
            </div>
          </div>
          <div className="print-a4-stage">
            <A4Page song={printJob} sections={buildSections(printJob.lines)} responsive={false} />
          </div>
        </div>
      ) : (
      <div className={`screen-surface ${performanceView ? "min-h-screen" : "mx-auto max-w-[1760px] p-3 md:p-4"}`}>
        {!performanceView && (
        <div className="mb-4 rounded-2xl bg-gradient-to-br from-white to-zinc-100 p-3 shadow-sm ring-1 ring-zinc-200 md:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">TriNiTTTy</div>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight">Songbook PWA MVP</h1>
              {!online && <p className="mt-1 text-xs font-semibold text-amber-700">Offline režim: pracuješ z lokálnej databázy a cache.</p>}
              <p className="mt-0.5 text-sm text-zinc-600">Knižnica, import/edit, A4 preview, setlist, performance, transpozitor, lokálna databáza.</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400">{RC_MARKER} · v{APP_VERSION} · build {BUILD_DATE}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-xl px-3 py-1.5 text-sm font-bold ring-1 ${canonicalDirty ? "bg-amber-50 text-amber-900 ring-amber-300" : "bg-emerald-50 text-emerald-900 ring-emerald-200"}`}>
                  {canonicalStatusText}
                </span>
                <span className="rounded-xl bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200">{localAutosaveText}</span>
              </div>
              {installed && <p className="mt-1 text-xs font-semibold text-emerald-700">Appka je nainštalovaná.</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <NavButton current={view} target="songs" onClick={setView}>Piesne</NavButton>
              <NavButton current={view} target="import" onClick={setView}>Import</NavButton>
              <NavButton current={view} target="song" onClick={setView}>Náhľad</NavButton>
              <NavButton current={view} target="setlist" onClick={setView}>Setlist</NavButton>
              <button onClick={exportCanonicalDatabase} className={`rounded-xl px-3 py-2 text-sm font-bold ring-1 ${canonicalDirty ? "bg-amber-500 text-white ring-amber-500 hover:bg-amber-600" : "bg-white text-emerald-800 ring-emerald-200 hover:bg-emerald-50"}`}>Exportovať databázu</button>
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
            songs={activeSongs}
            deletedSongs={deletedSongs}
            filteredSongs={filteredSongs}
            query={query}
            selectedSong={selectedSong}
            storageStatus={storageStatus}
            canInstall={canInstall}
            onQuery={setQuery}
            onCreateNewSong={startNewSongDraft}
            onOpen={openSong}
            onEdit={startEditingSong}
            onToggleSetlist={toggleSetlist}
            onToggleSongInSetlist={toggleSongInNamedSetlist}
            onDelete={deleteSong}
            onRestoreDeleted={restoreDeletedSong}
            onInstall={() => { void install(); }}
            onExportBackup={exportCanonicalDatabase}
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
            editorMode={editorMode}
            importSplit={importSplit}
            draft={draft}
            editingSongId={editingSongId}
            activeImportLines={activeImportLines}
            activeImportSong={activeImportSong}
            activeImportSections={activeImportSections}
            selectedImportIndex={selectedImportIndex}
            selectedImportLine={selectedImportLine}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            songBackups={songBackups}
            songBackupsLoading={songBackupsLoading}
            songBackupStatus={songBackupStatus}
            setImportSplit={setImportSplit}
            setDraft={updateDraftWithHistory}
            setSelectedImportIndex={setSelectedImportIndex}
            enterBlockImportMode={enterBlockImportMode}
            startNewSongDraft={startNewSongDraft}
            returnToRawImport={returnToRawImport}
            saveImportedSong={saveImportedSong}
            applyImportCleanup={() => updateDraftWithHistory((current) => ({ ...current, rawText: cleanImportText(current.rawText) }))}
            resetImportTemplate={resetImportTemplate}
            replaceImportLine={replaceImportLine}
            insertImportLine={insertImportLine}
            deleteImportLine={deleteImportLine}
            splitImportLine={splitImportLine}
            undoEditorDraft={undoEditorDraft}
            redoEditorDraft={redoEditorDraft}
            refreshSongBackups={() => { void refreshEditorBackups(); }}
            restoreSongBackupAsCopy={(backupId) => { void restoreSongBackupAsCopy(backupId); }}
            deleteSongBackup={(backupId) => { void deleteSongBackup(backupId); }}
          />
        )}

        {view === "song" && (
          <SongView
            songs={activeSongs}
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
            exportSongText={exportSongText}
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
            setlistSongs={activeSetlistSongs}
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

      </div>
      )}
    </div>
  );
}

function firstEditableIndex(lines: Line[]) {
  const firstNonSpace = lines.findIndex((line) => line.type !== "space");
  return firstNonSpace >= 0 ? firstNonSpace : 0;
}

function enterBrowserPrintMode() {
  document.documentElement.classList.add("app-printing");
  document.body.classList.add("app-printing");
}

function leaveBrowserPrintMode() {
  document.documentElement.classList.remove("app-printing");
  document.body.classList.remove("app-printing");
}

function makePrintDocumentTitle(song: Song) {
  const parts = [
    normalizeSongTitle(song.title),
    song.artist.trim(),
    normalizeKeyInput(song.key),
  ]
    .map(sanitizeFilenamePart)
    .filter(Boolean);

  return parts.length ? parts.join(" - ") : "TriNiTTTy Songbook";
}

function sanitizeFilenamePart(value: string) {
  return value
    .replace(/[<>:"/\\|?*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cloneEditorSnapshot(snapshot: EditorDraftSnapshot): EditorDraftSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as EditorDraftSnapshot;
}

function editorSnapshotKey(snapshot: EditorDraftSnapshot) {
  return JSON.stringify(snapshot);
}

function sameEditorSnapshot(a: EditorDraftSnapshot, b: EditorDraftSnapshot) {
  return editorSnapshotKey(a) === editorSnapshotKey(b);
}

function appendEditorSnapshot(stack: EditorDraftSnapshot[], snapshot: EditorDraftSnapshot) {
  const nextSnapshot = cloneEditorSnapshot(snapshot);
  const last = stack[stack.length - 1];
  if (last && sameEditorSnapshot(last, nextSnapshot)) return stack;
  return [...stack, nextSnapshot].slice(-EDITOR_HISTORY_LIMIT);
}

type SplitResult = { ok: true; lines: [Line, Line] } | { ok: false; message: string };
type TextSplit = { index: number; left: string; right: string };

function splitSelectedLine(line: Line, request: SplitBlockRequest): SplitResult {
  if (line.type === "lyrics" || line.type === "chords") {
    const split = splitTextByMarkerOrCaret(line.text, request?.field === "text" ? request.caret : null);
    if (!split) return { ok: false, message: "Umiestni kurzor alebo použi znak | tam, kde chceš blok rozdeliť." };
    return { ok: true, lines: [{ ...line, text: split.left }, { ...line, text: split.right }] };
  }

  if (line.type === "pair") {
    const chordLine = pairChordLine(line);
    const lyricSplit = splitTextByMarkerOrCaret(line.lyrics, request?.field === "lyrics" ? request.caret : null);
    if (lyricSplit) {
      const chordSplit = splitTextAtIndex(chordLine, lyricSplit.index);
      return { ok: true, lines: [makePairLine(chordSplit.left, lyricSplit.left), makePairLine(chordSplit.right, lyricSplit.right)] };
    }

    const chordSplit = splitTextByMarkerOrCaret(chordLine, request?.field === "chords" ? request.caret : null);
    if (chordSplit) {
      const splitLyrics = splitTextAtIndex(line.lyrics, chordSplit.index);
      return { ok: true, lines: [makePairLine(chordSplit.left, splitLyrics.left), makePairLine(chordSplit.right, splitLyrics.right)] };
    }

    return { ok: false, message: "Umiestni kurzor v akordovom/textovom riadku alebo použi znak | tam, kde chceš pár rozdeliť." };
  }

  return { ok: false, message: `Typ bloku "${line.type}" sa zatiaľ nedá bezpečne rozdeliť.` };
}

function splitTextByMarkerOrCaret(text: string, caret: number | null | undefined): TextSplit | null {
  const markerIndex = text.indexOf("|");
  if (markerIndex >= 0) return splitTextAtIndex(text, markerIndex, true);
  if (typeof caret === "number" && caret > 0 && caret < text.length) return splitTextAtIndex(text, caret);
  return null;
}

function splitTextAtIndex(text: string, index: number, removeMarker = false): TextSplit {
  const safeIndex = Math.max(0, Math.min(index, text.length));
  const leftSource = text.slice(0, safeIndex);
  const rightSource = text.slice(removeMarker ? safeIndex + 1 : safeIndex);
  return {
    index: safeIndex,
    left: trimSplitLeft(leftSource.replace(/\|/g, "")),
    right: trimSplitRight(rightSource.replace(/\|/g, "")),
  };
}

function trimSplitLeft(value: string) {
  return value.replace(/[ \t]+$/g, "");
}

function trimSplitRight(value: string) {
  return value.replace(/^[ \t]+/g, "");
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

function formatBackupDateTime(value: string) {
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
      draft: { ...DEFAULT_DRAFT, ...(parsed.draft || {}) },
      driveFile: null,
      databaseVersion: typeof parsed.databaseVersion === "number" ? parsed.databaseVersion : 1,
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
    timeSignature: typeof song.timeSignature === "string" ? song.timeSignature : undefined,
    duration: String(song.duration ?? "0:00"),
    capo: String(song.capo ?? "-"),
    lines: lines.length ? lines : [{ type: "lyrics", text: "" }],
    deletedAt: typeof song.deletedAt === "string" ? song.deletedAt : undefined,
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
