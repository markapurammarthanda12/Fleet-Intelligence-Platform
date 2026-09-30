"""Deterministic synthetic fleet and telemetry generator; never emits real vehicle data."""

import argparse
import json
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import TextIO

DEFAULT_START_TIME = "2026-01-01T00:00:00Z"
TENANT_COUNT = 20
MAKES = ("Northstar", "Waypoint", "Summit", "Pioneer")
MODELS = ("Cargo 250", "Transit 18", "Haul 480", "Urban E")
FUEL_TYPES = ("diesel", "gasoline", "hybrid", "electric")


def parse_timestamp(value: str) -> datetime:
    """Parse an ISO-8601 instant, accepting the common UTC `Z` suffix."""
    try:
        timestamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise argparse.ArgumentTypeError("timestamp must be an ISO-8601 instant") from error
    if timestamp.tzinfo is None:
        raise argparse.ArgumentTypeError("timestamp must include a timezone, for example Z")
    return timestamp.astimezone(timezone.utc).replace(microsecond=0)


def generate_vehicles(vehicles: int, seed: int):
    """Yield a stable synthetic fleet catalog containing exactly `vehicles` IDs."""
    if vehicles < 1:
        raise ValueError("vehicles must be positive")
    rng = random.Random(seed)
    for number in range(vehicles):
        index = rng.randrange(len(MAKES))
        yield {
            "tenant_id": f"tenant-{number % TENANT_COUNT:02d}",
            "vehicle_id": f"vehicle-{number:06d}",
            "synthetic_asset_id": f"SYNTH-{number:08d}",
            "make": MAKES[index],
            "model": MODELS[index],
            "model_year": rng.randint(2018, 2026),
            "fuel_type": rng.choice(FUEL_TYPES),
            "synthetic": True,
        }


def generate_events(vehicles: int, events: int, seed: int, start_time: datetime | None = None):
    """Yield repeatable JSON-ready events, including late and duplicate deliveries."""
    if vehicles < 1:
        raise ValueError("vehicles must be positive")
    if events < 0:
        raise ValueError("events cannot be negative")
    rng = random.Random(seed)
    start = start_time or parse_timestamp(DEFAULT_START_TIME)
    for sequence in range(events):
        vehicle_number = sequence % vehicles
        idle = rng.random() < 0.12
        timestamp = start + timedelta(seconds=sequence)
        # A small share arrives late to exercise event-time handling downstream.
        if rng.random() < 0.03:
            timestamp -= timedelta(seconds=rng.randint(1, 90))
        event = {
            "event_id": str(uuid.uuid5(uuid.NAMESPACE_OID, f"{seed}:{sequence}")),
            "tenant_id": f"tenant-{vehicle_number % TENANT_COUNT:02d}",
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


def write_jsonl(records, destination: str) -> int:
    """Write records as JSON Lines and return the physical number of output lines."""
    stream: TextIO
    if destination == "-":
        stream = sys.stdout
        close_stream = False
    else:
        path = Path(destination)
        path.parent.mkdir(parents=True, exist_ok=True)
        stream = path.open("w", encoding="utf-8")
        close_stream = True
    count = 0
    try:
        for record in records:
            stream.write(json.dumps(record, separators=(",", ":")) + "\n")
            count += 1
    finally:
        if close_stream:
            stream.close()
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vehicles", type=int, default=100_000, help="synthetic vehicle catalog size")
    parser.add_argument("--events", type=int, default=10_000, help="base telemetry events before retries")
    parser.add_argument("--seed", type=int, default=42, help="seed for repeatable synthetic values")
    parser.add_argument("--start-time", type=parse_timestamp, default=parse_timestamp(DEFAULT_START_TIME))
    parser.add_argument("--output", default="-", help="telemetry JSONL path, or - for stdout")
    parser.add_argument("--vehicle-output", help="optional vehicle catalog JSONL path")
    args = parser.parse_args()
    if args.vehicles < 1 or args.events < 0:
        parser.error("--vehicles must be positive and --events cannot be negative")

    if args.vehicle_output:
        vehicle_count = write_jsonl(generate_vehicles(args.vehicles, args.seed), args.vehicle_output)
        print(f"Wrote {vehicle_count} synthetic vehicles to {args.vehicle_output}", file=sys.stderr)
    write_jsonl(
        generate_events(args.vehicles, args.events, args.seed, args.start_time),
        args.output,
    )


if __name__ == "__main__":
    main()
