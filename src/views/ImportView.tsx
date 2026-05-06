import { useEffect, useRef, useState, type Dispatch, type PointerEvent as ReactPointerEvent, type SetStateAction } from "react";
import type { EditorMode, ImportDraft, ImportMode, Line, SectionGroup, Song } from "../types";
import type { SongBeforeSaveBackup } from "../pwa/db";
import { A4Sheet } from "../components/A4Sheet";
import { Card, Field, InfoBox, PrimaryButton, SoftButton } from "../components/ui";
import { pairChordLine, withPairChords, withPairLyrics } from "../lib/chordAnchors";
import { normalizeKeyInput } from "../lib/chords";
import { convertLine, importDiagnostics, normalizeSongTitle } from "../lib/import";

type ImportViewProps = {
  importMode: ImportMode;
  editorMode: EditorMode;
  importSplit: number;
  draft: ImportDraft;
  editingSongId: number | null;
  activeImportLines: Line[];
  activeImportSong: Song;
  activeImportSections: SectionGroup[];
  selectedImportIndex: number | null;
  selectedImportLine: Line | null;
  canUndo: boolean;
  canRedo: boolean;
  songBackups: SongBeforeSaveBackup[];
  songBackupsLoading: boolean;
  songBackupStatus: string;
  setImportSplit: (value: number) => void;
  setDraft: Dispatch<SetStateAction<ImportDraft>>;
  setSelectedImportIndex: (index: number | null) => void;
  enterBlockImportMode: () => void;
  startNewSongDraft: () => void;
  returnToRawImport: () => void;
  saveImportedSong: () => void;
  applyImportCleanup: () => void;
  resetImportTemplate: () => void;
  replaceImportLine: (index: number, line: Line) => void;
  insertImportLine: (index: number, direction: "above" | "below") => void;
  deleteImportLine: (index: number) => void;
  splitImportLine: (index: number, request: SplitBlockRequest) => void;
  undoEditorDraft: () => void;
  redoEditorDraft: () => void;
  refreshSongBackups: () => void;
  restoreSongBackupAsCopy: (backupId: string) => void;
  deleteSongBackup: (backupId: string) => void;
};

type SplitBlockRequest = {
  field: "text" | "chords" | "lyrics";
  caret: number | null;
} | null;

type PaneWidths = {
  left: number;
  middle: number;
};

const EDITOR_PANE_WIDTHS_KEY = "trinittty-editor-pane-widths";
const DEFAULT_PANE_WIDTHS: PaneWidths = { left: 300, middle: 440 };
const MIN_LEFT_PANE = 240;
const MIN_MIDDLE_PANE = 320;
const MIN_RIGHT_PANE = 520;
const SPLITTER_SPACE = 20;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function readPaneWidths(): PaneWidths {
  try {
    const raw = window.localStorage.getItem(EDITOR_PANE_WIDTHS_KEY);
    if (!raw) return DEFAULT_PANE_WIDTHS;
    const parsed = JSON.parse(raw) as Partial<PaneWidths>;
    return {
      left: Number(parsed.left) || DEFAULT_PANE_WIDTHS.left,
      middle: Number(parsed.middle) || DEFAULT_PANE_WIDTHS.middle,
    };
  } catch {
    return DEFAULT_PANE_WIDTHS;
  }
}

function clampPaneWidths(widths: PaneWidths, containerWidth = 0): PaneWidths {
  const availableForLeftAndMiddle = containerWidth > 0
    ? Math.max(MIN_LEFT_PANE + MIN_MIDDLE_PANE, containerWidth - MIN_RIGHT_PANE - SPLITTER_SPACE)
    : widths.left + widths.middle;

  const left = clamp(widths.left, MIN_LEFT_PANE, Math.max(MIN_LEFT_PANE, availableForLeftAndMiddle - MIN_MIDDLE_PANE));
  const middle = clamp(widths.middle, MIN_MIDDLE_PANE, Math.max(MIN_MIDDLE_PANE, availableForLeftAndMiddle - left));

  return { left, middle };
}

