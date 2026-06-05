FROM python:3.11-slim

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download Demucs models (optional — speeds up first job)
# RUN python -c "from demucs.api import Separator; Separator('htdemucs_6s')"

COPY . .

# Storage dirs
RUN mkdir -p /app/storage/uploads /app/storage/outputs
