"""Deterministic synthetic telemetry generator; never emits real vehicle data."""

import argparse
import json
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone


def generate_events(vehicles: int, events: int, seed: int):
    rng = random.Random(seed)
    start = datetime.now(timezone.utc).replace(microsecond=0)
    for sequence in range(events):
        vehicle_number = sequence % vehicles
        idle = rng.random() < 0.12
        timestamp = start + timedelta(seconds=sequence)
        # A small share arrives late to exercise event-time handling downstream.
        if rng.random() < 0.03:
            timestamp -= timedelta(seconds=rng.randint(1, 90))
        event = {
            "event_id": str(uuid.uuid5(uuid.NAMESPACE_OID, f"{seed}:{sequence}")),
            "tenant_id": f"tenant-{vehicle_number % 20:02d}",
            "vehicle_id": f"vehicle-{vehicle_number:06d}",
            "observed_at": timestamp.isoformat().replace("+00:00", "Z"),
            "latitude": round(12.9 + rng.random() * 0.5, 6),
            "longitude": round(77.4 + rng.random() * 0.5, 6),
            "speed_kmh": 0 if idle else round(rng.uniform(5, 95), 1),
            "engine_on": True,
            "sequence": sequence,
        }
        yield event
        # Simulate at-least-once delivery for a small percentage of events.
        if rng.random() < 0.01:
            yield event


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vehicles", type=int, default=100_000)
    parser.add_argument("--events", type=int, default=10_000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", default="-", help="JSONL path, or - for stdout")
    args = parser.parse_args()
    if args.vehicles < 1 or args.events < 0:
        parser.error("--vehicles must be positive and --events cannot be negative")
    stream = sys.stdout if args.output == "-" else open(args.output, "w", encoding="utf-8")
    try:
        for item in generate_events(args.vehicles, args.events, args.seed):
            stream.write(json.dumps(item, separators=(",", ":")) + "\n")
    finally:
        if stream is not sys.stdout:
            stream.close()


if __name__ == "__main__":
    main()
