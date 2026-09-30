# Fleet Intelligence Platform

The Fleet Intelligence Platform turns connected-vehicle data into trustworthy, explainable fleet decisions. It brings together vehicle activity, trips, health signals, operational alerts, and cost insights so fleet teams can see what is happening and decide what to do. Prolonged idling is the first example workflow used to prove the end-to-end system; it is not the product's full scope. Later workflows can cover maintenance risk, utilisation, safety, and fleet-wide reporting. This repository is the starting MVP for the Motorq connected-vehicle hackathon; it uses synthetic data and has no affiliation with Motorq.

## Current implementation

- A Java 21 / Spring Boot API validates connected-vehicle telemetry and stores it in PostgreSQL.
- PostgreSQL uniqueness on `event_id` makes retries idempotent; duplicate submissions are acknowledged without a second row.
- The Python simulator produces reproducible synthetic events, including delayed and duplicate deliveries.
- Docker Compose starts the API, PostgreSQL, and an operator dashboard, with a persistent database volume and a database health check.
- The API exposes readiness through Spring Boot Actuator and supports bounded telemetry history queries.

## Hackathon deliverables and current status

| Deliverable | Current status | What remains |
|---|---|---|
| Dockerized, portable system | API, PostgreSQL, and dashboard run as Compose services | Add simulator, broker, production secrets, deployment profile, and end-to-end evidence |
| Real-time ingestion and alerting | Spring API validates and persists events; retries are idempotent | Add Kafka stream processing and explainable fleet alerts with latency evidence |
| Relational and high-volume data | PostgreSQL telemetry table and query index are implemented | Add fleet/alert entities and a high-volume telemetry store after measuring workload |
| User interface | Tenant and vehicle filtered alert dashboard with automatic refresh | Add alert acknowledgement and authenticated API access |
| Security, tests, and observability | Not implemented in this starter | Add tenant-aware access controls, automated checks, metrics/logs/traces, and documented security decisions |
| Performance targets | Not measured | Load test target throughput and burst behavior; report measured latency, loss/error rate, and lag |

Docker is part of the deliverable. The current Compose profile starts the API and PostgreSQL, but the full stack is not containerized or cloud-portable until the remaining services are added and exercised together.

The simulator accepts 100,000 vehicles. That is a data-generation capability, not a claim that the current API sustains the challenge's 100,000 events/second target.

## Quick start

Requires Docker and Docker Compose. The application images include their own Java runtime.

```bash
cp .env.example .env
docker compose up --build
```

The dashboard is available at `http://localhost:3000`; the API is available at `http://localhost:8080`, and readiness is at `/actuator/health/readiness`. Submit a telemetry event to `POST /v1/telemetry`, then read it back with `GET /v1/telemetry?tenant_id=tenant-00&vehicle_id=vehicle-000001` or view its alert at `/v1/alerts?tenant_id=tenant-00`.

Example request:

```bash
curl -i http://localhost:8080/v1/telemetry \
  -H 'Content-Type: application/json' \
  -d '{"event_id":"sample-001","tenant_id":"tenant-00","vehicle_id":"vehicle-000001","observed_at":"2026-09-30T10:00:00Z","latitude":12.9716,"longitude":77.5946,"speed_kmh":0,"engine_on":true,"sequence":1}'
```

A newly inserted event returns `201 Created`; retrying the same event ID for that tenant returns `200 OK` with `duplicate: true`. Once consecutive event timestamps show an engine-on vehicle stationary for at least `IDLE_ALERT_SECONDS`, the API opens an explainable idling alert. Later movement resolves it. List a tenant's alerts with `GET /v1/alerts?tenant_id=tenant-00`. History and alert queries are limited to 500 rows. Authentication and tenant authorization are not implemented yet, so the API is for local development only.

The sample password in `.env.example` is for a local demonstration only. Use a managed secret for any shared or deployed environment. `docker compose down` stops the services; `docker compose down -v` also removes the local database volume and its data.

To generate synthetic telemetry locally, install the small Python package with `pip install -e .`, then run `fleetintel-sim --vehicles 100000 --events 1000 --output data/sample.jsonl`.

## Repository map

```text
.
├── docs/                 # Project brief, architecture, and decisions
├── backend/              # Spring Boot API and PostgreSQL migrations
├── frontend/             # React and TypeScript operations dashboard
├── src/fleetpulse/       # Python synthetic data generator
├── Dockerfile            # Multi-stage Java API container
├── compose.yaml          # API + PostgreSQL + dashboard local stack
└── data/                 # Generated local data (git-ignored)
```

## Configuration

| Variable | Default | Meaning |
|---|---:|---|
| `API_PORT` | `8080` | Host port for the API |
| `POSTGRES_PORT` | `5432` | Host port for local database access |
| `POSTGRES_DB` | `fleetintel` | Local database name |
| `POSTGRES_USER` | `fleetintel` | Local database user |
| `POSTGRES_PASSWORD` | local example value | Local-only password; replace for shared deployments |
| `IDLE_ALERT_SECONDS` | `300` | Stationary engine-on duration before an idling alert opens |
| `FUEL_LITRES_PER_IDLE_HOUR` | `1.5` | Illustrative fuel-burn assumption used in alert estimates |

Fuel-use assumptions will be introduced with the idling alert workflow and must be documented before presenting savings as measured results.

## Next milestones

1. Add alert acknowledgement, authentication, and tenant-aware authorization.
2. Add Kafka-backed stream processing and a justified high-volume telemetry store.
3. Add observability and reproducible scale evidence for the hackathon targets.

See [the project brief](docs/PROJECT_BRIEF.md) and [architecture notes](docs/ARCHITECTURE.md).
