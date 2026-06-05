"""
Celery tasks — hierarchical stem separation pipeline.

Flow:
  separate_song_task(job_id, audio_path, mode)
    ├── Stage 1: Demucs → main stems
    ├── Stage 2a (PRO/ADVANCED): drum sub-separation
    └── Stage 2b (PRO): vocal sub-separation
"""

import json
from pathlib import Path
from celery import Celery
from celery.utils.log import get_task_logger

from .config import settings
from .models import SeparationMode, JobStatus, STEM_META
from .separation import HierarchicalStemSeparator

logger = get_task_logger(__name__)

celery_app = Celery(
    "stem_separator",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    result_expires=settings.JOB_TTL,
)


def _save_state(job_id: str, data: dict) -> None:
    state_file = Path(settings.OUTPUT_DIR) / job_id / "state.json"
    state_file.parent.mkdir(parents=True, exist_ok=True)
    with open(state_file, "w") as f:
        json.dump(data, f)


def _build_stem_url(job_id: str, filename: str) -> str:
    return f"/api/files/{job_id}/{Path(filename).name}"


@celery_app.task(bind=True, name="tasks.separate_song")
def separate_song_task(
    self,
    job_id: str,
    audio_path: str,
    mode: str = SeparationMode.PRO,
):
    separator = HierarchicalStemSeparator(
        output_base=settings.OUTPUT_DIR,
        device=settings.DEVICE,
    )

    try:
        # ----------------------------------------------------------------
        # Stage 1: Main stems
        # ----------------------------------------------------------------
        _save_state(job_id, {"status": JobStatus.SEPARATING_MAIN, "progress": 5,
                              "message": "Separating main stems…", "stems": []})
        self.update_state(state="PROGRESS", meta={"progress": 5})

        # For BASIC mode use htdemucs (4-stem); else htdemucs_6s
        model = settings.MAIN_MODEL if mode != SeparationMode.BASIC else "htdemucs"
        main_stems = separator.separate_main_stems(audio_path, job_id, model=model)
        # main_stems: {vocals, drums, bass, guitar, piano, other} (mp3 paths)

        stems_data: list[dict] = []

        for key, path in main_stems.items():
            if key not in STEM_META:
                continue
            meta = STEM_META[key]
            stems_data.append({
                "name": meta["name"],
                "key": key,
                "url": _build_stem_url(job_id, path),
                "group": meta["group"],
                "quality": meta["quality"],
                "color": meta["color"],
            })

        _save_state(job_id, {"status": JobStatus.SEPARATING_DRUMS, "progress": 40,
                              "message": "Separating drum components…", "stems": stems_data})
        self.update_state(state="PROGRESS", meta={"progress": 40})

        # ----------------------------------------------------------------
        # Stage 2a: Drum sub-separation (ADVANCED + PRO)
        # ----------------------------------------------------------------
        if mode in (SeparationMode.ADVANCED, SeparationMode.PRO) and "drums" in main_stems:
            drum_stems = separator.separate_drums(main_stems["drums"], job_id)

            for key, wav_path in drum_stems.items():
                # Convert WAV → MP3 for web delivery
                try:
                    mp3_path = separator.wav_to_mp3(wav_path)
                except Exception:
                    mp3_path = wav_path  # fallback to WAV

                meta = STEM_META.get(key, {})
                stems_data.append({
                    "name": meta.get("name", key),
                    "key": key,
                    "url": _build_stem_url(job_id, mp3_path),
                    "group": "drums",
                    "quality": meta.get("quality", "medium"),
                    "color": meta.get("color", "#94a3b8"),
                })

        _save_state(job_id, {"status": JobStatus.SEPARATING_VOCALS, "progress": 65,
                              "message": "Separating lead and backing vocals…", "stems": stems_data})
        self.update_state(state="PROGRESS", meta={"progress": 65})

        # ----------------------------------------------------------------
        # Stage 2b: Vocal sub-separation (PRO only)
        # ----------------------------------------------------------------
        if mode == SeparationMode.PRO and "vocals" in main_stems:
            vocal_stems = separator.separate_vocals(main_stems["vocals"], job_id)

            for key, wav_path in vocal_stems.items():
                try:
                    mp3_path = separator.wav_to_mp3(wav_path)
                except Exception:
                    mp3_path = wav_path

                meta = STEM_META.get(key, {})
                stems_data.append({
                    "name": meta.get("name", key),
                    "key": key,
                    "url": _build_stem_url(job_id, mp3_path),
                    "group": "vocals",
                    "quality": meta.get("quality", "experimental"),
                    "color": meta.get("color", "#c084fc"),
                })

        # ----------------------------------------------------------------
        # Done
        # ----------------------------------------------------------------
        _save_state(job_id, {
            "status": JobStatus.COMPLETED,
            "progress": 100,
            "message": "Separation complete!",
            "stems": stems_data,
        })
        return {"status": "completed", "job_id": job_id}

    except Exception as exc:
        logger.exception("Separation failed for job %s", job_id)
        _save_state(job_id, {
            "status": JobStatus.FAILED,
            "progress": 0,
            "message": "Separation failed.",
            "stems": [],
            "error": str(exc),
        })
        raise
