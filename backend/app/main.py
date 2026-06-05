"""
FastAPI application — Stem Separator API
"""

import json
import uuid
import shutil
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .config import settings
from .models import (
    SeparationMode, JobStatus,
    UploadResponse, JobResponse, StemFile,
)
from .tasks import separate_song_task

app = FastAPI(
    title="Stem Separator API",
    description="Hierarchical music stem separation",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".flac", ".ogg", ".aac", ".m4a"}


# ---------------------------------------------------------------------------
# Upload & start job
# ---------------------------------------------------------------------------

@app.post("/api/upload", response_model=UploadResponse)
async def upload_song(
    file: UploadFile = File(...),
    mode: SeparationMode = Form(SeparationMode.PRO),
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported format: {ext}")

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(413, f"File too large (max {settings.MAX_FILE_SIZE_MB} MB)")

    job_id = str(uuid.uuid4())
    upload_dir = Path(settings.UPLOAD_DIR) / job_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    safe_name = f"audio{ext}"
    audio_path = upload_dir / safe_name
    with open(audio_path, "wb") as f:
        f.write(content)

    # Kick off background worker
    separate_song_task.delay(job_id, str(audio_path), mode.value)

    return UploadResponse(
        job_id=job_id,
        filename=file.filename,
        message="Upload successful. Processing started.",
    )


# ---------------------------------------------------------------------------
# Job status
# ---------------------------------------------------------------------------

@app.get("/api/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: str):
    state_file = Path(settings.OUTPUT_DIR) / job_id / "state.json"

    if not state_file.exists():
        # Check if upload exists (job accepted but worker hasn't started yet)
        upload_dir = Path(settings.UPLOAD_DIR) / job_id
        if upload_dir.exists():
            return JobResponse(
                job_id=job_id,
                status=JobStatus.PENDING,
                progress=0,
                message="Job queued, waiting for worker…",
            )
        raise HTTPException(404, "Job not found")

    with open(state_file) as f:
        data = json.load(f)

    stems = [StemFile(**s) for s in data.get("stems", [])]

    return JobResponse(
        job_id=job_id,
        status=data.get("status", JobStatus.PENDING),
        progress=data.get("progress", 0),
        message=data.get("message", ""),
        stems=stems,
        error=data.get("error"),
    )


# ---------------------------------------------------------------------------
# Serve audio files
# ---------------------------------------------------------------------------

@app.get("/api/files/{job_id}/{filename}")
def serve_file(job_id: str, filename: str):
    # Search in output and drum/vocal sub-directories
    base = Path(settings.OUTPUT_DIR) / job_id
    candidates = list(base.rglob(filename))

    if not candidates:
        raise HTTPException(404, "File not found")

    file_path = candidates[0]
    media_type = "audio/mpeg" if file_path.suffix == ".mp3" else "audio/wav"

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
        },
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
