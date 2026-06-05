"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Music, Loader2, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { uploadSong, type SeparationMode } from "@/lib/api";
import ModeSelector from "./ModeSelector";

const ACCEPT = ".mp3,.wav,.flac,.ogg,.aac,.m4a";
const MAX_MB = 100;

export default function UploadZone() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<SeparationMode>("pro");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File) => {
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File too large (max ${MAX_MB} MB)`);
      return;
    }
    setError(null);
    setFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadSong(file, mode);
      router.push(`/results/${res.job_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <label
        htmlFor="file-input"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        className={clsx(
          "flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-14 cursor-pointer transition-all",
          dragging
            ? "border-violet-400 bg-violet-500/10"
            : file
            ? "border-violet-500/60 bg-violet-500/5"
            : "border-border bg-card hover:border-violet-500/40"
        )}
      >
        <input
          id="file-input"
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={onInputChange}
        />

        {file ? (
          <>
            <Music size={40} className="text-violet-400" />
            <div className="text-center">
              <p className="font-medium text-slate-200">{file.name}</p>
              <p className="text-sm text-slate-500 mt-1">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <p className="text-xs text-slate-500">Click to change file</p>
          </>
        ) : (
          <>
            <div className="p-4 rounded-full bg-violet-500/10 border border-violet-500/20">
              <Upload size={32} className="text-violet-400" />
            </div>
            <div className="text-center">
              <p className="font-medium">Drop your song here</p>
              <p className="text-sm text-slate-500 mt-1">
                MP3, WAV, FLAC, OGG — up to {MAX_MB} MB
              </p>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-lg border border-border text-slate-400">
              Browse file
            </span>
          </>
        )}
      </label>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Mode selector */}
      <div>
        <p className="text-sm font-medium text-slate-400 mb-3">
          Separation mode
        </p>
        <ModeSelector value={mode} onChange={setMode} />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!file || uploading}
        className={clsx(
          "w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2",
          file && !uploading
            ? "bg-violet-600 hover:bg-violet-500 text-white"
            : "bg-slate-700 text-slate-500 cursor-not-allowed"
        )}
      >
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <Music size={16} />
            Separate Stems
          </>
        )}
      </button>
    </div>
  );
}
