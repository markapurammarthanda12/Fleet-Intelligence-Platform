#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
mkdir -p "$PROJECT_ROOT/data"

docker run --rm \
  --volume "$PROJECT_ROOT/src:/src:ro" \
  --volume "$PROJECT_ROOT/data:/data" \
  --workdir /src \
  python:3.12-slim \
  python fleetpulse/simulator.py \
    --vehicles 100000 \
    --events 100000 \
    --vehicle-output /data/vehicles.jsonl \
    --output /data/telemetry.jsonl \
    "$@"

printf 'Dataset files are in %s/data\n' "$PROJECT_ROOT"
