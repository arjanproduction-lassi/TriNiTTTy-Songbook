import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { SectionGroup, Song } from "../types";
import { FitA4Sheet } from "../components/A4Sheet";
import { Card, TransposeControls } from "../components/ui";
import { normalizeKeyInput } from "../lib/chords";
import { normalizeSongTitle } from "../lib/import";

const READER_BASELINE_INTERNAL_ZOOM = 115;
const READER_BASELINE_DISPLAY_ZOOM = 100;
const READER_ZOOM_LEVELS = [70, 85, READER_BASELINE_DISPLAY_ZOOM, 115, 130, 145, 160, 175, 190, 200];
const MIN_READER_DISPLAY_ZOOM = READER_ZOOM_LEVELS[0];
const MAX_READER_DISPLAY_ZOOM = READER_ZOOM_LEVELS[READER_ZOOM_LEVELS.length - 1];
const MIN_READER_INTERNAL_ZOOM = (MIN_READER_DISPLAY_ZOOM / READER_BASELINE_DISPLAY_ZOOM) * READER_BASELINE_INTERNAL_ZOOM;
const MAX_READER_INTERNAL_ZOOM = (MAX_READER_DISPLAY_ZOOM / READER_BASELINE_DISPLAY_ZOOM) * READER_BASELINE_INTERNAL_ZOOM;
const PERFORMANCE_READER_ZOOM_KEY = "lassilab-performance-reader-zoom";

function normalizeReaderDisplayZoom(value: number) {
  if (!Number.isFinite(value)) return READER_BASELINE_DISPLAY_ZOOM;
  const clamped = Math.min(MAX_READER_DISPLAY_ZOOM, Math.max(MIN_READER_DISPLAY_ZOOM, value));
  return READER_ZOOM_LEVELS.reduce((closest, level) => (
    Math.abs(level - clamped) < Math.abs(closest - clamped) ? level : closest
  ), READER_BASELINE_DISPLAY_ZOOM);
}

function readPerformanceReaderZoom() {
  try {
    const raw = window.localStorage.getItem(PERFORMANCE_READER_ZOOM_KEY);
    return raw ? normalizeReaderDisplayZoom(Number(raw)) : READER_BASELINE_DISPLAY_ZOOM;
  } catch {
    return READER_BASELINE_DISPLAY_ZOOM;
  }
}

