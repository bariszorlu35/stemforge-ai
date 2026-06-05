"use client";

import {
  useEffect, useRef, useImperativeHandle, forwardRef, useState,
} from "react";
import WaveSurfer from "wavesurfer.js";
import { Volume2, VolumeX, Download, Loader2 } from "lucide-react";
import clsx from "clsx";
import type { StemFile } from "@/lib/api";
import { stemUrl } from "@/lib/api";

const QUALITY_LABEL: Record<string, { label: string; color: string }> = {
  very_good:    { label: "Very Good",    color: "text-emerald-400" },
  good:         { label: "Good",         color: "text-green-400" },
  medium:       { label: "Medium",       color: "text-yellow-400" },
  experimental: { label: "Experimental", color: "text-amber-400" },
};

export interface StemTrackHandle {
  play:           () => void;
  pause:          () => void;
  seek:           (progress: number) => void;
  getDuration:    () => number;
  getCurrentTime: () => number;
  isReady:        () => boolean;
}

interface Props {
  stem:      StemFile;
  isPlaying: boolean;
  isMuted:   boolean;
  isSoloed:  boolean;
  anySoloed: boolean;
  onReady:   (key: string) => void;
  onSeek:    (progress: number) => void;
  onSolo:    (key: string) => void;
  onMute:    (key: string) => void;
}

const StemTrack = forwardRef<StemTrackHandle, Props>(function StemTrack(
  { stem, isPlaying, isMuted, isSoloed, anySoloed, onReady, onSeek, onSolo, onMute },
  ref,
) {
  const waveRef            = useRef<HTMLDivElement>(null);
  const wsRef              = useRef<WaveSurfer | null>(null);
  const programmaticSeek   = useRef(false);   // flag: suppress re-entrant seek events
  const [loading, setLoading]      = useState(true);
  const [volume,  setVolumeState]  = useState(1);

  const effectiveMuted = isMuted || (anySoloed && !isSoloed);

  useImperativeHandle(ref, () => ({
    play: () => wsRef.current?.play(),
    pause: () => wsRef.current?.pause(),
    seek: (p: number) => {
      const ws = wsRef.current;
      if (!ws) return;
      programmaticSeek.current = true;          // mark as programmatic
      ws.seekTo(Math.max(0, Math.min(1, p)));
      // Reset flag after WaveSurfer has processed the seek
      setTimeout(() => { programmaticSeek.current = false; }, 100);
    },
    getDuration:    () => wsRef.current?.getDuration()    ?? 0,
    getCurrentTime: () => wsRef.current?.getCurrentTime() ?? 0,
    isReady:        () => !loading,
  }));

  useEffect(() => {
    if (!waveRef.current) return;

    const ws = WaveSurfer.create({
      container:     waveRef.current,
      waveColor:     stem.color + "44",
      progressColor: stem.color + "cc",
      cursorColor:   stem.color,
      cursorWidth:   1,
      height:        48,
      barWidth:      2,
      barGap:        1,
      barRadius:     2,
      normalize:     true,
      url:           stemUrl(stem.url),
      interact:      true,
    });

    ws.on("ready", () => {
      setLoading(false);
      onReady(stem.key);
    });

    // Only propagate user-initiated seeks (not programmatic ones)
    ws.on("seeking", () => {
      if (programmaticSeek.current) return;
      const dur = ws.getDuration();
      if (dur > 0) onSeek(ws.getCurrentTime() / dur);
    });

    wsRef.current = ws;
    return () => { ws.destroy(); wsRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stem.url]);

  useEffect(() => {
    wsRef.current?.setVolume(effectiveMuted ? 0 : volume);
  }, [effectiveMuted, volume]);

  const q = QUALITY_LABEL[stem.quality] ?? QUALITY_LABEL.medium;

  return (
    <div className={clsx(
      "rounded-xl border px-4 pt-3 pb-3 transition-all duration-200",
      isSoloed
        ? "border-yellow-500/50 bg-yellow-500/5"
        : effectiveMuted
        ? "border-[#1e1e35] bg-[#0e0e1a] opacity-40"
        : isPlaying
        ? "border-slate-600 bg-[#1a1a2e]"
        : "border-[#1e1e35] bg-[#16162a] hover:border-slate-700",
    )}>
      <div className="flex items-center gap-3 mb-2">
        <span
          className={clsx("w-2 h-2 rounded-full flex-shrink-0 transition-all", isPlaying && "scale-125")}
          style={{ background: stem.color, boxShadow: isPlaying ? `0 0 6px ${stem.color}` : undefined }}
        />
        <span className="font-medium text-sm flex-1 text-slate-200">{stem.name}</span>
        <span className={clsx("text-[10px] font-mono", q.color)}>{q.label}</span>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onSolo(stem.key)}
            title="Solo"
            className={clsx(
              "w-6 h-6 rounded text-[10px] font-bold font-mono transition-all",
              isSoloed
                ? "bg-yellow-500 text-black"
                : "text-slate-600 hover:text-yellow-400 hover:bg-yellow-500/10",
            )}
          >S</button>

          <button
            onClick={() => onMute(stem.key)}
            title="Mute"
            className={clsx(
              "w-6 h-6 rounded flex items-center justify-center transition-all",
              isMuted ? "bg-red-500/20 text-red-400" : "text-slate-600 hover:text-slate-300",
            )}
          >
            {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>

          <button
            onClick={() => {
              const a = document.createElement("a");
              a.href = stemUrl(stem.url);
              a.download = `${stem.key}.mp3`;
              a.click();
            }}
            title="Download"
            className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-300 transition-all"
          >
            <Download size={12} />
          </button>
        </div>
      </div>

      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 h-12">
            <Loader2 size={14} className="animate-spin text-slate-600" />
          </div>
        )}
        <div ref={waveRef} style={{ opacity: loading ? 0 : 1 }} />
      </div>

      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-slate-700 w-5">Vol</span>
        <input
          type="range" min={0} max={1} step={0.01} value={volume}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setVolumeState(v);
            if (!effectiveMuted) wsRef.current?.setVolume(v);
          }}
          className="flex-1 h-0.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${stem.color}99 ${volume * 100}%, #1e1e35 ${volume * 100}%)`,
          }}
        />
        <span className="text-[10px] text-slate-700 font-mono w-7 text-right">
          {Math.round(volume * 100)}
        </span>
      </div>
    </div>
  );
});

export default StemTrack;
