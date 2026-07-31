#!/usr/bin/env bash
set -euo pipefail

VIDEO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$(cd "${VIDEO_DIR}/.." && pwd)"
INPUT="${1:-${APP_DIR}/public/video/narration-vertical-omnivoice.wav}"
OUTPUT="${2:-${APP_DIR}/public/video/narration-vertical-omnivoice-pro.wav}"
PACE="${OMNIVOICE_PACE:-0.94}"

if [[ ! -f "${INPUT}" ]]; then
  echo "OmniVoice narration not found: ${INPUT}" >&2
  exit 1
fi

# Sentence boundaries measured from the original narration. Each phrase is
# slowed independently, then a deliberate breath is inserted. Longer pauses
# mark paragraph changes; shorter pauses separate ideas inside a paragraph.
CUTS=(0 6.24 11.84 14.30 19.24 25.74 29.00 33.00 39.54 46.96 51.80 55.00 60.16 65.46 69.96 73.66 79.46 81.56 84.77)
PAUSES=(0.28 0.62 0.26 0.20 0.20 0.20 0.30 0.72 0.22 0.32 0.34 0.22 0.22 0.50 0.22 0.38 0.72)

FILTER=""
CONCAT_INPUTS=""
PARTS=0

for ((i = 0; i < ${#CUTS[@]} - 1; i++)); do
  FILTER+="[0:a]atrim=start=${CUTS[$i]}:end=${CUTS[$((i + 1))]},asetpts=PTS-STARTPTS,atempo=${PACE}[speech${i}];"
  CONCAT_INPUTS+="[speech${i}]"
  PARTS=$((PARTS + 1))

  if ((i < ${#PAUSES[@]})); then
    FILTER+="anullsrc=r=48000:cl=mono:d=${PAUSES[$i]}[pause${i}];"
    CONCAT_INPUTS+="[pause${i}]"
    PARTS=$((PARTS + 1))
  fi
done

# Subtle broadcast-style finish: remove rumble/mud, add intelligibility,
# control sibilance and dynamics, then normalize for online video.
FILTER+="${CONCAT_INPUTS}concat=n=${PARTS}:v=0:a=1,highpass=f=75,equalizer=f=190:t=q:w=1.1:g=-1.8,equalizer=f=3200:t=q:w=1.0:g=2.2,deesser=i=0.16:m=0.45:f=0.55,acompressor=threshold=0.11:ratio=2.4:attack=18:release=220:makeup=1.35:knee=3,loudnorm=I=-16:TP=-1.5:LRA=8[out]"

ffmpeg -y -i "${INPUT}" \
  -filter_complex "${FILTER}" -map "[out]" \
  -ar 48000 -ac 1 "${OUTPUT}"

echo "Professional OmniVoice narration ready: ${OUTPUT}"
