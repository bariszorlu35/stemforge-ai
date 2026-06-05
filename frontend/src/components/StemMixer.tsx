"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Pause, ArchiveRestore, Loader2 } from "lucide-react";
import clsx from "clsx";
import type { StemFile } from "@/lib/api";
import { stemUrl } from "@/lib/api";
import StemTrack, { type StemTrackHandle } from "./StemTrack";

type Group = "main" | "vocals" | "drums";
const GROUP_LABELS: Record<Group, string> = {
  main:   "Main Stems",
  vocals: "Vocal Detail",
  drums:  "Drum Detail",
};

interface Props { stems: StemFile[] }

export default function StemMixer({ stems }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [readyKeys, setReadyKeys] = useState<Set<string>>(new Set());
  const [muted,     setMuted]     = useState<Set<string>>(new Set());
  const [soloed,    setSoloed]    = useState<Set<string>>(new Set());
  const [progress,  setProgress]  = useState(0);

  // Stable ref for isPlaying — avoids stale closures in callbacks
  const isPlayingRef  = useRef(false);
  const isSyncingRef  = useRef(false);   // re-entrancy guard for seek
  const trackRefs     = useRef<Record<string, StemTrackHandle | null>>({});
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const allReady  = readyKeys.size >= stems.length && stems.length > 0;
  const anySoloed = soloed.size > 0;

  const getTracks = useCallback(() =>
    Object.values(trackRefs.current).filter((t): t is StemTrackHandle => !!t?.isReady()),
  []);

  // ── Start progress timer ──────────────────────────────────────────────
  const startProgressTimer = useCallback(() => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      const tracks = getTracks();
      if (!tracks.length) return;
      const leader = tracks[0];
      const dur = leader.getDuration();
      const cur = leader.getCurrentTime();
      if (dur > 0) {
        const p = cur / dur;
        setProgress(p);
        if (p >= 0.999) {
          // Song ended — reset
          tracks.forEach(t => t.pause());
          setTimeout(() => tracks.forEach(t => t.seek(0)), 50);
          setIsPlaying(false);
          isPlayingRef.current = false;
          setProgress(0);
          if (progressTimer.current) clearInterval(progressTimer.current);
        }
      }
    }, 150);
  }, [getTracks]);

  const stopProgressTimer = useCallback(() => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }, []);

  // ── Play all in a single rAF batch ───────────────────────────────────
  const playAll = useCallback(() => {
    const tracks = getTracks();
    if (!tracks.length) return;
    requestAnimationFrame(() => {
      tracks.forEach(t => t.play());
      setIsPlaying(true);
      isPlayingRef.current = true;
      startProgressTimer();
    });
  }, [getTracks, startProgressTimer]);

  // ── Pause all ────────────────────────────────────────────────────────
  const pauseAll = useCallback(() => {
    getTracks().forEach(t => t.pause());
    setIsPlaying(false);
    isPlayingRef.current = false;
    stopProgressTimer();
  }, [getTracks, stopProgressTimer]);

  // ── Toggle ───────────────────────────────────────────────────────────
  const toggleMaster = useCallback(() => {
    if (!allReady) return;
    if (isPlayingRef.current) pauseAll();
    else playAll();
  }, [allReady, pauseAll, playAll]);

  // ── Seek all — with re-entrancy guard ────────────────────────────────
  const handleSeek = useCallback((p: number) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    const tracks = getTracks();
    const wasPlaying = isPlayingRef.current;

    // Pause first to avoid audio glitch during seek
    if (wasPlaying) tracks.forEach(t => t.pause());

    // Seek all tracks
    tracks.forEach(t => t.seek(p));
    setProgress(p);

    // Resume after seek settles (100ms — same as programmaticSeek timeout)
    setTimeout(() => {
      if (wasPlaying) {
        requestAnimationFrame(() => {
          tracks.forEach(t => t.play());
          if (!isPlayingRef.current) {
            setIsPlaying(true);
            isPlayingRef.current = true;
            startProgressTimer();
          }
        });
      }
      isSyncingRef.current = false;
    }, 150);
  }, [getTracks, startProgressTimer]);

  // ── Progress bar click ───────────────────────────────────────────────
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    handleSeek(p);
  };

  const handleReady = useCallback((key: string) => {
    setReadyKeys(prev => new Set([...prev, key]));
  }, []);

  const handleSolo = useCallback((key: string) => {
    setSoloed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const handleMute = useCallback((key: string) => {
    setMuted(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const downloadAll = () => {
    stems.forEach((s, i) => setTimeout(() => {
      const a = document.createElement("a");
      a.href = stemUrl(s.url);
      a.download = `${s.key}.mp3`;
      a.click();
    }, i * 350));
  };

  // Cleanup on unmount
  useEffect(() => () => stopProgressTimer(), [stopProgressTimer]);

  const groups = (["main", "vocals", "drums"] as Group[])
    .map(g => ({ id: g, label: GROUP_LABELS[g], stems: stems.filter(s => s.group === g) }))
    .filter(g => g.stems.length > 0);

  return (
    <div className="space-y-6">

      {/* ── Transport ── */}
      <div className="p-4 rounded-xl bg-[#16162a] border border-[#1e1e35] space-y-3">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleMaster}
            disabled={!allReady}
            className={clsx(
              "w-11 h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0",
              allReady
                ? isPlaying
                  ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/50"
                  : "bg-[#1e1e35] hover:bg-violet-600/20 text-slate-300 border border-[#2a2a45]"
                : "bg-[#1e1e35] text-slate-700 cursor-not-allowed",
            )}
          >
            {!allReady
              ? <Loader2 size={16} className="animate-spin" />
              : isPlaying
              ? <Pause size={16} />
              : <Play  size={16} className="ml-0.5" />}
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">
              {allReady
                ? isPlaying ? "Playing…" : "Ready"
                : `Loading… ${readyKeys.size} / ${stems.length}`}
            </p>
            <p className="text-xs text-slate-600 mt-0.5 truncate">
              {anySoloed
                ? `Solo: ${stems.filter(s => soloed.has(s.key)).map(s => s.name).join(", ")}`
                : muted.size > 0
                ? `Muted: ${stems.filter(s => muted.has(s.key)).map(s => s.name).join(", ")}`
                : "All stems in sync · click waveform or bar to seek"}
            </p>
          </div>

          {!allReady && (
            <div className="w-20 h-1 rounded-full bg-[#1e1e35] overflow-hidden flex-shrink-0">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${(readyKeys.size / Math.max(stems.length, 1)) * 100}%` }}
              />
            </div>
          )}

          <button
            onClick={downloadAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e1e35] text-xs text-slate-500 hover:border-violet-500/30 hover:text-slate-200 transition-all flex-shrink-0"
          >
            <ArchiveRestore size={12} /> All
          </button>
        </div>

        {/* Seekable progress bar */}
        <div
          className="h-2 rounded-full bg-[#1e1e35] overflow-hidden cursor-pointer group relative"
          onClick={handleProgressClick}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 pointer-events-none"
            style={{ width: `${progress * 100}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress * 100}% - 6px)` }}
          />
        </div>
      </div>

      {/* ── Groups ── */}
      {groups.map(group => (
        <div key={group.id}>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">
              {group.label}
            </h3>
            <div className="flex-1 h-px bg-[#1e1e35]" />
            <span className="text-[10px] text-slate-700">{group.stems.length}</span>
          </div>

          <div className="space-y-2">
            {group.stems.map(stem => (
              <StemTrack
                key={stem.key}
                ref={el => { trackRefs.current[stem.key] = el; }}
                stem={stem}
                isPlaying={isPlaying}
                isMuted={muted.has(stem.key)}
                isSoloed={soloed.has(stem.key)}
                anySoloed={anySoloed}
                onReady={handleReady}
                onSeek={handleSeek}
                onSolo={handleSolo}
                onMute={handleMute}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
