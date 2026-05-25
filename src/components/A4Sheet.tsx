import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes, MutableRefObject, Ref } from "react";
import type { SectionGroup, Song } from "../types";
import { normalizeKeyInput } from "../lib/chords";
import { pairChordLine } from "../lib/chordAnchors";
import { normalizeSongTitle } from "../lib/import";

const A4_WIDTH_PX = 210 * 96 / 25.4;
const A4_HEIGHT_PX = 297 * 96 / 25.4;
const A4_OVERFLOW_TOLERANCE_PX = 2;
export const A4_OVERFLOW_WARNING = "Skladba presahuje A4. Spodné riadky sa môžu pri tlači/PDF odrezať.";

type A4PageProps = {
  song: Song;
  sections: SectionGroup[];
  selectedIndex?: number | null;
  onSelectBlock?: (index: number) => void;
  responsive?: boolean;
  pageRef?: Ref<HTMLDivElement>;
  onOverflowChange?: (overflowing: boolean) => void;
};

function assignRef(ref: Ref<HTMLDivElement> | undefined, value: HTMLDivElement | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else (ref as MutableRefObject<HTMLDivElement | null>).current = value;
}

function measureA4Overflow(page: HTMLDivElement) {
  const renderedHeight = Math.ceil(Math.max(page.scrollHeight, page.offsetHeight));
  return renderedHeight > Math.ceil(A4_HEIGHT_PX) + A4_OVERFLOW_TOLERANCE_PX;
}

