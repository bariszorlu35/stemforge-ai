<div align="center">

```
███████╗████████╗███████╗███╗   ███╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗     █████╗ ██╗
██╔════╝╚══██╔══╝██╔════╝████╗ ████║██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝    ██╔══██╗██║
███████╗   ██║   █████╗  ██╔████╔██║█████╗  ██║   ██║██████╔╝██║  ███╗█████╗      ███████║██║
╚════██║   ██║   ██╔══╝  ██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝      ██╔══██║██║
███████║   ██║   ███████╗██║ ╚═╝ ██║██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗    ██║  ██║██║
╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝    ╚═╝  ╚═╝╚═╝
```

**Hierarchical Music Stem Separation — not just 4 tracks.**

[![Demo](https://img.shields.io/badge/🎧_Live_Demo-bariszorlu.com%2Fstemforgeai-00ff9c?style=for-the-badge&labelColor=0a0e0a)](https://bariszorlu.com/stemforgeai/)
[![GitHub](https://img.shields.io/badge/GitHub-bariszorlu35%2Fstemforge--ai-181717?style=for-the-badge&logo=github)](https://github.com/bariszorlu35/stemforge-ai)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## 🎧 Live Demo

> **[→ bariszorlu.com/stemforgeai](https://bariszorlu.com/stemforgeai/)**

The demo includes a fully interactive DAW-style mixer with pre-processed stems from *Bad Omens — Somebody Else*. All stems play in perfect sync via Web Audio API. Solo, mute, seek and download individually.

> ⚠️ Live upload processing is disabled in the public demo (requires CPU/GPU). Clone the repo and run locally to process your own tracks.

---

## ✦ What makes it different

Most tools give you 4–6 flat stems. StemForge AI separates in **two hierarchical stages**:

```
Full Song
├── Vocals ──────────────── Lead Vocal
│                       └── Backing Vocals / Harmonies
├── Drums  ──────────────── Kick
│                       ├── Snare
│                       ├── Hi-Hat
│                       ├── Cymbals
│                       └── Toms
├── Bass
├── Guitar
├── Synth / Keys
└── Other
```

---

## ⚡ Features

| Feature | Description |
|---|---|
| **Hierarchical separation** | Two-stage pipeline: main stems → sub-stems |
| **6-stem base** | Demucs `htdemucs_6s`: vocals, drums, bass, guitar, piano, other |
| **Drum detail** | HPSS + frequency-band masking → kick, snare, hi-hat, cymbals, toms |
| **Vocal detail** | Wiener soft masking + mid-side processing → lead & backing vocals |
| **Web Mixer** | Play all stems in sync, solo/mute/volume/seek per track |
| **Async pipeline** | FastAPI + Celery + Redis — non-blocking job queue |
| **Docker ready** | `docker compose up` starts everything |

---

## 🏗 Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────────────┐
│   Next.js   │────▶│   FastAPI    │────▶│  Celery + Redis   │
│   Frontend  │◀────│   REST API   │     │    Job Queue      │
└─────────────┘     └──────────────┘     └────────┬──────────┘
                                                   │
                         ┌─────────────────────────┤
                         ▼                         ▼
               ┌──────────────────┐     ┌─────────────────────┐
               │ Demucs htdemucs  │     │   Spectral Models   │
               │   _6s (Stage 1)  │     │     (Stage 2)       │
               │                  │     │  ┌─────────────────┐│
               │ vocals │ drums   │────▶│  │ HPSS drum sep   ││
               │ bass   │ guitar  │     │  ├─────────────────┤│
               │ piano  │ other   │     │  │ Wiener vocal sep││
               └──────────────────┘     │  └─────────────────┘│
                                        └─────────────────────┘
```

---

## 🛠 Tech Stack

**Frontend**
- Next.js 14 (App Router) · Tailwind CSS · wavesurfer.js v7
- TypeScript · React hooks

**Backend**
- Python 3.11 · FastAPI · Celery · Redis
- PyTorch · Demucs v4 · FFmpeg · soundfile · scipy · numpy

**Infrastructure**
- Docker Compose · Local storage (→ S3/R2 for production)

---

## 🚀 Quick Start

### Docker (recommended)

```bash
git clone https://github.com/bariszorlu35/stemforge-ai.git
cd stemforge-ai
cp .env.example .env
docker compose up --build
```

Open **http://localhost:3000** — first job downloads the Demucs model (~300 MB).

### Local development

```bash
# 1. Redis
docker run -d -p 6379:6379 redis:7-alpine

# 2. Backend (Python 3.11)
cd backend
python3.11 -m venv venv && source venv/bin/activate
pip install torch torchaudio
pip install -r requirements.txt
cp ../.env.example .env
uvicorn app.main:app --reload          # terminal 1

celery -A app.tasks.celery_app worker \
  --loglevel=info --concurrency=1      # terminal 2

# 3. Frontend
cd ../frontend
npm install && npm run dev             # terminal 3
```

---

## ⚙️ Separation Modes

| Mode | Stems | Notes |
|---|---|---|
| **Basic** | vocals, drums, bass, other | Fastest |
| **Advanced** | + guitar, synth + drum sub-stems | Recommended |
| **Pro** | + lead vocal, backing vocals | Experimental |

---

## 🔧 Configuration

```env
# .env
MAIN_MODEL=htdemucs       # htdemucs_6s for guitar/synth support
DEVICE=cpu                # set to "cuda" for 10× speedup
MAX_FILE_SIZE_MB=100
JOB_TTL=21600             # files deleted after 6 hours
```

---

## 📁 Project Structure

```
stemforge-ai/
├── backend/
│   ├── app/
│   │   ├── main.py          ← FastAPI routes
│   │   ├── tasks.py         ← Celery pipeline (3 stages)
│   │   ├── separation.py    ← AI separation logic
│   │   ├── models.py        ← Pydantic models + stem metadata
│   │   └── config.py        ← Settings (.env)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx                   ← Upload page
│       │   └── results/[jobId]/page.tsx   ← Stem mixer
│       └── components/
│           ├── UploadZone.tsx
│           ├── ModeSelector.tsx
│           ├── StemMixer.tsx              ← DAW-style mixer
│           └── StemTrack.tsx             ← wavesurfer + controls
├── demo-site/
│   ├── index.html                         ← Static demo (cPanel-ready)
│   └── demo-audio/                        ← Pre-processed stems
├── docker-compose.yml
└── .env.example
```

---

## 📌 Limitations

- Live processing requires ~5–15 min/song on CPU, or a GPU (`DEVICE=cuda`)
- Backing vocal separation is **experimental** — works best on professionally mixed stereo
- Drum sub-separation uses spectral methods (LarsNet integration planned)
- Public demo has upload disabled due to compute constraints

---

## 🔮 Future Work

- [ ] GPU cloud deployment (RunPod / Vast.ai)
- [ ] LarsNet integration for better drum separation
- [ ] Dedicated harmony/backing vocal model
- [ ] User accounts + persistent storage
- [ ] Public REST API

---

<div align="center">

Built by **[bariszorlu.com](https://bariszorlu.com)** · MIT License

</div>