function DraftFields({
  draft,
  setDraft,
  minFieldWidth = "7.5rem",
}: Pick<ImportViewProps, "draft" | "setDraft"> & { minFieldWidth?: string }) {
  const update = (key: keyof ImportDraft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));
  return (
    <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minFieldWidth}), 1fr))` }}>
      <Field label="Názov" value={draft.title} onChange={update("title")} />
      <Field label="Interpret" value={draft.artist} onChange={update("artist")} />
      <Field label="BPM" value={draft.bpm} onChange={update("bpm")} />
      <Field label="Takt" value={draft.timeSignature} onChange={update("timeSignature")} />
      <Field label="Tónina" value={draft.key} onChange={update("key")} />
      <Field label="Capo" value={draft.capo} onChange={update("capo")} />
      <Field label="Dĺžka" value={draft.duration} onChange={update("duration")} />
    </div>
  );
}

function Diagnostics({ lines }: { lines: Line[] }) {
  const diagnostics = importDiagnostics(lines);
  return (
    <InfoBox>
      <div className="font-semibold text-zinc-800">Diagnostika importu</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        <span>Bloky: {diagnostics.total}</span>
        <span>Sekcie: {diagnostics.sections}</span>
        <span>Páry: {diagnostics.counts.pair}</span>
        <span>Akordové: {diagnostics.chordRows}</span>
        <span>Textové: {diagnostics.counts.lyrics}</span>
        <span>Cue: {diagnostics.counts.cue}</span>
        <span>Repeat: {diagnostics.counts.repeat}</span>
        <span>Medzery: {diagnostics.counts.space}</span>
      </div>
    </InfoBox>
  );
}

function CollapsedDiagnostics({ lines }: { lines: Line[] }) {
  return (
    <details className="rounded-2xl bg-white p-3 text-sm shadow-sm ring-1 ring-zinc-200">
      <summary className="cursor-pointer font-semibold text-zinc-700">Diagnostika importu</summary>
      <div className="mt-3">
        <Diagnostics lines={lines} />
      </div>
    </details>
  );
}

function formatBackupDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function BackupPanel({
  backups,
  loading,
  status,
  onRefresh,
  onRestore,
  onDelete,
}: {
  backups: SongBeforeSaveBackup[];
  loading: boolean;
  status: string;
  onRefresh: () => void;
  onRestore: (backupId: string) => void;
  onDelete: (backupId: string) => void;
}) {
  return (
    <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-sm ring-1 ring-zinc-200">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-semibold text-zinc-900">Zálohy tejto skladby</div>
          <div className="text-xs text-zinc-500">Obnova vždy otvorí kópiu ako novú rozpracovanú skladbu.</div>
        </div>
        <SoftButton onClick={onRefresh} disabled={loading} className="disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? "Načítavam..." : "Obnoviť zoznam"}
        </SoftButton>
      </div>

      {status && <div className="mt-2 text-xs font-semibold text-zinc-600">{status}</div>}

      {!loading && backups.length === 0 && (
        <div className="mt-3 rounded-xl bg-white p-3 text-zinc-600 ring-1 ring-zinc-200">Pre túto skladbu ešte nie sú zálohy.</div>
      )}

      {backups.length > 0 && (
        <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
          {backups.map((backup) => (
            <div key={backup.id} className="rounded-xl bg-white p-3 ring-1 ring-zinc-200">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-900">{formatBackupDate(backup.timestamp)}</div>
                  <div className="mt-1 truncate text-zinc-700">{backup.songTitle}</div>
                  <div className="mt-1 text-xs text-zinc-500">Dôvod: {backup.reason}</div>
                  <div className="mt-1 truncate font-mono text-[11px] text-zinc-500">{backup.path}</div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button onClick={() => onRestore(backup.id)} className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white">
                    Obnoviť ako kópiu
                  </button>
                  <button onClick={() => onDelete(backup.id)} className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 ring-1 ring-rose-200 hover:bg-rose-100">
                    Zmazať zálohu
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SplitControl({
  leftLabel,
  rightLabel,
  value,
  min,
  max,
  step,
  onChange,
}: {
  leftLabel: string;
  rightLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex min-w-[280px] items-center gap-3">
      <span className="text-xs text-zinc-500">{leftLabel} {value}%</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
      <span className="text-xs text-zinc-500">{rightLabel} {100 - value}%</span>
    </div>
  );
}

function PaneSplitter({
  label,
  onPointerDown,
}: {
  label: string;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={onPointerDown}
      className="hidden min-h-[calc(100vh-15rem)] w-2 cursor-col-resize rounded-full bg-zinc-100 ring-1 ring-zinc-200 transition hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 xl:block"
    >
      <span className="mx-auto block h-full w-px bg-zinc-300" />
    </button>
  );
}

function blockLabel(line: Line) {
  if (line.type === "space") return "prázdny blok";
  if (line.type === "pair") return line.lyrics || pairChordLine(line) || "pair";
  return line.text || line.type;
}

function focusedSplitRequest(): SplitBlockRequest {
  const target = document.activeElement;
  if (!(target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement)) return null;

  const field = target.dataset.splitField;
  if (field !== "text" && field !== "chords" && field !== "lyrics") return null;

  return {
    field,
    caret: typeof target.selectionStart === "number" ? target.selectionStart : null,
  };
}

function BlockNavigator({
  sections,
  selectedIndex,
  onSelect,
}: {
  sections: SectionGroup[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="mt-3 max-h-[calc(100vh-15rem)] space-y-3 overflow-auto pr-1">
      {sections.map((section) => (
        <div key={section.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-2">
          <div className="text-sm font-semibold">{section.implicit ? "[ Bez sekcie ]" : `[ ${section.title} ]`}</div>
          <div className="mt-2 space-y-1.5">
            {section.blocks.map(({ index, line }, i) => (
              <button
                key={index}
                onClick={() => onSelect(index)}
                className={`w-full rounded-xl border px-3 py-2 text-left ${selectedIndex === index ? "border-amber-400 bg-amber-100" : "border-zinc-200 bg-white hover:bg-zinc-100"}`}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">{i + 1}. {line.type}</div>
                <div className="mt-1 truncate font-mono text-sm">{blockLabel(line)}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SelectedBlockEditor({
  selectedImportLine,
  selectedImportIndex,
  replaceImportLine,
  insertImportLine,
  deleteImportLine,
  splitImportLine,
}: Pick<ImportViewProps, "selectedImportLine" | "selectedImportIndex" | "replaceImportLine" | "insertImportLine" | "deleteImportLine" | "splitImportLine">) {
  if (!selectedImportLine || selectedImportIndex === null) {
    return <InfoBox>Klikni na blok vľavo alebo v A4 preview a otvorí sa jeho presná editácia.</InfoBox>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700 ring-1 ring-zinc-200">
        Blok #{selectedImportIndex + 1} • {selectedImportLine.type}
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-600">Typ bloku</label>
        <select value={selectedImportLine.type} onChange={(e) => replaceImportLine(selectedImportIndex, convertLine(selectedImportLine, e.target.value as Line["type"]))} className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm">
          <option value="section">section</option>
          <option value="pair">pair</option>
          <option value="chords">chords</option>
          <option value="lyrics">lyrics</option>
          <option value="cue">cue</option>
          <option value="repeat">repeat</option>
          <option value="space">space</option>
        </select>
      </div>
      {selectedImportLine.type === "pair" ? (
        <>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-600">Akordový riadok</label>
            <textarea data-split-field="chords" rows={3} spellCheck={false} value={pairChordLine(selectedImportLine)} onChange={(e) => replaceImportLine(selectedImportIndex, withPairChords(selectedImportLine, e.target.value))} className="min-h-[5.5rem] w-full resize-y rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-600">Textový riadok</label>
            <textarea data-split-field="lyrics" rows={3} spellCheck={false} value={selectedImportLine.lyrics} onChange={(e) => replaceImportLine(selectedImportIndex, withPairLyrics(selectedImportLine, e.target.value))} className="min-h-[5.5rem] w-full resize-y rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm" />
          </div>
        </>
      ) : selectedImportLine.type === "space" ? (
        <InfoBox>Toto je prázdny blok - vertikálna medzera v leadsheete.</InfoBox>
      ) : (
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-600">Obsah bloku</label>
          <textarea data-split-field="text" spellCheck={false} autoFocus value={selectedImportLine.text} onChange={(e) => replaceImportLine(selectedImportIndex, { ...selectedImportLine, text: e.target.value })} className="min-h-[240px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm xl:min-h-[320px]" />
          {selectedImportLine.type === "section" && <div className="mt-2 text-xs text-zinc-500">Píš len názov sekcie bez hranatých zátvoriek.</div>}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <SoftButton onClick={() => insertImportLine(selectedImportIndex, "above")}>Pridať nad</SoftButton>
        <SoftButton onClick={() => insertImportLine(selectedImportIndex, "below")}>Pridať pod</SoftButton>
        <SoftButton onMouseDown={(event) => event.preventDefault()} onClick={() => splitImportLine(selectedImportIndex, focusedSplitRequest())}>Rozdeliť blok</SoftButton>
        <button onClick={() => deleteImportLine(selectedImportIndex)} className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white">Zmazať blok</button>
      </div>
    </div>
  );
}

export function ImportView(props: ImportViewProps) {
  const {
    importMode,
    editorMode,
    importSplit,
    draft,
    editingSongId,
    activeImportLines,
    activeImportSong,
    activeImportSections,
    selectedImportIndex,
    selectedImportLine,
    canUndo,
    canRedo,
    songBackups,
    songBackupsLoading,
    songBackupStatus,
    setImportSplit,
    setDraft,
    setSelectedImportIndex,
    enterBlockImportMode,
    startNewSongDraft,
    returnToRawImport,
    saveImportedSong,
    applyImportCleanup,
    resetImportTemplate,
    replaceImportLine,
    insertImportLine,
    deleteImportLine,
    splitImportLine,
    undoEditorDraft,
    redoEditorDraft,
    refreshSongBackups,
    restoreSongBackupAsCopy,
    deleteSongBackup,
  } = props;
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [paneWidths, setPaneWidths] = useState<PaneWidths>(() => clampPaneWidths(readPaneWidths()));
  const [backupsOpen, setBackupsOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(EDITOR_PANE_WIDTHS_KEY, JSON.stringify(paneWidths));
    } catch {
      // Pane widths are device-local comfort state. The editor still works if storage is blocked.
    }
  }, [paneWidths]);

  useEffect(() => {
    const clampToContainer = () => setPaneWidths((current) => clampPaneWidths(current, workspaceRef.current?.clientWidth ?? 0));
    clampToContainer();
    window.addEventListener("resize", clampToContainer);
    return () => window.removeEventListener("resize", clampToContainer);
  }, []);

  function startPaneResize(edge: "left" | "middle", event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidths = paneWidths;
    const containerWidth = workspaceRef.current?.clientWidth ?? 0;

    const handleMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;

      setPaneWidths(() => {
        if (edge === "left") {
          const total = startWidths.left + startWidths.middle;
          const left = clamp(startWidths.left + delta, MIN_LEFT_PANE, total - MIN_MIDDLE_PANE);
          return clampPaneWidths({ left, middle: total - left }, containerWidth);
        }

        const maxMiddle = containerWidth > 0
          ? containerWidth - startWidths.left - MIN_RIGHT_PANE - SPLITTER_SPACE
          : startWidths.middle + delta;
        return clampPaneWidths({ left: startWidths.left, middle: clamp(startWidths.middle + delta, MIN_MIDDLE_PANE, maxMiddle) }, containerWidth);
      });
    };

    const stopResize = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopResize);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stopResize);
  }

  function toggleBackupsOpen() {
    setBackupsOpen((current) => {
      if (!current) refreshSongBackups();
      return !current;
    });
  }

  if (importMode === "raw") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-900">Šírka okien importu</div>
              <div className="text-xs text-zinc-500">Vľavo raw vstup, vpravo pravdivý A4 náhľad.</div>
            </div>
            <SplitControl leftLabel="Editor" rightLabel="Náhľad" value={importSplit} min={26} max={62} step={2} onChange={setImportSplit} />
          </div>
        </div>
        <div className="overflow-x-auto xl:overflow-visible">
          <div className="grid min-w-[980px] gap-4 xl:min-w-0" style={{ gridTemplateColumns: `${importSplit}% ${100 - importSplit}%` }}>
            <Card className="self-start">
              <h2 className="text-xl font-semibold">Raw import</h2>
              {editorMode === "edit" && editingSongId !== null && <div className="mt-3"><InfoBox tone="sky">Upravuješ existujúcu pieseň: <span className="font-semibold">{normalizeSongTitle(draft.title || "bez názvu")}</span>. Uloženie prepíše jej aktuálnu verziu.</InfoBox></div>}
              {editorMode === "create" && <div className="mt-2 text-xs font-semibold text-emerald-800">Režim: nová skladba. Prvé uloženie vytvorí nový záznam.</div>}
              <div className="mt-2 text-xs text-amber-900">Vlož text z Wordu, predčisti ho a prejdi do širokého A4 editora.</div>
              <DraftFields draft={draft} setDraft={setDraft} />
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-zinc-600">Leadsheet text</label>
                  <div className="text-xs text-zinc-500">Čo vložíš sem, vidíš hneď vpravo.</div>
                </div>
                <textarea value={draft.rawText} onChange={(e) => setDraft((d) => ({ ...d, rawText: e.target.value }))} spellCheck={false} className="min-h-[58vh] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm leading-5" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <SoftButton disabled={!canUndo} onClick={undoEditorDraft} className="disabled:cursor-not-allowed disabled:opacity-40">Undo</SoftButton>
                <SoftButton disabled={!canRedo} onClick={redoEditorDraft} className="disabled:cursor-not-allowed disabled:opacity-40">Redo</SoftButton>
                {editorMode === "edit" && editingSongId !== null && <SoftButton onClick={toggleBackupsOpen}>Zálohy ({songBackups.length})</SoftButton>}
                <PrimaryButton onClick={enterBlockImportMode}>Rozparsovať a prejsť do širokého editora</PrimaryButton>
                <button onClick={applyImportCleanup} className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">Predčistiť import</button>
                <SoftButton onClick={startNewSongDraft}>Pridať skladbu</SoftButton>
                <SoftButton onClick={resetImportTemplate}>Obnoviť šablónu</SoftButton>
              </div>
              {backupsOpen && editorMode === "edit" && editingSongId !== null && (
                <BackupPanel backups={songBackups} loading={songBackupsLoading} status={songBackupStatus} onRefresh={refreshSongBackups} onRestore={restoreSongBackupAsCopy} onDelete={deleteSongBackup} />
              )}
              <div className="mt-3"><CollapsedDiagnostics lines={activeImportLines} /></div>
            </Card>
            <Card className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Live náhľad</h2>
                  <div className="mt-1 text-sm text-zinc-600">Pravda je tu, nie vo Worde.</div>
                </div>
                <div className="rounded-xl bg-zinc-50 px-3 py-2 text-sm ring-1 ring-zinc-200">
                  <div className="font-semibold">{normalizeSongTitle(draft.title || "Nová pieseň")}</div>
                  <div className="mt-1 text-zinc-500">{normalizeKeyInput(draft.key || "Am")} • {draft.bpm || "--"} BPM</div>
                </div>
              </div>
              <div className="mt-4"><A4Sheet song={activeImportSong} sections={activeImportSections} /></div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Široký blokový editor</h2>
            {editorMode === "edit" && editingSongId !== null && (
              <div className="mt-1 text-xs font-semibold text-sky-800">
                Upravuješ: {normalizeSongTitle(draft.title || "bez názvu")} · uloženie prepíše pôvodnú verziu.
              </div>
            )}
            {editorMode === "create" && (
              <div className="mt-1 text-xs font-semibold text-emerald-800">
                Režim: nová skladba · uloženie vytvorí nový stabilný záznam.
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <SoftButton disabled={!canUndo} onClick={undoEditorDraft} className="disabled:cursor-not-allowed disabled:opacity-40">Undo</SoftButton>
            <SoftButton disabled={!canRedo} onClick={redoEditorDraft} className="disabled:cursor-not-allowed disabled:opacity-40">Redo</SoftButton>
            {editorMode === "edit" && editingSongId !== null && <SoftButton onClick={toggleBackupsOpen}>Zálohy ({songBackups.length})</SoftButton>}
            <SoftButton onClick={returnToRawImport}>Späť na raw import</SoftButton>
            <SoftButton onClick={startNewSongDraft}>Pridať skladbu</SoftButton>
            <PrimaryButton onClick={saveImportedSong}>{editorMode === "edit" ? "Uložiť a prepísať skladbu" : "Vytvoriť skladbu"}</PrimaryButton>
          </div>
        </div>
        <DraftFields draft={draft} setDraft={setDraft} minFieldWidth="6.5rem" />
        {backupsOpen && editorMode === "edit" && editingSongId !== null && (
          <BackupPanel backups={songBackups} loading={songBackupsLoading} status={songBackupStatus} onRefresh={refreshSongBackups} onRestore={restoreSongBackupAsCopy} onDelete={deleteSongBackup} />
        )}
      </Card>

      <div
        ref={workspaceRef}
        className="space-y-4 xl:grid xl:space-y-0"
        style={{ gridTemplateColumns: `${paneWidths.left}px 10px ${paneWidths.middle}px 10px minmax(${MIN_RIGHT_PANE}px, 1fr)` }}
      >
        <Card className="min-h-0 p-3 xl:h-[calc(100vh-15rem)]">
          <h3 className="text-base font-semibold">Sekcie a bloky</h3>
          <BlockNavigator sections={activeImportSections} selectedIndex={selectedImportIndex} onSelect={setSelectedImportIndex} />
        </Card>

        <PaneSplitter label="Zmeniť šírku medzi sekciami a vybraným blokom" onPointerDown={(event) => startPaneResize("left", event)} />

        <Card className="min-h-0 p-3 xl:h-[calc(100vh-15rem)]">
          <h3 className="text-base font-semibold">Vybraný blok</h3>
          <div className="mt-3 max-h-[calc(100vh-20rem)] overflow-auto pr-1">
            <SelectedBlockEditor selectedImportLine={selectedImportLine} selectedImportIndex={selectedImportIndex} replaceImportLine={replaceImportLine} insertImportLine={insertImportLine} deleteImportLine={deleteImportLine} splitImportLine={splitImportLine} />
          </div>
          <div className="mt-3"><CollapsedDiagnostics lines={activeImportLines} /></div>
        </Card>

        <PaneSplitter label="Zmeniť šírku medzi vybraným blokom a A4 preview" onPointerDown={(event) => startPaneResize("middle", event)} />

        <Card className="min-h-0 p-3 xl:h-[calc(100vh-15rem)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">A4 master preview</h2>
              <div className="mt-0.5 text-xs text-zinc-600">Klikni na blok a upravuj ho vľavo.</div>
            </div>
            <div className="rounded-xl bg-zinc-50 px-3 py-2 text-sm ring-1 ring-zinc-200">
              <div className="font-semibold">{normalizeSongTitle(draft.title || "Nová pieseň")}</div>
            </div>
          </div>
          <div className="mt-3"><A4Sheet song={activeImportSong} sections={activeImportSections} selectedIndex={selectedImportIndex} onSelectBlock={setSelectedImportIndex} responsive={false} /></div>
        </Card>
      </div>
    </div>
  );
}
