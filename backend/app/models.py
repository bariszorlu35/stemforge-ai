from enum import Enum
from typing import Optional
from pydantic import BaseModel


class SeparationMode(str, Enum):
    BASIC = "basic"       # vocals, drums, bass, other
    ADVANCED = "advanced" # + guitar, synth
    PRO = "pro"           # + lead/backing vocal, kick/snare/hihat/cymbals/toms


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SEPARATING_MAIN = "separating_main"
    SEPARATING_DRUMS = "separating_drums"
    SEPARATING_VOCALS = "separating_vocals"
    COMPLETED = "completed"
    FAILED = "failed"


class StemFile(BaseModel):
    name: str           # display name, e.g. "Lead Vocal"
    key: str            # machine key, e.g. "lead_vocal"
    url: str            # download/stream URL
    group: str          # "main" | "vocals" | "drums"
    quality: str        # "good" | "very_good" | "medium" | "experimental"
    color: str          # hex color for waveform


class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: int        # 0-100
    message: str
    stems: list[StemFile] = []
    error: Optional[str] = None


class UploadResponse(BaseModel):
    job_id: str
    filename: str
    message: str


# Stem metadata config
STEM_META: dict[str, dict] = {
    # Main stems
    "vocals":          {"name": "Vocals",        "group": "main",   "quality": "very_good",   "color": "#a78bfa"},
    "drums":           {"name": "Drums",          "group": "main",   "quality": "very_good",   "color": "#f87171"},
    "bass":            {"name": "Bass",           "group": "main",   "quality": "very_good",   "color": "#34d399"},
    "guitar":          {"name": "Guitar",         "group": "main",   "quality": "good",        "color": "#fbbf24"},
    "piano":           {"name": "Synth / Keys",   "group": "main",   "quality": "good",        "color": "#60a5fa"},
    "other":           {"name": "Other",          "group": "main",   "quality": "medium",      "color": "#94a3b8"},
    # Vocal sub-stems
    "lead_vocal":      {"name": "Lead Vocal",     "group": "vocals", "quality": "good",        "color": "#c084fc"},
    "backing_vocals":  {"name": "Backing Vocals", "group": "vocals", "quality": "experimental","color": "#e879f9"},
    # Drum sub-stems
    "kick":            {"name": "Kick",           "group": "drums",  "quality": "good",        "color": "#fb923c"},
    "snare":           {"name": "Snare",          "group": "drums",  "quality": "good",        "color": "#f43f5e"},
    "hihat":           {"name": "Hi-Hat",         "group": "drums",  "quality": "medium",      "color": "#facc15"},
    "cymbals":         {"name": "Cymbals",        "group": "drums",  "quality": "medium",      "color": "#38bdf8"},
    "toms":            {"name": "Toms",           "group": "drums",  "quality": "medium",      "color": "#4ade80"},
}
