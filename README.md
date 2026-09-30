# Fleet Intelligence Platform

The Fleet Intelligence Platform turns connected-vehicle data into trustworthy, explainable fleet decisions. It brings together vehicle activity, trips, health signals, operational alerts, and cost insights so fleet teams can see what is happening and decide what to do. Prolonged idling is the first example workflow used to prove the end-to-end system; it is not the product's full scope. Later workflows can cover maintenance risk, utilisation, safety, and fleet-wide reporting. This repository is the starting MVP for the Motorq connected-vehicle hackathon; it uses synthetic data and has no affiliation with Motorq.

## Current scope

- Generate synthetic telemetry for a configurable fleet, including duplicate and delayed events.
- Validate and ingest telemetry through a small HTTP API.
- Demonstrate one explainable fleet decision: identify prolonged idling and estimate possible fuel waste.
- Run the current API in a local Docker container using Docker Compose.
- Keep the first implementation small enough to run locally; Kafka, durable stores, authentication, UI, and cloud deployment are planned, not implemented.

## Hackathon deliverables and current status

| Deliverable | Current status | What remains |
|---|---|---|
| Dockerized, portable system | Starter API has a Dockerfile and Compose service | Compose the completed API, simulator, Kafka, databases, dashboard, and supporting services; document configuration and deployment |
| Real-time ingestion and alerting | Local in-memory API and initial idling rule | Durable event flow, replay/idempotency, alert delivery and end-to-end latency evidence |
| Relational and high-volume data | Not implemented | Persist fleet entities and alerts, and store/query telemetry at scale |
| User interface | Not implemented | Build the operations dashboard and connect it to authenticated APIs |
| Security, tests, and observability | Not implemented in this starter | Add tenant-aware access controls, automated checks, metrics/logs/traces, and documented security decisions |
| Performance targets | Not measured | Load test target throughput and burst behavior; report measured latency, loss/error rate, and lag |

Docker is part of the deliverable, but the current Compose file only starts the API. We must not describe the full platform as containerized or cloud-portable until the complete stack has been composed and exercised.

The simulator accepts 100,000 vehicles. That is a data-generation capability, not a claim that the current API sustains the challenge's 100,000 events/second target.

## Quick start

Requires Python 3.11+.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
python -m fleetpulse.simulator --vehicles 100000 --events 1000 --output data/sample.jsonl
uvicorn fleetpulse.api:app --reload
```

Send one line from `data/sample.jsonl` to `POST /v1/telemetry` as JSON. Browse `/docs` for the interactive API description and `GET /v1/alerts` for current in-memory alerts. API state resets when the process restarts.

To start the current API-only container, run `docker compose up --build` and open `http://localhost:8000/docs`. This is a development starter, not the final hackathon deployment stack.

## Repository map

```text
.
├── docs/                 # Project brief, architecture, and decisions
├── src/fleetpulse/       # API, domain rules, and simulator
├── Dockerfile            # Current API container
├── compose.yaml          # Current API-only local container startup
└── data/                 # Generated local data (git-ignored)
```

## Configuration

| Variable | Default | Meaning |
|---|---:|---|
| `FUEL_LITRES_PER_IDLE_HOUR` | `1.5` | Assumed fuel consumption while idling |
| `IDLE_ALERT_SECONDS` | `300` | Duration threshold for a prolonged-idle alert |

These are starter assumptions for synthetic data. Replace them with documented fleet-specific parameters before presenting savings as measured results.

## Next milestones

1. Add persistent relational metadata and time-series telemetry storage, plus migrations.
2. Add a durable event broker and a stream consumer with idempotency and replay.
3. Add a web dashboard, tenant-aware authentication, observability, and reproducible load evidence.

See [the project brief](docs/PROJECT_BRIEF.md) and [architecture notes](docs/ARCHITECTURE.md).
