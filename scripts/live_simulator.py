"""Send changing synthetic vehicle telemetry through the fleet ingest API."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import logging
import math
import random
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone

LOG = logging.getLogger("fleetintel.live_simulator")


def send_event(api_url: str, event: dict[str, object]) -> None:
    request = urllib.request.Request(
        f"{api_url.rstrip('/')}/v1/telemetry",
        data=json.dumps(event, separators=(",", ":")).encode(),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            if response.status != 202:
                raise RuntimeError(f"telemetry ingest returned HTTP {response.status}")
    except (urllib.error.URLError, TimeoutError) as error:
        raise RuntimeError(f"could not reach telemetry API: {error}") from error


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", default="http://localhost:8080")
    parser.add_argument("--tenant-id", default="tenant-demo")
    parser.add_argument("--vehicles", type=int, default=100_000)
    parser.add_argument("--events-per-second", type=int, default=100)
    parser.add_argument("--workers", type=int, default=16)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    if args.vehicles < 1 or args.events_per_second < 1 or args.workers < 1:
        parser.error("vehicle, rate, and worker counts must be positive")

    rng = random.Random(args.seed)
    sequence = 0
    LOG.info(
        "Live synthetic telemetry started: fleet=%s vehicles=%s rate=%s events/s",
        args.tenant_id,
        args.vehicles,
        args.events_per_second,
    )
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        while True:
            batch_start = time.monotonic()
            futures = []
            for _ in range(args.events_per_second):
                vehicle_number = sequence % args.vehicles
                # Vehicles follow bounded paths around Bengaluru; each position is generated
                # from the vehicle identity and event sequence, never from a UI fixture.
                angle = (vehicle_number * 0.61803398875 + sequence * 0.013) % (2 * math.pi)
                radius = 0.01 + ((vehicle_number % 97) / 97) * 0.22
                latitude = 12.9716 + math.sin(angle) * radius
                longitude = 77.5946 + math.cos(angle) * radius
                stationary = rng.random() < 0.12
                event = {
                    "event_id": str(uuid.uuid4()),
                    "tenant_id": args.tenant_id,
                    "vehicle_id": f"vehicle-{vehicle_number:06d}",
                    "observed_at": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
                    "latitude": round(latitude, 6),
                    "longitude": round(longitude, 6),
                    "speed_kmh": 0 if stationary else round(rng.uniform(8, 82), 1),
                    "engine_on": True,
                    "sequence": sequence,
                }
                futures.append(pool.submit(send_event, args.api_url, event))
                sequence += 1
            failures = 0
            for future in concurrent.futures.as_completed(futures):
                try:
                    future.result()
                except Exception as error:  # keep stream alive while surfacing the outage
                    failures += 1
                    LOG.warning("event rejected: %s", error)
            if sequence % max(args.events_per_second, 1000) < args.events_per_second:
                LOG.info("published=%s rejected_in_last_batch=%s", sequence - failures, failures)
            remaining = 1.0 - (time.monotonic() - batch_start)
            if remaining > 0:
                time.sleep(remaining)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    main()
