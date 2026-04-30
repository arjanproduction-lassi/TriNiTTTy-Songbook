import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { SectionGroup, Song } from "../types";
import { FitA4Sheet } from "../components/A4Sheet";
import { Card, TransposeControls } from "../components/ui";
import { normalizeKeyInput } from "../lib/chords";
import { normalizeSongTitle } from "../lib/import";

const MIN_READER_ZOOM = 100;
const MAX_READER_ZOOM = 125;
const ZOOM_STEP = 5;

export function PerformanceView({
  setlistSongs,
  performanceIndex,
  renderedPerformance,
  performanceSections,
  setPerformanceIndex,
  setTranspose,
  transpose,
  onBackToSetlist,
}: {
  setlistSongs: Song[];
  performanceIndex: number;
  renderedPerformance: Song | null;
  performanceSections: SectionGroup[];
  setPerformanceIndex: Dispatch<SetStateAction<number>>;
  setTranspose: Dispatch<SetStateAction<number>>;
  transpose: number;
  onBackToSetlist: () => void;
}) {
  const [controlsOpen, setControlsOpen] = useState(false);
  const [readerZoom, setReaderZoom] = useState(MIN_READER_ZOOM);

  useEffect(() => {
    if (!controlsOpen) return undefined;
    const timer = window.setTimeout(() => setControlsOpen(false), 7000);
    return () => window.clearTimeout(timer);
  }, [controlsOpen, performanceIndex, readerZoom, transpose]);

  if (!renderedPerformance) {
    return (
      <Card>
        <h2 className="text-xl font-semibold">Koncertný režim</h2>
        <div className="mt-4 rounded-2xl bg-zinc-50 p-5 text-sm text-zinc-600 ring-1 ring-zinc-200">
          Setlist je prázdny. Najprv pridaj skladby do setlistu.
        </div>
      </Card>
    );
  }

  const previousDisabled = performanceIndex <= 0;
  const nextDisabled = performanceIndex >= setlistSongs.length - 1;
  const currentPosition = setlistSongs.length ? performanceIndex + 1 : 0;
  const changeZoom = (direction: number) => setReaderZoom((value) => Math.min(MAX_READER_ZOOM, Math.max(MIN_READER_ZOOM, value + direction * ZOOM_STEP)));

  return (
    <div className="relative h-[100svh] overflow-hidden bg-zinc-100">
      <FitA4Sheet song={renderedPerformance} sections={performanceSections} readerZoom={readerZoom} />

      <div className="pointer-events-none fixed left-3 top-3 z-30 max-w-[calc(100vw-6rem)] rounded-2xl bg-white/90 px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200 backdrop-blur sm:text-sm">
        <div className="truncate">{currentPosition} / {setlistSongs.length} · {normalizeSongTitle(renderedPerformance.title)}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-zinc-500">
          <span>{normalizeKeyInput(renderedPerformance.key)}</span>
          <span>{renderedPerformance.bpm} BPM</span>
          <span>Reader {readerZoom}%</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setControlsOpen((open) => !open)}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-zinc-900 px-5 py-4 text-sm font-bold text-white shadow-xl ring-1 ring-zinc-700"
        aria-expanded={controlsOpen}
      >
        Ovládanie
      </button>

      {controlsOpen && (
        <div className="fixed bottom-20 right-4 z-40 w-[min(92vw,26rem)] rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-zinc-200">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-bold">{normalizeSongTitle(renderedPerformance.title)}</div>
              <div className="mt-1 text-sm font-semibold text-zinc-500">{currentPosition} / {setlistSongs.length} · {normalizeKeyInput(renderedPerformance.key)} · {renderedPerformance.duration}</div>
            </div>
            <button type="button" onClick={() => setControlsOpen(false)} className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-bold text-zinc-700 ring-1 ring-zinc-200">×</button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              disabled={previousDisabled}
              onClick={() => setPerformanceIndex((v) => Math.max(0, v - 1))}
              className="rounded-2xl bg-zinc-100 px-4 py-4 text-base font-bold text-zinc-800 ring-1 ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Späť
            </button>
            <button
              disabled={nextDisabled}
              onClick={() => setPerformanceIndex((v) => Math.min(setlistSongs.length - 1, v + 1))}
              className="rounded-2xl bg-zinc-900 px-4 py-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Ďalšia →
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button disabled={readerZoom <= MIN_READER_ZOOM} onClick={() => changeZoom(-1)} className="rounded-2xl bg-zinc-100 px-3 py-3 text-sm font-bold text-zinc-800 ring-1 ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-40">Reader -</button>
            <button onClick={() => setReaderZoom(MIN_READER_ZOOM)} className="rounded-2xl bg-zinc-50 px-3 py-3 text-sm font-bold text-zinc-700 ring-1 ring-zinc-200">{readerZoom}%</button>
            <button disabled={readerZoom >= MAX_READER_ZOOM} onClick={() => changeZoom(1)} className="rounded-2xl bg-zinc-100 px-3 py-3 text-sm font-bold text-zinc-800 ring-1 ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-40">Reader +</button>
          </div>

          <div className="mt-3 rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Transpozícia</div>
            <div className="mt-2"><TransposeControls compact transpose={transpose} onTranspose={setTranspose} /></div>
          </div>

          <button onClick={onBackToSetlist} className="mt-3 w-full rounded-2xl bg-sky-600 px-4 py-4 text-base font-bold text-white">
            Setlist
          </button>
        </div>
      )}
    </div>
  );
}
