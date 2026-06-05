"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Music2,
} from "lucide-react";
import clsx from "clsx";
import { getJob, type JobResponse, type JobStatus } from "@/lib/api";
import StemMixer from "@/components/StemMixer";

const STATUS_MESSAGES: Record<JobStatus, string> = {
  pending:           "Queued — waiting for worker…",
  processing:        "Processing…",
  separating_main:   "Separating main stems with Demucs…",
  separating_drums:  "Separating drum components (kick, snare, hi-hat…)",
  separating_vocals: "Separating lead vocal from backing vocals…",
  completed:         "Done!",
  failed:            "Separation failed",
};

const TERMINAL: JobStatus[] = ["completed", "failed"];

export default function ResultsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const data = await getJob(jobId);
      setJob(data);
      return data.status;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load job");
      return "failed" as JobStatus;
    }
  }, [jobId]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const run = async () => {
      const status = await poll();
      if (!TERMINAL.includes(status)) {
        timeout = setTimeout(run, 2000);
      }
    };

    run();
    return () => clearTimeout(timeout);
  }, [poll]);

  const isTerminal = job && TERMINAL.includes(job.status);
  const progress = job?.progress ?? 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 mb-8 transition-colors"
      >
        <ArrowLeft size={14} />
        New song
      </Link>

      {/* Status card */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="mt-0.5">
            {!job || !isTerminal ? (
              <Loader2 size={22} className="text-violet-400 animate-spin" />
            ) : job.status === "completed" ? (
              <CheckCircle2 size={22} className="text-emerald-400" />
            ) : (
              <XCircle size={22} className="text-red-400" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium">
              {job ? STATUS_MESSAGES[job.status] : "Loading…"}
            </p>
            {job && job.status !== "completed" && job.status !== "failed" && (
              <p className="text-xs text-slate-500 mt-0.5">
                This takes 1–5 minutes depending on song length
              </p>
            )}
            {error && (
              <p className="text-sm text-red-400 mt-1">{error}</p>
            )}
            {job?.error && (
              <p className="text-sm text-red-400 mt-1">{job.error}</p>
            )}
          </div>
          <span className="text-sm font-mono text-slate-500">{progress}%</span>
        </div>

        {/* Progress bar */}
        {!isTerminal && (
          <div className="mt-4 h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Stage indicators */}
        {job && job.status !== "failed" && (
          <div className="mt-4 flex gap-6 text-xs text-slate-600">
            {[
              { label: "Main stems",   statuses: ["separating_main", "separating_drums", "separating_vocals", "completed"] },
              { label: "Drum detail",  statuses: ["separating_drums", "separating_vocals", "completed"] },
              { label: "Vocal detail", statuses: ["separating_vocals", "completed"] },
            ].map((stage) => {
              const done = stage.statuses.includes(job.status);
              return (
                <div key={stage.label} className={clsx("flex items-center gap-1.5", done && "text-violet-400")}>
                  <span className={clsx("w-1.5 h-1.5 rounded-full", done ? "bg-violet-400" : "bg-slate-700")} />
                  {stage.label}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mixer — shown once stems start arriving */}
      {job && job.stems.length > 0 ? (
        <StemMixer stems={job.stems} />
      ) : (
        isTerminal && job?.status === "failed" ? null : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-3">
            <Music2 size={36} className="opacity-30" />
            <p className="text-sm">Stems will appear here as they're ready</p>
          </div>
        )
      )}
    </div>
  );
}
