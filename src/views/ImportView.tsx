import type { Dispatch, SetStateAction } from "react";
import type { ImportDraft, ImportMode, Line, SectionGroup, Song } from "../types";
import { A4Sheet } from "../components/A4Sheet";
import { Card, Field, InfoBox, PrimaryButton, SoftButton } from "../components/ui";
import { pairChordLine, withPairChords, withPairLyrics } from "../lib/chordAnchors";
import { normalizeKeyInput } from "../lib/chords";
import { convertLine, importDiagnostics, normalizeSongTitle } from "../lib/import";

type ImportViewProps = {
  importMode: ImportMode;
  importSplit: number;
  workSplit: number;
  leftEditorSplit: number;
  draft: ImportDraft;
  editingSongId: number | null;
  activeImportLines: Line[];
  activeImportSong: Song;
  activeImportSections: SectionGroup[];
  selectedImportIndex: number | null;
  selectedImportLine: Line | null;
  setImportSplit: (value: number) => void;
  setWorkSplit: (value: number) => void;
  setLeftEditorSplit: (value: number) => void;
  setDraft: Dispatch<SetStateAction<ImportDraft>>;
  setSelectedImportIndex: (index: number | null) => void;
  enterBlockImportMode: () => void;
  returnToRawImport: () => void;
  saveImportedSong: () => void;
  applyImportCleanup: () => void;
  resetImportTemplate: () => void;
  replaceImportLine: (index: number, line: Line) => void;
  insertImportLine: (index: number, direction: "above" | "below") => void;
  deleteImportLine: (index: number) => void;
};