export function A4OverflowWarning({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-300 ${className}`}>
      {A4_OVERFLOW_WARNING}
    </div>
  );
}

export function A4Page({ song, sections, selectedIndex, onSelectBlock, responsive = true, pageRef, onOverflowChange }: A4PageProps) {
  const localPageRef = useRef<HTMLDivElement | null>(null);
  const timeSignature = song.timeSignature?.trim();
  const pageStyle: CSSProperties = {
    width: "210mm",
    minHeight: "297mm",
    boxSizing: "border-box",
    padding: "10mm",
    fontFamily: '"Courier New", "Liberation Mono", monospace',
  };

  if (responsive) pageStyle.maxWidth = "100%";

  const setPageRefs = useCallback((node: HTMLDivElement | null) => {
    localPageRef.current = node;
    assignRef(pageRef, node);
  }, [pageRef]);

  useEffect(() => {
    if (!onOverflowChange) return undefined;
    const page = localPageRef.current;
    if (!page) return undefined;

    const update = () => onOverflowChange(measureA4Overflow(page));
    update();

    const observer = new ResizeObserver(update);
    observer.observe(page);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [song, sections, onOverflowChange]);

  return (
    <div ref={setPageRefs} className="a4-print-surface mx-auto bg-white text-zinc-900 shadow-lg ring-1 ring-zinc-300" style={pageStyle}>
      <div className="border-b border-zinc-300 pb-3" style={{ fontSize: "9pt", lineHeight: 1.08 }}>
        <div className="font-bold" style={{ fontSize: "13pt" }}>{normalizeSongTitle(song.title)} - {song.artist}</div>
        <div className="mt-1 flex flex-wrap gap-4 font-semibold text-zinc-700" style={{ fontSize: "9pt" }}>
          <span>BPM {song.bpm}</span>
          <span>{normalizeKeyInput(song.key)}</span>
          {timeSignature && <span>Takt: {timeSignature}</span>}
          <span>{song.duration}</span>
        </div>
      </div>
      <div className="mt-4 columns-2" style={{ columnGap: "10mm" }}>
        {sections.map((section) => (
          <div key={section.id} className="mb-4 break-inside-avoid">
            {!section.implicit && (
              <div className="mb-2 border-y border-zinc-300 py-0.5 text-right font-semibold uppercase tracking-[0.08em] text-zinc-700" style={{ fontSize: "9pt" }}>
                [{section.title}]
              </div>
            )}
            <div className="text-zinc-900">
              {section.blocks.map(({ index, line }) => {
                const selected = selectedIndex === index;
                const wrapperClass = `mb-1 rounded-md ${selected ? "bg-amber-100/80 ring-1 ring-amber-400" : onSelectBlock ? "hover:bg-zinc-100" : ""}`;
                const commonProps: HTMLAttributes<HTMLDivElement> = onSelectBlock ? { role: "button", tabIndex: 0, onClick: () => onSelectBlock(index) } : {};
                if (line.type === "space") return <div key={index} className={`h-3 ${selected ? "bg-amber-100/80 ring-1 ring-amber-400" : ""}`} {...commonProps} />;
                if (line.type === "pair") {
                  const chordLine = pairChordLine(line);
                  return (
                    <div key={index} className={wrapperClass} {...commonProps}>
                      {!!chordLine && <div className="font-mono text-[9pt] font-semibold leading-[1.05] whitespace-pre text-zinc-800">{chordLine}</div>}
                      {!!line.lyrics && <div className="font-mono text-[9pt] leading-[1.05] whitespace-pre text-zinc-900">{line.lyrics}</div>}
                    </div>
                  );
                }
                if (line.type === "cue") return <div key={index} className={`${wrapperClass} font-mono text-[9pt] italic leading-[1.05] whitespace-pre text-zinc-700`} {...commonProps}>{line.text}</div>;
                if (line.type === "repeat") return <div key={index} className={`${wrapperClass} font-mono text-[9pt] font-semibold leading-[1.05] whitespace-pre text-zinc-700`} {...commonProps}>{line.text}</div>;
                if (line.type === "chords") return <div key={index} className={`${wrapperClass} font-mono text-[9pt] font-semibold leading-[1.05] whitespace-pre text-zinc-800`} {...commonProps}>{line.text}</div>;
                return <div key={index} className={`${wrapperClass} font-mono text-[9pt] leading-[1.05] whitespace-pre text-zinc-900`} {...commonProps}>{line.text}</div>;
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function A4Sheet({ song, sections, selectedIndex, onSelectBlock, responsive = true }: {
  song: Song;
  sections: SectionGroup[];
  selectedIndex?: number | null;
  onSelectBlock?: (index: number) => void;
  responsive?: boolean;
}) {
  const [overflowing, setOverflowing] = useState(false);

  return (
    <div className="max-w-full overflow-auto max-h-[84vh] rounded-3xl bg-zinc-100 p-3 ring-1 ring-zinc-200">
      {overflowing && <A4OverflowWarning className="mb-3" />}
      <A4Page song={song} sections={sections} selectedIndex={selectedIndex} onSelectBlock={onSelectBlock} responsive={responsive} onOverflowChange={setOverflowing} />
    </div>
  );
}

export function FitA4Sheet({
  song,
  sections,
  readerZoom,
  className = "h-[100svh]",
  showOverflowWarning = true,
  fitMode = "fit",
  minZoom = 100,
  maxZoom = 125,
}: {
  song: Song;
  sections: SectionGroup[];
  readerZoom: number;
  className?: string;
  showOverflowWarning?: boolean;
  fitMode?: "fit" | "actual";
  minZoom?: number;
  maxZoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [pageSize, setPageSize] = useState({ width: A4_WIDTH_PX, height: A4_HEIGHT_PX });
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const update = () => setContainerSize({ width: container.clientWidth, height: container.clientHeight });
    update();

    const observer = new ResizeObserver(update);
    observer.observe(container);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return undefined;

    const update = () => setPageSize({ width: page.offsetWidth || A4_WIDTH_PX, height: page.offsetHeight || A4_HEIGHT_PX });
    update();

    const observer = new ResizeObserver(update);
    observer.observe(page);

    return () => observer.disconnect();
  }, [song, sections]);

  const inset = 16;
  const fitScale = Math.min(
    1,
    Math.max(0.1, (containerSize.width - inset) / pageSize.width),
    Math.max(0.1, (containerSize.height - inset) / pageSize.height),
  );
  const zoom = Math.min(maxZoom, Math.max(minZoom, readerZoom)) / 100;
  const scale = (fitMode === "fit" ? fitScale : 1) * zoom;
  const scaledWidth = pageSize.width * scale;
  const scaledHeight = pageSize.height * scale;

  return (
    <div ref={containerRef} className={`${className} relative w-full overflow-auto bg-zinc-100 p-2`}>
      {showOverflowWarning && overflowing && <A4OverflowWarning className="absolute left-3 right-3 top-3 z-10 shadow-sm" />}
      <div
        className="mx-auto"
        style={{
          width: scaledWidth || pageSize.width,
          height: scaledHeight || pageSize.height,
        }}
      >
        <div
          style={{
            width: pageSize.width,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <A4Page pageRef={pageRef} song={song} sections={sections} responsive={false} onOverflowChange={setOverflowing} />
        </div>
      </div>
    </div>
  );
}
