# StemForge AI — Hierarchical Stem Separation

> Upload a song → get lead vocal, backing vocals, kick, snare, hi-hat, cymbals, toms, bass, guitar, synth — separately and interactively.

## What makes this different

Normal tools give you 4-6 stems. StemForge AI does **hierarchical separation**:

```
Full Song
├── Vocals
│   ├── Lead Vocal
│   └── Backing Vocals / Harmonies   ← sub-stage
├── Drums
│   ├── Kick
│   ├── Snare
│   ├── Hi-Hat                       ← sub-stage
│   ├── Cymbals
│   └── Toms
├── Bass
├── Guitar
├── Synth / Keys
└── Other
```

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, wavesurfer.js |
| Backend | FastAPI (Python) |
| Queue | Celery + Redis |
| AI — main stems | Demucs `htdemucs_6s` |
| AI — drum detail | HPSS + spectral band masking (librosa) |
| AI — vocal detail | Mid-side processing + spectral masking |

---

## Quick Start (Docker)

```bash
# 1. Clone and copy env
cp .env.example .env

# 2. Start everything
docker compose up --build

# 3. Open http://localhost:3000
```

The first job will take a bit longer as Demucs downloads the model (~300 MB).

---

## Local Development

### Backend

```bash
cd backend

# Create venv
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install deps (PyTorch CPU; for GPU see https://pytorch.org/get-started)
pip install -r requirements.txt

# Install ffmpeg
brew install ffmpeg          # macOS
# sudo apt install ffmpeg    # Ubuntu

# Copy env
cp ../.env.example .env

# Start Redis (requires Docker or local Redis)
docker run -d -p 6379:6379 redis:7-alpine

# Start API
uvicorn app.main:app --reload

# Start worker (in a new terminal, same venv)
celery -A app.tasks.celery_app worker --loglevel=info --concurrency=1
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## Separation Modes

| Mode | Stems |
|---|---|
| **Basic** | Vocals, Drums, Bass, Other |
| **Advanced** | + Guitar, Synth, Kick, Snare, Hi-Hat, Cymbals, Toms |
| **Pro** | + Lead Vocal, Backing Vocals |

---

## GPU Acceleration

Set `DEVICE=cuda` in `.env`. Demucs runs ~10× faster on GPU.

For Docker, use the `nvidia` runtime:
```yaml
# docker-compose.yml → worker service
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

---

## Improving Quality

### Drum separation
The default implementation uses spectral methods (HPSS + frequency masking). For better results, replace `separate_drums()` in `backend/app/separation.py` with:
- **LarsNet** — trained model for 5-stem drum separation ([GitHub](https://github.com/...))
- **DrummerNet** or **ADT** models

### Vocal separation
Mid-side processing works well on professionally mixed recordings where lead vocal is centred. For complex mixes, consider integrating a dedicated model.

---

## Project Structure

```
stem-separator/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI routes
│   │   ├── tasks.py         # Celery pipeline
│   │   ├── separation.py    # AI separation logic
│   │   ├── models.py        # Pydantic models
│   │   └── config.py        # Settings
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                   # Upload page
│   │   │   └── results/[jobId]/page.tsx   # Stem mixer
│   │   ├── components/
│   │   │   ├── UploadZone.tsx
│   │   │   ├── ModeSelector.tsx
│   │   │   ├── StemMixer.tsx
│   │   │   └── StemTrack.tsx              # wavesurfer waveform + controls
│   │   └── lib/api.ts
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## API Endpoints

```
POST /api/upload          Upload song, start job → { job_id }
GET  /api/jobs/{job_id}   Poll status + stem URLs
GET  /api/files/{id}/{f}  Stream audio file
GET  /api/health          Health check
```
