# Fleet Intelligence Platform

The Fleet Intelligence Platform turns connected-vehicle data into trustworthy, explainable fleet decisions. It brings together vehicle activity, trips, health signals, operational alerts, and cost insights so fleet teams can see what is happening and decide what to do. Prolonged idling is the first example workflow used to prove the end-to-end system; it is not the product's full scope. Later workflows can cover maintenance risk, utilisation, safety, and fleet-wide reporting. This repository is the starting MVP for the Motorq connected-vehicle hackathon; it uses synthetic data and has no affiliation with Motorq.

## Current implementation

- A Java 21 / Spring Boot API validates connected-vehicle telemetry and stores it in PostgreSQL.
- PostgreSQL uniqueness on `(tenant_id, event_id)` makes retries idempotent; duplicate submissions are acknowledged without a second row.
- The Python simulator produces reproducible synthetic events, including delayed and duplicate deliveries.
- Docker Compose is configured for the API, PostgreSQL, and an operator dashboard, with a persistent database volume and a database health check.
- The API exposes readiness through Spring Boot Actuator and supports bounded telemetry history queries.

## Hackathon deliverables and current status

| Deliverable | Current status | What remains |
|---|---|---|
| Dockerized, portable system | Local Compose runtime verified for API, PostgreSQL, and dashboard | Add broker and simulator services, deployment profiles, and cloud portability evidence |
| Real-time ingestion and alerting | API validates and persists idempotent events; sustained-idle alerts have been exercised end to end on the local stack | Add Kafka stream processing and latency evidence at challenge scale |
| Relational and high-volume data | PostgreSQL telemetry, vehicle state, and alert tables are implemented | Add fleet metadata and a high-volume telemetry store after measuring workload |
| User interface | Local dashboard with tenant and vehicle filters and automatic refresh | Add alert acknowledgement and authenticated API access |
| Security, tests, and observability | Production authentication, authorization, automated test coverage, and full observability are not implemented | Add tenant-aware access controls, automated checks, metrics/logs/traces, and documented security decisions |
| Performance targets | Not measured | Load test target throughput and burst behavior; report measured latency, loss/error rate, and lag |

Docker is part of the deliverable. Compose defines the API, PostgreSQL, dashboard, persistent volume, and database health check. The local stack and one synthetic alert journey have been verified; this is not a claim of cloud portability or challenge-scale performance.

The simulator accepts 100,000 vehicles. That is a data-generation capability, not a claim that the current API sustains the challenge's 100,000 events/second target.

## Quick start

Requires Docker Desktop. You do not need to install Java, Maven, Node.js, Spring Boot, or PostgreSQL on your Mac; Docker downloads and runs the build tools and services inside containers. Docker Compose is included with current Docker Desktop releases.

### Start it on a Mac

1. Open Docker Desktop and wait until it says the engine is running.
2. Open **Terminal** (press `Command + Space`, type `Terminal`, and press Return).
3. In Terminal, go to the folder where you downloaded or cloned this repository. For example:

   ```bash
   cd ~/Projects/Fleet-Intelligence-Platform
   ```

   Replace that example path with the folder where the repository is on your Mac. If you opened this project only inside Codex, the project files are in Codex's workspace; you do not need to type commands while the app is already running.
4. Start the system:

   ```bash
   docker compose up --build
   ```

5. Open `http://localhost:3000` in a browser. The first build downloads the Java and Node build images and can take several minutes. Leave the Terminal window open while using the app. Press `Control + C` there to stop it.

To start the already-built services in the background later, use `docker compose up -d`. To stop background services, use `docker compose down` from the same repository folder.

The dashboard starts with no alerts because the database is empty. To create a synthetic idling alert for the demo, leave the services running, open a second Terminal window in the repository folder, and run:

```bash
bash scripts/demo.sh
```

Then set the dashboard's **Fleet / tenant** field to `tenant-demo`. The script submits two synthetic stationary events six minutes apart; it does not use real vehicle data. The dashboard should show one open idling alert for the demo vehicle.

If you want to change local settings, create the optional environment file before starting Docker:

```bash
cp .env.example .env
```

The optional `.env` copy is only needed if you want to customize settings; defaults work for local development. The API is available at `http://localhost:8080`, and readiness is at `/actuator/health/readiness`. Submit a telemetry event to `POST /v1/telemetry`, then read it back with `GET /v1/telemetry?tenant_id=tenant-00&vehicle_id=vehicle-000001` or view its alert at `/v1/alerts?tenant_id=tenant-00`.

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

Fuel-use assumptions are illustrative and must be calibrated with documented fleet-specific data before presenting savings as measured results.

## Next milestones

1. Add alert acknowledgement, authentication, and tenant-aware authorization.
2. Add Kafka-backed stream processing and a justified high-volume telemetry store.
3. Add observability and reproducible scale evidence for the hackathon targets.

See [the project brief](docs/PROJECT_BRIEF.md) and [architecture notes](docs/ARCHITECTURE.md).