function DraftFields({
  draft,
  setDraft,
  minFieldWidth = "7.5rem",
}: Pick<ImportViewProps, "draft" | "setDraft"> & { minFieldWidth?: string }) {
  const update = (key: keyof ImportDraft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));
  return (
    <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minFieldWidth}), 1fr))` }}>
      <Field label="Názov" value={draft.title} onChange={update("title")} />
      <Field label="Interpret" value={draft.artist} onChange={update("artist")} />
      <Field label="BPM" value={draft.bpm} onChange={update("bpm")} />
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
    <details className="rounded-3xl bg-white p-4 text-sm shadow-sm ring-1 ring-zinc-200">
      <summary className="cursor-pointer font-semibold text-zinc-700">Diagnostika importu</summary>
      <div className="mt-3">
        <Diagnostics lines={lines} />
      </div>
    </details>
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

function blockLabel(line: Line) {
  if (line.type === "space") return "prázdny blok";
  if (line.type === "pair") return line.lyrics || pairChordLine(line) || "pair";
  return line.text || line.type;
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
    <div className="mt-4 max-h-[68vh] space-y-4 overflow-auto pr-1">
      {sections.map((section) => (
        <div key={section.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-sm font-semibold">{section.implicit ? "[ Bez sekcie ]" : `[ ${section.title} ]`}</div>
          <div className="mt-3 space-y-2">
            {section.blocks.map(({ index, line }, i) => (
              <button
                key={index}
                onClick={() => onSelect(index)}
                className={`w-full rounded-2xl border px-3 py-2 text-left ${selectedIndex === index ? "border-amber-400 bg-amber-100" : "border-zinc-200 bg-white hover:bg-zinc-100"}`}
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
}: Pick<ImportViewProps, "selectedImportLine" | "selectedImportIndex" | "replaceImportLine" | "insertImportLine" | "deleteImportLine">) {
  if (!selectedImportLine || selectedImportIndex === null) {
    return <InfoBox>Klikni na blok vľavo alebo v A4 preview a otvorí sa jeho presná editácia.</InfoBox>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700 ring-1 ring-zinc-200">
        Blok #{selectedImportIndex + 1} • {selectedImportLine.type}
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-600">Typ bloku</label>
        <select value={selectedImportLine.type} onChange={(e) => replaceImportLine(selectedImportIndex, convertLine(selectedImportLine, e.target.value as Line["type"]))} className="w-full rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm">
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
            <textarea rows={3} spellCheck={false} value={pairChordLine(selectedImportLine)} onChange={(e) => replaceImportLine(selectedImportIndex, withPairChords(selectedImportLine, e.target.value))} className="min-h-[5.5rem] w-full resize-y rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 font-mono text-sm" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-600">Textový riadok</label>
            <textarea rows={3} spellCheck={false} value={selectedImportLine.lyrics} onChange={(e) => replaceImportLine(selectedImportIndex, withPairLyrics(selectedImportLine, e.target.value))} className="min-h-[5.5rem] w-full resize-y rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 font-mono text-sm" />
          </div>
        </>
      ) : selectedImportLine.type === "space" ? (
        <InfoBox>Toto je prázdny blok - vertikálna medzera v leadsheete.</InfoBox>
      ) : (
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-600">Obsah bloku</label>
          <textarea spellCheck={false} autoFocus value={selectedImportLine.text} onChange={(e) => replaceImportLine(selectedImportIndex, { ...selectedImportLine, text: e.target.value })} className="min-h-[360px] w-full rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 font-mono text-sm" />
          {selectedImportLine.type === "section" && <div className="mt-2 text-xs text-zinc-500">Píš len názov sekcie bez hranatých zátvoriek.</div>}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <SoftButton onClick={() => insertImportLine(selectedImportIndex, "above")}>Pridať nad</SoftButton>
        <SoftButton onClick={() => insertImportLine(selectedImportIndex, "below")}>Pridať pod</SoftButton>
        <button onClick={() => deleteImportLine(selectedImportIndex)} className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white">Zmazať blok</button>
      </div>
    </div>
  );
}

export function ImportView(props: ImportViewProps) {
  const {
    importMode,
    importSplit,
    workSplit,
    leftEditorSplit,
    draft,
    editingSongId,
    activeImportLines,
    activeImportSong,
    activeImportSections,
    selectedImportIndex,
    selectedImportLine,
    setImportSplit,
    setWorkSplit,
    setLeftEditorSplit,
    setDraft,
    setSelectedImportIndex,
    enterBlockImportMode,
    returnToRawImport,
    saveImportedSong,
    applyImportCleanup,
    resetImportTemplate,
    replaceImportLine,
    insertImportLine,
    deleteImportLine,
  } = props;

  if (importMode === "raw") {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-900">Šírka okien importu</div>
              <div className="text-xs text-zinc-500">Vľavo raw vstup, vpravo pravdivý A4 náhľad.</div>
            </div>
            <SplitControl leftLabel="Editor" rightLabel="Náhľad" value={importSplit} min={26} max={62} step={2} onChange={setImportSplit} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="grid min-w-[1180px] gap-6" style={{ gridTemplateColumns: `${importSplit}% ${100 - importSplit}%` }}>
            <Card className="self-start">
              <h2 className="text-xl font-semibold">Raw import</h2>
              {editingSongId !== null && <div className="mt-3"><InfoBox tone="sky">Upravuješ existujúcu pieseň: <span className="font-semibold">{normalizeSongTitle(draft.title || "bez názvu")}</span>. Uloženie prepíše jej aktuálnu verziu.</InfoBox></div>}
              <div className="mt-3"><InfoBox tone="amber">Sem vložíš text z Wordu. Potom ho rozparsuješ a prepneš sa do širokého A4 blokového editora.</InfoBox></div>
              <DraftFields draft={draft} setDraft={setDraft} />
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-zinc-600">Leadsheet text</label>
                  <div className="text-xs text-zinc-500">Čo vložíš sem, vidíš hneď vpravo.</div>
                </div>
                <textarea value={draft.rawText} onChange={(e) => setDraft((d) => ({ ...d, rawText: e.target.value }))} spellCheck={false} className="min-h-[58vh] w-full rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 font-mono text-sm leading-5" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <PrimaryButton onClick={enterBlockImportMode}>Rozparsovať a prejsť do širokého editora</PrimaryButton>
                <button onClick={applyImportCleanup} className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">Predčistiť import</button>
                <SoftButton onClick={resetImportTemplate}>Obnoviť šablónu</SoftButton>
              </div>
              <div className="mt-4"><Diagnostics lines={activeImportLines} /></div>
            </Card>
            <Card className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Live náhľad</h2>
                  <div className="mt-1 text-sm text-zinc-600">Pravda je tu, nie vo Worde.</div>
                </div>
                <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm ring-1 ring-zinc-200">
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
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-3">
          <SplitControl leftLabel="Pracovná zóna" rightLabel="A4 preview" value={workSplit} min={38} max={60} step={2} onChange={setWorkSplit} />
          <SplitControl leftLabel="Sekcie" rightLabel="Editor bloku" value={leftEditorSplit} min={34} max={60} step={2} onChange={setLeftEditorSplit} />
        </div>
      </Card>
      <div className="overflow-x-auto">
        <div className="grid min-w-[1420px] gap-6" style={{ gridTemplateColumns: `${workSplit}% ${100 - workSplit}%` }}>
          <div className="space-y-4">
            <Card>
              <h2 className="text-xl font-semibold">Široký blokový editor</h2>
              {editingSongId !== null && <div className="mt-3"><InfoBox tone="sky">Upravuješ existujúcu skladbu: <span className="font-semibold">{normalizeSongTitle(draft.title || "bez názvu")}</span>. Uloženie prepíše pôvodnú verziu.</InfoBox></div>}
              <div className="mt-4 flex flex-wrap gap-2">
                <SoftButton onClick={returnToRawImport}>Späť na raw import</SoftButton>
                <PrimaryButton onClick={saveImportedSong}>{editingSongId !== null ? "Uložiť a prepísať skladbu" : "Uložiť ako novú pieseň"}</PrimaryButton>
              </div>
              <DraftFields draft={draft} setDraft={setDraft} minFieldWidth="6.5rem" />
            </Card>

            <div className="grid gap-4" style={{ gridTemplateColumns: `${leftEditorSplit}% ${100 - leftEditorSplit}%` }}>
              <Card>
                <h3 className="text-lg font-semibold">Sekcie a bloky</h3>
                <BlockNavigator sections={activeImportSections} selectedIndex={selectedImportIndex} onSelect={setSelectedImportIndex} />
              </Card>

              <Card>
                <h3 className="text-lg font-semibold">Vybraný blok</h3>
                <div className="mt-4">
                  <SelectedBlockEditor selectedImportLine={selectedImportLine} selectedImportIndex={selectedImportIndex} replaceImportLine={replaceImportLine} insertImportLine={insertImportLine} deleteImportLine={deleteImportLine} />
                </div>
              </Card>
            </div>
            <CollapsedDiagnostics lines={activeImportLines} />
          </div>

          <Card>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">A4 master preview</h2>
                <div className="mt-1 text-sm text-zinc-600">Čo vidíš tu, to sa uloží a to isté pôjde do setlistu.</div>
              </div>
              <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm ring-1 ring-zinc-200">
                <div className="font-semibold">{normalizeSongTitle(draft.title || "Nová pieseň")}</div>
                <div className="mt-1 text-zinc-500">Klikni na blok a upravuj ho vľavo.</div>
              </div>
            </div>
            <div className="mt-4"><A4Sheet song={activeImportSong} sections={activeImportSections} selectedIndex={selectedImportIndex} onSelectBlock={setSelectedImportIndex} responsive={false} /></div>
          </Card>
        </div>
      </div>
    </div>
  );
}
