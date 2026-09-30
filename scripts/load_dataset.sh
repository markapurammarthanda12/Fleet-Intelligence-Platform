#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="$PROJECT_ROOT/data"

if [[ ! -s "$DATA_DIR/vehicles.jsonl" || ! -s "$DATA_DIR/telemetry.jsonl" ]]; then
  echo "Dataset files are missing. Generate them first with scripts/generate_dataset.sh." >&2
  exit 1
fi

vehicle_count="$(wc -l < "$DATA_DIR/vehicles.jsonl" | tr -d ' ')"
if [[ "$vehicle_count" -ne 100000 ]]; then
  echo "Expected 100,000 vehicle records; found $vehicle_count." >&2
  exit 1
fi

echo "Publishing the generated fleet telemetry to Kafka. The dashboard will fill as the API consumes it."
docker compose exec -T kafka \
  /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server localhost:9092 \
  --topic fleet.telemetry.v1 < "$DATA_DIR/telemetry.jsonl"
echo "Telemetry submitted. Check progress at http://localhost:8080/v1/fleet/overview?tenant_id=tenant-100k"
