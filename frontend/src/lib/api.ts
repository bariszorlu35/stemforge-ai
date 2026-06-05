export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export type SeparationMode = "basic" | "advanced" | "pro";

export interface StemFile {
  name: string;
  key: string;
  url: string;
  group: "main" | "vocals" | "drums";
  quality: "good" | "very_good" | "medium" | "experimental";
  color: string;
}

export type JobStatus =
  | "pending"
  | "processing"
  | "separating_main"
  | "separating_drums"
  | "separating_vocals"
  | "completed"
  | "failed";

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  progress: number;
  message: string;
  stems: StemFile[];
  error?: string;
}

export interface UploadResponse {
  job_id: string;
  filename: string;
  message: string;
}

export async function uploadSong(
  file: File,
  mode: SeparationMode
): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("mode", mode);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Upload failed");
  }

  return res.json();
}

export async function getJob(jobId: string): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to fetch job");
  }

  return res.json();
}

/** Absolute URL for serving a stem file */
export function stemUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}
