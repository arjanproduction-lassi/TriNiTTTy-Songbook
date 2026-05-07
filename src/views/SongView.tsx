import type { Dispatch, SetStateAction } from "react";
import type { Notation, SectionGroup, Song } from "../types";
import { A4Sheet, FitA4Sheet } from "../components/A4Sheet";
import { Card, Chip, PrimaryButton, SoftButton, TransposeControls } from "../components/ui";
import { normalizeKeyInput } from "../lib/chords";
import { normalizeSongTitle } from "../lib/import";

export function SongView({
  songs,
  selectedSongId,
  selectedSong,
  renderedSong,
  sections,
  transpose,
  notation,
  copyStatus,
  setSelectedSongId,
  setTranspose,
  setNotation,
  isInSetlist,
  toggleSetlist,
  startEditingSong,
  openInSetlist,
  copySong,
  exportSongText,
  deleteSong,
  printSong,
}: {
  songs: Song[];
  selectedSongId: number;
  selectedSong: Song | null;
  renderedSong: Song | null;
  sections: SectionGroup[];
  transpose: number;
  notation: Notation;
  copyStatus: string;
  setSelectedSongId: (id: number) => void;
  setTranspose: Dispatch<SetStateAction<number>>;
  setNotation: (notation: Notation) => void;
  isInSetlist: (songId: number) => boolean;
  toggleSetlist: (songId: number) => void;
  startEditingSong: (song: Song) => void;
  openInSetlist: (songId: number) => void;
  copySong: (song: Song) => void;
  exportSongText: (song: Song) => void;
  deleteSong: (songId: number) => void;
  printSong: (song: Song) => void;
}) {
  if (!selectedSong || !renderedSong) {
    return (
      <Card>
        <h2 className="text-xl font-semibold">Skladba</h2>
        <div className="mt-4 rounded-2xl bg-zinc-50 p-5 text-sm text-zinc-600 ring-1 ring-zinc-200">
          Knižnica je prázdna. Pridaj novú skladbu cez Import alebo importuj backup.
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
      <div className="space-y-4">
        <Card>
          <h2 className="text-xl font-semibold">Skladba</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-600">Vybraná pieseň</label>
              <select value={selectedSongId} onChange={(e) => { setSelectedSongId(Number(e.target.value)); setTranspose(0); }} className="w-full rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm">
                {songs.map((song) => <option key={song.id} value={song.id}>{normalizeSongTitle(song.title)}</option>)}
              </select>
            </div>
            <TransposeControls transpose={transpose} notation={notation} onTranspose={setTranspose} onNotation={setNotation} />
            <div className="flex flex-wrap gap-2">
              <button onClick={() => toggleSetlist(selectedSong.id)} className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isInSetlist(selectedSong.id) ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"}`}>{isInSetlist(selectedSong.id) ? "Odobrať zo setlistu" : "Pridať do setlistu"}</button>
              <button onClick={() => startEditingSong(selectedSong)} className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white">Upraviť skladbu</button>
              <SoftButton onClick={() => openInSetlist(selectedSong.id)}>Otvoriť v setliste</SoftButton>
              <PrimaryButton onClick={() => copySong(renderedSong)}>Kopírovať TXT</PrimaryButton>
              <SoftButton onClick={() => exportSongText(renderedSong)}>Export TXT</SoftButton>
              <SoftButton onClick={() => printSong(renderedSong)}>Tlačiť / PDF</SoftButton>
              <button onClick={() => deleteSong(selectedSong.id)} className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white">Zmazať skladbu</button>
            </div>
            <div className="text-xs text-zinc-500">Vlož do Wordu/Docs ako čistý text a použi monospace font, napr. Courier New alebo Consolas.</div>
            {copyStatus && <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 ring-1 ring-zinc-200">{copyStatus}</div>}
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Info o skladbe</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip>{normalizeKeyInput(renderedSong.key)}</Chip>
            <Chip>{renderedSong.bpm} BPM</Chip>
            {renderedSong.timeSignature && <Chip>Takt {renderedSong.timeSignature}</Chip>}
            <Chip>Capo {renderedSong.capo}</Chip>
            <Chip>{renderedSong.duration}</Chip>
          </div>
        </Card>
      </div>
      <div className="min-w-0 xl:hidden">
        <FitA4Sheet song={renderedSong} sections={sections} readerZoom={100} className="h-[82svh] rounded-3xl ring-1 ring-zinc-200" />
      </div>
      <div className="hidden min-w-0 xl:block">
        <A4Sheet song={renderedSong} sections={sections} />
      </div>
    </div>
  );
}
