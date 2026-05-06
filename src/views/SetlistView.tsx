import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { NamedSetlist, Notation, SectionGroup, Song, View } from "../types";
import { A4Sheet } from "../components/A4Sheet";
import { Card, PrimaryButton, SoftButton, TransposeControls } from "../components/ui";
import { normalizeKeyInput } from "../lib/chords";
import { normalizeSongTitle } from "../lib/import";

function durationSeconds(duration: string) {
  const parts = duration.split(":").map((part) => Number(part.trim())).filter((part) => Number.isFinite(part));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0] * 60;
  return 0;
}

function formatTotalDuration(songs: Song[]) {
  const total = songs.filter((song) => !song.deletedAt).reduce((sum, song) => sum + durationSeconds(song.duration), 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours) return `${hours} h ${minutes} min`;
  return seconds ? `${minutes}:${String(seconds).padStart(2, "0")} min` : `${minutes} min`;
}

function formatTransposeLabel(transpose: number) {
  return transpose > 0 ? `+${transpose}` : String(transpose);
}

export function SetlistView({
  setlists,
  activeSetlistId,
  setlistSongs,
  setlistPreviewSong,
  renderedSetlistPreview,
  setlistPreviewSections,
  transpose,
  notation,
  setSetlistPreviewSongId,
  moveSetlist,
  removeFromSetlist,
  setTranspose,
  setNotation,
  switchSetlist,
  createSetlist,
  renameSetlist,
  deleteActiveSetlist,
  startPerformance,
  startPerformanceAt,
  printSong,
  setView,
}: {
  setlists: NamedSetlist[];
  activeSetlistId: number;
  setlistSongs: Song[];
  setlistPreviewSong: Song | null;
  renderedSetlistPreview: Song | null;
  setlistPreviewSections: SectionGroup[];
  transpose: number;
  notation: Notation;
  setSetlistPreviewSongId: (id: number) => void;
  moveSetlist: (index: number, dir: number) => void;
  removeFromSetlist: (index: number) => void;
  setTranspose: Dispatch<SetStateAction<number>>;
  setNotation: (notation: Notation) => void;
  switchSetlist: (id: number) => void;
  createSetlist: (name: string) => void;
  renameSetlist: (name: string) => void;
  deleteActiveSetlist: () => void;
  startPerformance: () => void;
  startPerformanceAt: (index: number) => void;
  printSong: (song: Song) => void;
  setView: (view: View) => void;
}) {
  const activeSetlist = setlists.find((setlist) => setlist.id === activeSetlistId) ?? setlists[0] ?? null;
  const [setlistNameDraft, setSetlistNameDraft] = useState(activeSetlist?.name ?? "");

  useEffect(() => {
    setSetlistNameDraft(activeSetlist?.name ?? "");
  }, [activeSetlist?.id, activeSetlist?.name]);

  const trimmedSetlistName = setlistNameDraft.trim();
  const createNextSetlist = () => createSetlist(trimmedSetlistName || `Setlist ${setlists.length + 1}`);
  const renameActiveSetlist = () => {
    if (trimmedSetlistName) renameSetlist(trimmedSetlistName);
  };
  const sourceKey = setlistPreviewSong ? normalizeKeyInput(setlistPreviewSong.key) : "";
  const renderedKey = renderedSetlistPreview ? normalizeKeyInput(renderedSetlistPreview.key) : "";
  const keyStatus = sourceKey && renderedKey ? `${sourceKey} -> ${renderedKey}` : "";

  return (
    <div className="grid gap-4 xl:grid-cols-[0.76fr_1.24fr]">
      <Card>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Setlist</h2>
            <p className="mt-1 text-sm text-zinc-500">Klikni na skladbu vľavo a vpravo sa ukáže celý A4 paper.</p>
          </div>
          <div className="rounded-xl bg-zinc-50 px-3 py-2 text-sm ring-1 ring-zinc-200">
            <div className="text-xs text-zinc-500">Celkový čas</div>
            <div className="font-bold">{formatTotalDuration(setlistSongs)}</div>
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
          <label className="mb-2 block text-sm font-medium text-zinc-700">Aktuálny setlist</label>
          <select value={activeSetlistId} onChange={(e) => switchSetlist(Number(e.target.value))} className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm">
            {setlists.map((setlist) => <option key={setlist.id} value={setlist.id}>{setlist.name}</option>)}
          </select>
          <div className="mt-2 grid gap-2">
            <input
              value={setlistNameDraft}
              onChange={(e) => setSetlistNameDraft(e.target.value)}
              placeholder="Názov setlistu"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <SoftButton onClick={createNextSetlist}>Nový setlist</SoftButton>
              <SoftButton disabled={!trimmedSetlistName} onClick={renameActiveSetlist} className="disabled:cursor-not-allowed disabled:opacity-40">Premenovať</SoftButton>
              <button disabled={setlists.length <= 1} onClick={deleteActiveSetlist} className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 ring-1 ring-rose-200 disabled:cursor-not-allowed disabled:opacity-40">Zmazať setlist</button>
            </div>
          </div>
        </div>

        <div className="mt-3 grid max-h-[calc(100vh-22rem)] gap-2 overflow-auto pr-1 md:grid-cols-2 xl:grid-cols-1">
          {!setlistSongs.length && (
            <div className="rounded-2xl bg-zinc-50 p-5 text-sm text-zinc-600 ring-1 ring-zinc-200">
              Setlist je zatiaľ prázdny. Pridaj skladby z knižnice.
            </div>
          )}
          {setlistSongs.map((song, index) => (
            <div key={`${song.id}-${index}`} className={`w-full rounded-xl border p-3 ${setlistPreviewSong?.id === song.id ? "border-zinc-900 bg-zinc-900 text-white" : song.deletedAt ? "border-amber-200 bg-amber-50 text-amber-950" : "border-zinc-200 bg-zinc-50 text-zinc-900"}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <button type="button" disabled={Boolean(song.deletedAt)} onClick={() => setSetlistPreviewSongId(song.id)} className="min-w-0 flex-1 text-left disabled:cursor-not-allowed">
                  <div className="font-semibold">{index + 1}. {song.deletedAt ? "Odstránená skladba" : normalizeSongTitle(song.title)}</div>
                  <div className={`mt-1 text-sm ${setlistPreviewSong?.id === song.id ? "text-zinc-200" : song.deletedAt ? "text-amber-800" : "text-zinc-500"}`}>
                    {song.deletedAt ? normalizeSongTitle(song.title) : `${normalizeKeyInput(song.key)} • ${song.bpm} BPM • ${song.duration}`}
                  </div>
                </button>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button type="button" disabled={Boolean(song.deletedAt)} onClick={() => startPerformanceAt(index)} className="rounded-xl bg-sky-600 px-3 py-1 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Čítať</button>
                  <button type="button" onClick={() => moveSetlist(index, -1)} className="rounded-xl bg-white px-3 py-1 text-sm text-zinc-800 ring-1 ring-zinc-200">↑</button>
                  <button type="button" onClick={() => moveSetlist(index, 1)} className="rounded-xl bg-white px-3 py-1 text-sm text-zinc-800 ring-1 ring-zinc-200">↓</button>
                  <button type="button" onClick={() => removeFromSetlist(index)} className="rounded-xl bg-white px-3 py-1 text-sm text-zinc-800 ring-1 ring-zinc-200">×</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
          <div className="text-sm font-medium text-zinc-700">Transpozícia pre setlist / performance</div>
          <div className="mt-2"><TransposeControls compact transpose={transpose} notation={notation} onTranspose={setTranspose} onNotation={setNotation} /></div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-zinc-600">
            <span className="rounded-lg bg-white px-2 py-1 ring-1 ring-zinc-200">Transpozícia: {formatTransposeLabel(transpose)}</span>
            {keyStatus && <span className="rounded-lg bg-white px-2 py-1 ring-1 ring-zinc-200">Tónina: {keyStatus}</span>}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <PrimaryButton disabled={!setlistSongs.length} onClick={startPerformance}>Spustiť koncertný režim</PrimaryButton>
          {renderedSetlistPreview && <SoftButton onClick={() => printSong(renderedSetlistPreview)}>Tlačiť / PDF</SoftButton>}
          <SoftButton onClick={() => setView("songs")}>Pridať ďalšie piesne</SoftButton>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">A4 náhľad vybratej skladby</h2>
        <div className="mt-1 text-sm text-zinc-600">Reálny veľký papier vybratej položky zo setlistu.</div>
        <div className="mt-3">
          {renderedSetlistPreview ? (
            <A4Sheet song={renderedSetlistPreview} sections={setlistPreviewSections} />
          ) : (
            <div className="rounded-2xl bg-zinc-50 p-5 text-sm text-zinc-600 ring-1 ring-zinc-200">Nie je vybraná žiadna skladba.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
