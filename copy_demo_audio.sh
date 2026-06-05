#!/bin/bash
# Copies best processed job into demo-site/demo-audio/
# Run from the stem-separator/ directory

JOB="e1fb7a3a-03e8-4750-8948-a43632f939f5"
SRC="backend/storage/outputs/$JOB"
DST="demo-site/demo-audio"

mkdir -p "$DST"

cp "backend/storage/uploads/$JOB/audio.mp3"          "$DST/original.mp3"
cp "$SRC/demucs/htdemucs_6s/audio/vocals.mp3"        "$DST/vocals.mp3"
cp "$SRC/demucs/htdemucs_6s/audio/drums.mp3"         "$DST/drums.mp3"
cp "$SRC/demucs/htdemucs_6s/audio/bass.mp3"          "$DST/bass.mp3"
cp "$SRC/demucs/htdemucs_6s/audio/guitar.mp3"        "$DST/guitar.mp3"
cp "$SRC/demucs/htdemucs_6s/audio/piano.mp3"         "$DST/piano.mp3"
cp "$SRC/vocals/lead_vocal.mp3"                       "$DST/lead_vocal.mp3"
cp "$SRC/vocals/backing_vocals.mp3"                   "$DST/backing_vocals.mp3"
cp "$SRC/drums/kick.mp3"                              "$DST/kick.mp3"
cp "$SRC/drums/snare.mp3"                             "$DST/snare.mp3"
cp "$SRC/drums/hihat.mp3"                             "$DST/hihat.mp3"
cp "$SRC/drums/cymbals.mp3"                           "$DST/cymbals.mp3"
cp "$SRC/drums/toms.mp3"                              "$DST/toms.mp3"

echo "✅ Demo audio files copied to $DST/"
ls -lh "$DST"
