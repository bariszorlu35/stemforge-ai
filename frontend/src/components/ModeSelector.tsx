"use client";

import clsx from "clsx";
import type { SeparationMode } from "@/lib/api";

interface ModeOption {
  id: SeparationMode;
  label: string;
  desc: string;
  stems: string[];
  badge?: string;
  color: string;        // active accent color
  gradient: string;     // active background gradient
  borderActive: string; // active border color
}

const MODES: ModeOption[] = [
  {
    id: "basic",
    label: "Basic",
    desc: "4 stems",
    stems: ["Vocals", "Drums", "Bass", "Other"],
    color: "text-sky-400",
    gradient: "from-sky-500/20 to-sky-500/5",
    borderActive: "border-sky-500",
  },
  {
    id: "advanced",
    label: "Advanced",
    desc: "6 stems + drum detail",
    stems: ["Vocals · Drums · Bass", "Guitar · Synth · Other", "Kick · Snare · Hi-hat · Cymbals · Toms"],
    color: "text-violet-400",
    gradient: "from-violet-500/20 to-violet-500/5",
    borderActive: "border-violet-500",
  },
  {
    id: "pro",
    label: "Pro",
    desc: "Full hierarchical",
    stems: ["Lead Vocal · Backing Vocals", "Kick · Snare · Hi-hat", "Cymbals · Toms", "Bass · Guitar · Synth"],
    badge: "Experimental",
    color: "text-fuchsia-400",
    gradient: "from-fuchsia-500/20 to-fuchsia-500/5",
    borderActive: "border-fuchsia-500",
  },
];

interface Props {
  value: SeparationMode;
  onChange: (m: SeparationMode) => void;
}

export default function ModeSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
      {MODES.map((m) => {
        const active = value === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={clsx(
              "relative text-left p-4 rounded-xl border-2 transition-all duration-200 overflow-hidden",
              active
                ? clsx("bg-gradient-to-b", m.gradient, m.borderActive, "shadow-lg")
                : "border-[#1e1e35] bg-[#16162a] hover:border-slate-600"
            )}
          >
            {/* Selected glow strip */}
            {active && (
              <div className={clsx(
                "absolute top-0 left-0 right-0 h-0.5",
                m.id === "basic" ? "bg-sky-400" :
                m.id === "advanced" ? "bg-violet-400" : "bg-fuchsia-400"
              )} />
            )}

            {m.badge && (
              <span className="absolute top-3 right-3 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {m.badge}
              </span>
            )}

            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              {/* Dot indicator */}
              <span className={clsx(
                "w-3 h-3 rounded-full border-2 flex-shrink-0 transition-all",
                active
                  ? clsx("border-transparent",
                      m.id === "basic" ? "bg-sky-400 shadow-[0_0_6px_2px_rgba(56,189,248,0.5)]" :
                      m.id === "advanced" ? "bg-violet-400 shadow-[0_0_6px_2px_rgba(167,139,250,0.5)]" :
                      "bg-fuchsia-400 shadow-[0_0_6px_2px_rgba(232,121,249,0.5)]")
                  : "border-slate-600 bg-transparent"
              )} />
              <span className={clsx(
                "font-bold text-sm tracking-wide transition-colors",
                active ? m.color : "text-slate-400"
              )}>
                {m.label}
              </span>
              <span className={clsx(
                "text-[11px] ml-auto font-mono transition-colors",
                active ? "text-slate-300" : "text-slate-600"
              )}>
                {m.desc}
              </span>
            </div>

            {/* Stems list */}
            <div className="space-y-1.5 pl-5">
              {m.stems.map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span className={clsx(
                    "w-1 h-1 rounded-full flex-shrink-0",
                    active
                      ? m.id === "basic" ? "bg-sky-400/60" :
                        m.id === "advanced" ? "bg-violet-400/60" : "bg-fuchsia-400/60"
                      : "bg-slate-700"
                  )} />
                  <span className={clsx(
                    "text-[11px] leading-tight",
                    active ? "text-slate-300" : "text-slate-600"
                  )}>
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
