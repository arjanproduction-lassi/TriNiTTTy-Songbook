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
  originalSong,
}: {
  setlistSongs: Song[];
  performanceIndex: number;
  renderedPerformance: Song | null;
  originalSong: Song | null;
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
  const goPrevious = () => {
    setTranspose(0);
    setPerformanceIndex((value) => Math.max(0, value - 1));
  };
  const goNext = () => {
    setTranspose(0);
    setPerformanceIndex((value) => Math.min(setlistSongs.length - 1, value + 1));
  };
  const transposeLabel = transpose > 0 ? `+${transpose}` : String(transpose);
  const originalKey = normalizeKeyInput(originalSong?.key || renderedPerformance.key);
  const renderedKey = normalizeKeyInput(renderedPerformance.key);
  const keyLabel = originalKey === renderedKey ? renderedKey : `${originalKey} -> ${renderedKey}`;
  const timeSignature = renderedPerformance.timeSignature?.trim();

  return (
    <div className="flex h-[100svh] flex-col overflow-hidden bg-zinc-100">
      <div
        className="shrink-0 border-b border-zinc-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm backdrop-blur sm:text-sm"
        style={{ paddingTop: "max(0.375rem, env(safe-area-inset-top))" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0">{currentPosition} / {setlistSongs.length}</span>
          <span className="min-w-0 flex-1 truncate">{normalizeSongTitle(renderedPerformance.title)}</span>
          <span className="shrink-0">Tónina: {keyLabel}</span>
          <span className="shrink-0">Transpozícia: {transposeLabel}</span>
          <span className="shrink-0">{renderedPerformance.bpm} BPM</span>
          {timeSignature && <span className="shrink-0">Takt: {timeSignature}</span>}
          <span className="shrink-0">Reader {readerZoom}%</span>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <FitA4Sheet song={renderedPerformance} sections={performanceSections} readerZoom={readerZoom} className="h-full" showOverflowWarning={false} />
      </div>

      <div
        className="shrink-0 border-t border-zinc-200 bg-white/95 px-3 py-2 shadow-sm"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <button
            type="button"
            disabled={previousDisabled}
            onClick={goPrevious}
            className="rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-800 ring-1 ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Späť
          </button>
          <button
            type="button"
            disabled={nextDisabled}
            onClick={goNext}
            className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Ďalšia →
          </button>
          <button
            type="button"
            onClick={() => setControlsOpen((open) => !open)}
            className="ml-auto rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-800 ring-1 ring-zinc-200"
            aria-expanded={controlsOpen}
          >
            Ovládanie
          </button>
        </div>
      </div>

      {controlsOpen && (
        <div className="fixed bottom-16 right-3 z-40 max-h-[min(72svh,34rem)] w-[min(92vw,26rem)] overflow-auto rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-zinc-200">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-bold">{normalizeSongTitle(renderedPerformance.title)}</div>
              <div className="mt-1 text-sm font-semibold text-zinc-500">{currentPosition} / {setlistSongs.length} · {keyLabel} · {renderedPerformance.duration}</div>
            </div>
            <button type="button" onClick={() => setControlsOpen(false)} className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-bold text-zinc-700 ring-1 ring-zinc-200">×</button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              disabled={previousDisabled}
              onClick={goPrevious}
              className="rounded-2xl bg-zinc-100 px-4 py-4 text-base font-bold text-zinc-800 ring-1 ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Späť
            </button>
            <button
              disabled={nextDisabled}
              onClick={goNext}
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
            <div className="mt-1 text-sm font-bold text-zinc-800">Transpozícia: {transposeLabel}</div>
            <div className="mt-0.5 text-sm font-semibold text-zinc-600">Tónina: {keyLabel}</div>
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
