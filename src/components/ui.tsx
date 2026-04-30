import type { ButtonHTMLAttributes } from "react";
import type { ChildrenProps, View } from "../types";

const buttonBase = "rounded-2xl px-4 py-3 text-sm font-semibold";

export function NavButton({ current, target, onClick, children }: ChildrenProps & { current: View; target: View; onClick: (v: View) => void }) {
  return (
    <button
      onClick={() => onClick(target)}
      className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${current === target ? "bg-zinc-900 text-white shadow" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"}`}
    >
      {children}
    </button>
  );
}

export function Chip({ children }: ChildrenProps) {
  return <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700 ring-1 ring-zinc-200">{children}</span>;
}

export function Card({ children, className = "" }: ChildrenProps & { className?: string }) {
  return <div className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 ${className}`}>{children}</div>;
}

export function InfoBox({ children, tone = "zinc" }: ChildrenProps & { tone?: "zinc" | "amber" | "sky" | "emerald" }) {
  const tones = {
    zinc: "bg-zinc-50 text-zinc-600 ring-zinc-200",
    amber: "bg-amber-50 text-amber-900 ring-amber-200",
    sky: "bg-sky-50 text-sky-900 ring-sky-200",
    emerald: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  };
  return <div className={`rounded-2xl p-4 text-sm ring-1 ${tones[tone]}`}>{children}</div>;
}

export function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm" />
    </div>
  );
}

export function PrimaryButton({ children, className = "", ...props }: ChildrenProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${buttonBase} bg-zinc-900 text-white ${className}`} {...props}>{children}</button>;
}

export function SoftButton({ children, className = "", ...props }: ChildrenProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${buttonBase} bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200 ${className}`} {...props}>{children}</button>;
}

export function TransposeControls({
  transpose,
  notation,
  onTranspose,
  onNotation,
  compact = false,
}: {
  transpose: number;
  notation?: "intl" | "de";
  onTranspose: (value: number | ((value: number) => number)) => void;
  onNotation?: (notation: "intl" | "de") => void;
  compact?: boolean;
}) {
  return (
    <div>
      {!compact && <label className="mb-2 block text-sm font-medium text-zinc-600">Transpozícia</label>}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onTranspose((v) => v - 1)} className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white">-1</button>
        <button onClick={() => onTranspose(0)} className="rounded-2xl bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800">reset</button>
        <button onClick={() => onTranspose((v) => v + 1)} className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white">+1</button>
        {onNotation && notation && (
          <>
            <button onClick={() => onNotation("intl")} className={`rounded-2xl px-4 py-2 text-sm font-medium ${notation === "intl" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"}`}>INTL</button>
            <button onClick={() => onNotation("de")} className={`rounded-2xl px-4 py-2 text-sm font-medium ${notation === "de" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"}`}>{compact ? "DE" : "DE (H/B)"}</button>
          </>
        )}
      </div>
      {!compact && <div className="mt-2 text-sm text-zinc-500">Posun: {transpose > 0 ? `+${transpose}` : transpose}</div>}
    </div>
  );
}
