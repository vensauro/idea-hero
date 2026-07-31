#!/usr/bin/env bash
set -euo pipefail

VIDEO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$(cd "${VIDEO_DIR}/.." && pwd)"
OMNIVOICE_DIR="${OMNIVOICE_DIR:-/home/ivensauro/personal/omnivoice.cpp}"
MODEL="${OMNIVOICE_MODEL:-${OMNIVOICE_DIR}/models/omnivoice-base-Q8_0.gguf}"
CODEC="${OMNIVOICE_CODEC:-${OMNIVOICE_DIR}/models/omnivoice-tokenizer-Q8_0.gguf}"
TEXT="${VIDEO_DIR}/narration/pt-BR-vertical.txt"
OUTPUT_DIR="${APP_DIR}/public/video"
RAW_OUTPUT="${OUTPUT_DIR}/narration-vertical-raw.wav"
FINAL_OUTPUT="${OUTPUT_DIR}/narration-vertical.wav"
INSTRUCT="${OMNIVOICE_INSTRUCT:-female, middle-aged, moderate pitch, portuguese accent}"

mkdir -p "${OUTPUT_DIR}"

ARGS=(
  --model "${MODEL}"
  --codec "${CODEC}"
  --lang "Portuguese"
  --seed 84
  --chunk-duration 12
  --chunk-threshold 18
  -o "${RAW_OUTPUT}"
)

if [[ -n "${OMNIVOICE_REF_WAV:-}" || -n "${OMNIVOICE_REF_TEXT:-}" ]]; then
  if [[ -z "${OMNIVOICE_REF_WAV:-}" || -z "${OMNIVOICE_REF_TEXT:-}" ]]; then
    echo "Set both OMNIVOICE_REF_WAV and OMNIVOICE_REF_TEXT for voice cloning." >&2
    exit 1
  fi
  ARGS+=(--ref-wav "${OMNIVOICE_REF_WAV}" --ref-text "${OMNIVOICE_REF_TEXT}")
else
  ARGS+=(--instruct "${INSTRUCT}")
fi

"${OMNIVOICE_DIR}/build/omnivoice-tts" "${ARGS[@]}" < "${TEXT}"

DURATION="$(ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "${RAW_OUTPUT}")"
TEMPO="$(python3 -c "print(float('${DURATION}') / 84.8)")"

ffmpeg -y -i "${RAW_OUTPUT}" \
  -filter:a "atempo=${TEMPO},highpass=f=75,equalizer=f=190:t=q:w=1.1:g=-1.8,equalizer=f=3200:t=q:w=1.0:g=2.2,deesser=i=0.16:m=0.45:f=0.55,acompressor=threshold=0.11:ratio=2.4:attack=18:release=220:makeup=1.35:knee=3,loudnorm=I=-16:TP=-1.5:LRA=8" \
  -ar 48000 -ac 1 "${FINAL_OUTPUT}"

echo "Vertical narration ready: ${FINAL_OUTPUT}"