function writePerformanceReaderZoom(value: number) {
  try {
    window.localStorage.setItem(PERFORMANCE_READER_ZOOM_KEY, String(normalizeReaderDisplayZoom(value)));
  } catch {
    // Reader zoom is device-local comfort state. Performance mode still works without storage.
  }
}

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
  removeEventListener: (type: "release", listener: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

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
  screenNightMode,
  onToggleScreenNightMode,
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
  screenNightMode: boolean;
  onToggleScreenNightMode: () => void;
}) {
  const [controlsOpen, setControlsOpen] = useState(false);
  const [readerZoom, setReaderZoom] = useState(() => readPerformanceReaderZoom());
  const [wakeLockWanted, setWakeLockWanted] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockMessage, setWakeLockMessage] = useState("");
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const wakeLockReleaseHandlerRef = useRef<(() => void) | null>(null);

  const releaseWakeLock = useCallback(async () => {
    const sentinel = wakeLockRef.current;
    const releaseHandler = wakeLockReleaseHandlerRef.current;
    wakeLockRef.current = null;
    wakeLockReleaseHandlerRef.current = null;

    if (sentinel && releaseHandler) {
      sentinel.removeEventListener("release", releaseHandler);
    }

    try {
      if (sentinel && !sentinel.released) await sentinel.release();
    } catch {
      // Wake Lock release may fail if the browser already released it.
    }

    setWakeLockActive(false);
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === "undefined") return;

    const wakeLock = (navigator as WakeLockNavigator).wakeLock;
    if (!wakeLock) {
      setWakeLockActive(false);
      setWakeLockMessage("Tento prehliadač nepodporuje nezhasínanie displeja.");
      return;
    }

    if (document.visibilityState !== "visible") return;

    if (wakeLockRef.current && !wakeLockRef.current.released) {
      setWakeLockActive(true);
      setWakeLockMessage("Displej zostane zapnutý.");
      return;
    }

    try {
      const sentinel = await wakeLock.request("screen");
      const handleRelease = () => {
        if (wakeLockRef.current === sentinel) {
          wakeLockRef.current = null;
          wakeLockReleaseHandlerRef.current = null;
        }
        setWakeLockActive(false);
        setWakeLockMessage("Nezhasínanie displeja bolo uvoľnené systémom.");
      };

      sentinel.addEventListener("release", handleRelease);
      wakeLockRef.current = sentinel;
      wakeLockReleaseHandlerRef.current = handleRelease;
      setWakeLockActive(true);
      setWakeLockMessage("Displej zostane zapnutý.");
    } catch {
      wakeLockRef.current = null;
      wakeLockReleaseHandlerRef.current = null;
      setWakeLockActive(false);
      setWakeLockMessage("Nezhasínanie displeja sa nepodarilo zapnúť.");
    }
  }, []);

  const toggleWakeLock = () => {
    if (!wakeLockWanted && typeof navigator !== "undefined" && !(navigator as WakeLockNavigator).wakeLock) {
      setWakeLockActive(false);
      setWakeLockMessage("Tento prehliadač nepodporuje nezhasínanie displeja.");
      return;
    }
    setWakeLockWanted((enabled) => !enabled);
  };

  useEffect(() => {
    if (!controlsOpen) return undefined;
    const timer = window.setTimeout(() => setControlsOpen(false), 7000);
    return () => window.clearTimeout(timer);
  }, [controlsOpen, performanceIndex, readerZoom, transpose]);

  useEffect(() => {
    writePerformanceReaderZoom(readerZoom);
  }, [readerZoom]);

  useEffect(() => {
    if (wakeLockWanted) {
      void requestWakeLock();
      return undefined;
    }

    setWakeLockMessage("");
    void releaseWakeLock();
    return undefined;
  }, [releaseWakeLock, requestWakeLock, wakeLockWanted]);

  useEffect(() => {
    if (!wakeLockWanted) return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void requestWakeLock();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [requestWakeLock, wakeLockWanted]);

  useEffect(() => {
    return () => {
      const sentinel = wakeLockRef.current;
      const releaseHandler = wakeLockReleaseHandlerRef.current;
      wakeLockRef.current = null;
      wakeLockReleaseHandlerRef.current = null;
      if (sentinel && releaseHandler) sentinel.removeEventListener("release", releaseHandler);
      if (sentinel && !sentinel.released) void sentinel.release();
    };
  }, []);

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
  const readerZoomLabel = readerZoom === READER_BASELINE_DISPLAY_ZOOM ? "Základ" : `${readerZoom}%`;
  const internalReaderZoom = (readerZoom / READER_BASELINE_DISPLAY_ZOOM) * READER_BASELINE_INTERNAL_ZOOM;
  const changeZoom = (direction: number) => setReaderZoom((value) => {
    const currentIndex = READER_ZOOM_LEVELS.indexOf(value);
    const safeIndex = currentIndex === -1 ? READER_ZOOM_LEVELS.indexOf(READER_BASELINE_DISPLAY_ZOOM) : currentIndex;
    const nextIndex = Math.min(READER_ZOOM_LEVELS.length - 1, Math.max(0, safeIndex + direction));
    return READER_ZOOM_LEVELS[nextIndex];
  });
  const goPrevious = () => {
    setTranspose(0);
    setPerformanceIndex((value) => Math.max(0, value - 1));
  };
  const goNext = () => {
    setTranspose(0);
    setPerformanceIndex((value) => Math.min(setlistSongs.length - 1, value + 1));
  };
  const transposeLabel = transpose > 0 ? `+${transpose}` : String(transpose);
  const stageDark = screenNightMode;
  const stageDarkToggleLabel = stageDark ? "Denný režim" : "Nočný režim";
  const wakeLockLabel = wakeLockActive ? "Displej stále zapnutý" : wakeLockWanted ? "Čakám na displej" : "Nezhasínať displej";
  const wakeLockStatusText = wakeLockActive ? "Displej zostane zapnutý." : wakeLockMessage;
  const originalKey = normalizeKeyInput(originalSong?.key || renderedPerformance.key);
  const renderedKey = normalizeKeyInput(renderedPerformance.key);
  const keyLabel = originalKey === renderedKey ? renderedKey : `${originalKey} -> ${renderedKey}`;
  const timeSignature = renderedPerformance.timeSignature?.trim();
  const shellClass = stageDark
    ? "performance-stage-dark flex h-[100svh] flex-col overflow-hidden bg-zinc-950 text-zinc-100"
    : "flex h-[100svh] flex-col overflow-hidden bg-zinc-100";
  const hudClass = stageDark
    ? "shrink-0 border-b border-zinc-800 bg-zinc-950/95 px-3 py-1.5 text-xs font-semibold text-zinc-200 shadow-sm backdrop-blur sm:text-sm"
    : "shrink-0 border-b border-zinc-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm backdrop-blur sm:text-sm";
  const footerClass = stageDark
    ? "shrink-0 border-t border-zinc-800 bg-zinc-950/95 px-3 py-2 shadow-sm"
    : "shrink-0 border-t border-zinc-200 bg-white/95 px-3 py-2 shadow-sm";
  const secondaryButtonClass = stageDark
    ? "rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-bold text-zinc-100 ring-1 ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
    : "rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-800 ring-1 ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-40";
  const primaryButtonClass = stageDark
    ? "rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
    : "rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40";
  const panelClass = stageDark
    ? "fixed bottom-16 right-3 z-40 max-h-[min(72svh,34rem)] w-[min(92vw,26rem)] overflow-auto rounded-3xl bg-zinc-950 p-4 text-zinc-100 shadow-2xl ring-1 ring-zinc-700"
    : "fixed bottom-16 right-3 z-40 max-h-[min(72svh,34rem)] w-[min(92vw,26rem)] overflow-auto rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-zinc-200";
  const closeButtonClass = stageDark
    ? "rounded-full bg-zinc-900 px-3 py-1 text-sm font-bold text-zinc-200 ring-1 ring-zinc-700"
    : "rounded-full bg-zinc-100 px-3 py-1 text-sm font-bold text-zinc-700 ring-1 ring-zinc-200";
  const nightToggleClass = stageDark
    ? "rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-950 ring-1 ring-zinc-100"
    : "rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-800 ring-1 ring-zinc-200";
  const wakeLockButtonClass = wakeLockWanted && wakeLockActive
    ? stageDark
      ? "rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-bold text-zinc-950 ring-1 ring-emerald-200"
      : "rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white ring-1 ring-emerald-600"
    : secondaryButtonClass;
  const mutedTextClass = stageDark ? "text-zinc-400" : "text-zinc-500";
  const subtleTextClass = stageDark ? "text-zinc-300" : "text-zinc-600";
  const transposePanelClass = stageDark
    ? "mt-3 rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-700"
    : "mt-3 rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-200";

  return (
    <div className={shellClass}>
      <div
        className={hudClass}
        style={{ paddingTop: "max(0.375rem, env(safe-area-inset-top))" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0">{currentPosition} / {setlistSongs.length}</span>
          <span className="min-w-0 flex-1 truncate">{normalizeSongTitle(renderedPerformance.title)}</span>
          <span className="shrink-0">Tónina: {keyLabel}</span>
          <span className="shrink-0">Transpozícia: {transposeLabel}</span>
          <span className="shrink-0">{renderedPerformance.bpm} BPM</span>
          {timeSignature && <span className="shrink-0">Takt: {timeSignature}</span>}
          <span className="shrink-0">Reader {readerZoomLabel}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <FitA4Sheet
          song={renderedPerformance}
          sections={performanceSections}
          readerZoom={internalReaderZoom}
          minZoom={MIN_READER_INTERNAL_ZOOM}
          maxZoom={MAX_READER_INTERNAL_ZOOM}
          className="a4-performance-fit h-full"
          showOverflowWarning={false}
        />
      </div>

      <div
        className={footerClass}
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={previousDisabled}
            onClick={goPrevious}
            className={secondaryButtonClass}
          >
            ← Späť
          </button>
          <button
            type="button"
            disabled={nextDisabled}
            onClick={goNext}
            className={primaryButtonClass}
          >
            Ďalšia →
          </button>
          <button
            type="button"
            onClick={onToggleScreenNightMode}
            className={`ml-auto ${nightToggleClass}`}
            aria-pressed={stageDark}
          >
            {stageDarkToggleLabel}
          </button>
          <button
            type="button"
            onClick={toggleWakeLock}
            className={wakeLockButtonClass}
            aria-pressed={wakeLockWanted}
          >
            {wakeLockLabel}
          </button>
          <button
            type="button"
            onClick={() => setControlsOpen((open) => !open)}
            className={secondaryButtonClass}
            aria-expanded={controlsOpen}
          >
            Ovládanie
          </button>
        </div>
      </div>

      {controlsOpen && (
        <div className={panelClass}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-bold">{normalizeSongTitle(renderedPerformance.title)}</div>
              <div className={`mt-1 text-sm font-semibold ${mutedTextClass}`}>{currentPosition} / {setlistSongs.length} · {keyLabel} · {renderedPerformance.duration}</div>
            </div>
            <button type="button" onClick={() => setControlsOpen(false)} className={closeButtonClass}>×</button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              disabled={previousDisabled}
              onClick={goPrevious}
              className={`${secondaryButtonClass} py-4 text-base`}
            >
              ← Späť
            </button>
            <button
              disabled={nextDisabled}
              onClick={goNext}
              className={`${primaryButtonClass} py-4 text-base`}
            >
              Ďalšia →
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button disabled={readerZoom <= MIN_READER_DISPLAY_ZOOM} onClick={() => changeZoom(-1)} className={`${secondaryButtonClass} px-3 py-3`}>Reader -</button>
            <button onClick={() => setReaderZoom(READER_BASELINE_DISPLAY_ZOOM)} className={stageDark ? "rounded-2xl bg-zinc-900 px-3 py-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-700" : "rounded-2xl bg-zinc-50 px-3 py-3 text-sm font-bold text-zinc-700 ring-1 ring-zinc-200"}>{readerZoomLabel}</button>
            <button disabled={readerZoom >= MAX_READER_DISPLAY_ZOOM} onClick={() => changeZoom(1)} className={`${secondaryButtonClass} px-3 py-3`}>Reader +</button>
          </div>

          <div className="mt-3">
            <button type="button" onClick={onToggleScreenNightMode} className={`w-full ${nightToggleClass}`} aria-pressed={stageDark}>
              {stageDarkToggleLabel}
            </button>
          </div>

          <div className="mt-3">
            <button type="button" onClick={toggleWakeLock} className={`w-full ${wakeLockButtonClass}`} aria-pressed={wakeLockWanted}>
              {wakeLockLabel}
            </button>
            {wakeLockStatusText && <div className={`mt-2 text-xs font-semibold ${mutedTextClass}`}>{wakeLockStatusText}</div>}
          </div>

          <div className={transposePanelClass}>
            <div className={`text-xs font-semibold uppercase tracking-[0.12em] ${mutedTextClass}`}>Transpozícia</div>
            <div className="mt-1 text-sm font-bold">Transpozícia: {transposeLabel}</div>
            <div className={`mt-0.5 text-sm font-semibold ${subtleTextClass}`}>Tónina: {keyLabel}</div>
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
