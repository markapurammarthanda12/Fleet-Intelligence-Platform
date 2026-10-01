# Fleet Intelligence Platform

The Fleet Intelligence Platform turns connected-vehicle data into trustworthy, explainable fleet decisions. It brings together vehicle activity, trips, health signals, operational alerts, and cost insights so fleet teams can see what is happening and decide what to do. Prolonged idling is the first example workflow used to prove the end-to-end system; it is not the product's full scope. Later workflows can cover maintenance risk, utilisation, safety, and fleet-wide reporting. This repository is the starting MVP for the Motorq connected-vehicle hackathon; it uses synthetic data and has no affiliation with Motorq.

## Runtime status — 2026-10-01 (latest recorded local check)

The persistent local Compose database has Flyway V1–V6 applied. The API was rebuilt and only its container recreated; PostgreSQL and its volume, dashboard, Kafka, ClickHouse, and simulator were preserved. API readiness, dashboard, Alerts, Analytics, and Reports were checked against the running synthetic fleet. PostgreSQL contains 100,003 vehicle rows, 2 tenants, and 945,452 telemetry events; the UI overview represents 100,000 fleet vehicles. These are local, time-specific checks, not a clean-clone startup, soak, load, availability, or challenge-scale performance result. Fuel and emissions figures are explicitly estimates. See the [dated runtime evidence](evidences/2026-10-01/local-stack-check.md) and [evidence index](evidences/README.md).

## Current implementation

- A Java 21 / Spring Boot API validates connected-vehicle telemetry and publishes it to a partitioned Kafka topic; a consumer persists events and evaluates idling alerts in PostgreSQL.
- PostgreSQL uniqueness on `(tenant_id, event_id)` makes retries idempotent; duplicate submissions are acknowledged without a second row.
- The Python simulator produces a repeatable 100,000-record synthetic vehicle catalog and synthetic events with delayed and duplicate deliveries.
- Docker Compose defines Apache Kafka, ClickHouse, the API, PostgreSQL, and an operator dashboard, with persistent service volumes and health checks.
- The API exposes readiness through Spring Boot Actuator and supports bounded telemetry history queries.
- Hosted API mode validates OAuth2/OIDC JWTs against a configured issuer, checks `fleet.read` / `fleet.ingest` scopes, and rejects tenant IDs that do not match the signed `tenant_id` claim. Local Compose explicitly selects an unauthenticated demo mode for quick local use.
- Fleet overview and vehicle-list APIs derive counts, current status, last seen time, and last reported coordinates from each tenant's latest telemetry; the dashboard uses these APIs for its overview.
- The summary counts include the entire fleet. For responsiveness, the map and vehicle table request the 200 latest vehicle reports, not 100,000 Leaflet markers at once; all points shown still come from telemetry coordinates.
- The dashboard follows a fleet-operations layout with a dark navigation rail, summary cards, fleet trend charts, status donut, searchable map/list, alert center, analytics, vehicle details, a local demo rule catalog, reports, and browser-local settings. The local demo workspace is selected automatically; operators do not type an internal tenant ID.
- Core dashboard, vehicle, map, alert, and report values come only from API/database telemetry. If a service is unavailable, the dashboard shows an error or an empty state; it never substitutes a hardcoded fleet. Map coordinates are taken from telemetry records. The fleet map uses Leaflet and OpenStreetMap tiles with attribution.
- An optional Python live-simulator service emits changing synthetic telemetry through the same validated API and Kafka path as other vehicle events. This is generated test data, not data from physical connected vehicles.
- Idling alerts escalate from `warning` to `critical` after 15 minutes by default and are returned with open, critical alerts first. This is a demo policy configurable with `IDLE_CRITICAL_SECONDS`.
- Kafka also feeds an independent ClickHouse Kafka Engine/materialized-view path for historical analytics. `GET /v1/analytics/telemetry/hourly` returns hourly event, vehicle, idling, and moving counts for a tenant and bounded time range. The dashboard Reports view uses this endpoint.
- Fuel Management persists refuelling transactions in PostgreSQL. The local demo has a one-click simulated refuelling trigger that creates a batch proportional to 0.1% of the reporting fleet (minimum one vehicle, maximum 500), using fixed illustrative petrol/diesel prices. Monthly spend and purchased litres update from saved transactions; potential tailpipe CO₂ is clearly an estimate from the purchase volume, not a vehicle sensor measurement.
- Analytics and Reports are separate views: Analytics shows telemetry KPIs and an hourly trend; Reports shows the underlying hourly rows and CSV export. The Fuel screen lists the recent simulated purchases and has a one-click refuelling trigger.

## Hackathon deliverables and current status

| Deliverable | Current status | What remains |
|---|---|---|
| Dockerized local demo | Compose stack and the current local runtime have been checked; a 100,000-vehicle snapshot and 5 events/second simulator are available. | Fresh-clone startup and seeded data path need reproducible verification; local Kafka is single-node; cloud deployment is not demonstrated |
| Real-time ingestion and alerting | Kafka ingestion, duplicate protection, retries/DLQ routing, idling alerts, acknowledgement, and hourly ClickHouse reports are implemented; recent local Reports request was about 0.2 seconds | Demonstrate event-to-dashboard and critical-alert timing; test DLQ replay and broker/service recovery |
| Relational and analytical data | V6 passed fresh-database integration, a disposable 100K-row migration check, and was applied to the persistent local database; ClickHouse stores analytics with exact hourly rollups | Capture before/after `EXPLAIN ANALYZE`; document partitions, retention, and CAP trade-offs |
| User interface | Overview, Vehicles, Alerts, Analytics, Reports, and simulated Fuel use API-backed data; local Dashboard and Alerts screenshots are saved in `evidences/2026-10-01/` and embedded in the solution draft | Hosted interactive OIDC sign-in remains unconfigured; Drivers, Routes, and Maintenance are previews; final-release and observability screenshots remain |
| Security, tests, observability | API JWT validation and tenant/scope checks exist; GitHub CI covers simulator, backend integration, and frontend build | Configure a hosted identity provider; add/report coverage, contract/acceptance/load/security/chaos checks, TLS/mTLS, audit/privacy controls, and metrics/logs/traces |
| Challenge-scale performance and availability | No challenge-scale target has been demonstrated | Measure 100K events/s, 3x five-minute burst, data loss, p95/p99, end-to-end latency, failover, and availability |

Docker is part of the deliverable. Compose defines the API, single-node local Apache Kafka broker, ClickHouse, PostgreSQL, dashboard, persistent volumes, and health checks. The last recorded local check had the dashboard, API, PostgreSQL, Kafka, ClickHouse, and optional simulator running, with database/broker health checks passing. The latest schema migration in this working copy has not yet been applied to that database. This is not a claim of cloud portability, high availability, or challenge-scale performance.

The generator creates exactly 100,000 synthetic vehicle records and a base telemetry snapshot; the checked-in compressed dataset is described in [data/README.md](data/README.md), while generated uncompressed JSONL files are ignored by Git. A separate optional stream changes positions and speed at a configurable rate. This does not claim that the current API sustains the challenge's 100,000 events/second target.

Track remaining work and evidence by priority in the [project checklist](docs/PROJECT_CHECKLIST.md). For new agents, the [handoff guide](docs/AGENT_HANDOFF.md) explains the project context and workflow.

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
4. Start the complete local demo, including the API, dashboard, 100,000-vehicle seed, and live simulator:

   ```bash
   bash scripts/start_demo.sh
   ```

   First start builds images and generates/loads data, which can take several minutes. The script skips data generation when valid 100,000-row files are already present, then starts the changing telemetry stream. Open `http://localhost:3000` after it completes. The app refreshes fleet metrics and locations every five seconds.

To start the already-built services in the background later, use `docker compose up -d`. To stop background services, use `docker compose down` from the same repository folder.

The local Compose profile is an unauthenticated demo intended for a developer machine only. To use the secured API mode, set `FLEET_SECURITY_ENABLED=true` and `OIDC_ISSUER_URI` to your OIDC provider's issuer URL, then restart Compose. The identity provider must issue access tokens with a `tenant_id` claim and the `fleet.read` or `fleet.ingest` scope as appropriate. Protected API calls require `Authorization: Bearer <access-token>`. The dashboard currently targets the local demo profile; wiring interactive OIDC sign-in requires the chosen provider's client ID and redirect configuration.

The local dashboard uses a fixed workspace for the generated 100,000-vehicle fleet; you do not need to type a tenant ID. The simulator streams synthetic data. It is clearly a local simulation and does not connect to real vehicles.

The initial snapshot may have no alerts until a vehicle reports continuous idling. To create a deterministic idling alert, leave the services running, open Terminal in the repository folder, and run:

```bash
bash scripts/demo.sh
```

The script submits two synthetic stationary events six minutes apart to the generated fleet and waits up to 10 seconds for the consumer to make the alert visible; it does not use real vehicle data.

If you want to change local settings, create the optional environment file before starting Docker:

```bash
cp .env.example .env
```

The optional `.env` copy is only needed if you want to customize settings; defaults work for local development. The API is available at `http://localhost:8080`, and readiness is at `/actuator/health/readiness`. Submit a telemetry event to `POST /v1/telemetry`, then read it back with `GET /v1/telemetry?tenant_id=tenant-00&vehicle_id=vehicle-000001`. The dashboard overview uses `GET /v1/fleet/overview?tenant_id=tenant-00`, `GET /v1/vehicles?tenant_id=tenant-00`, and `GET /v1/alerts?tenant_id=tenant-00`.

The local Fuel page calls `POST /v1/fuel/simulate-refuelling?tenant_id=tenant-100k` when its trigger is pressed. The API chooses a random batch equal to 0.1% of vehicles with reported state (minimum 1; capped at 500) and persists fill records. `GET /v1/fuel/summary?tenant_id=tenant-100k` and `GET /v1/fuel/purchases?tenant_id=tenant-100k` power the live totals and recent-fill table. Demo prices are fixed assumptions, not live pump-price data.

Example request:

```bash
curl -i http://localhost:8080/v1/telemetry \
  -H 'Content-Type: application/json' \
  -d '{"event_id":"sample-001","tenant_id":"tenant-00","vehicle_id":"vehicle-000001","observed_at":"2026-09-30T10:00:00Z","latitude":12.9716,"longitude":77.5946,"speed_kmh":0,"engine_on":true,"sequence":1}'
```

The API returns `202 Accepted` only after Kafka acknowledges the event; the response means `queued`, not yet written to PostgreSQL. A partition key of `tenant_id:vehicle_id` keeps one vehicle's stream on one partition. The consumer persists events and evaluates alerts, with PostgreSQL uniqueness protecting against duplicate delivery. Once consecutive event timestamps show an engine-on vehicle stationary for at least `IDLE_ALERT_SECONDS`, the API consumer opens an explainable idling alert; later movement resolves it. List a tenant's alerts with `GET /v1/alerts?tenant_id=tenant-00`. History and alert queries are limited to 500 rows. Hosted API mode validates OIDC JWTs, scopes, and tenant claims; local Compose explicitly disables authentication for demo use only. The dashboard has no interactive hosted login yet.

Local Kafka stores seven days of topic data across 12 partitions. For a replay of retained events, stop the API consumer, reset its group offset, then start it again. PostgreSQL's event ID uniqueness makes reprocessed events safe from duplicate inserts. The local broker is a single instance with replication factor 1; a shared environment must use a multi-broker cluster with replication factor 3 and minimum in-sync replicas 2 to remove that broker as a single point of failure. The local setup uses plaintext Kafka and is not production-secure.

The sample password in `.env.example` is for a local demonstration only. Use a managed secret for any shared or deployed environment. `docker compose down` stops the services; `docker compose down -v` also removes the local database volume and its data.

The overview only counts vehicles that have sent telemetry; it is not a registered-vehicle inventory. A vehicle is shown as moving or idling only when an engine-on event has arrived within five minutes. Engine-off vehicles and vehicles with stale telemetry are called out separately. Coordinates are displayed as reported by the vehicle; a map/geocoding provider is not connected. Drivers, Routes & Dispatch, and Maintenance remain sample-data previews. Fuel refuelling records are persisted in PostgreSQL; they are generated by a demo trigger with fixed prices and synthetic quantities. Potential CO₂ is an estimate based on fuel purchased, not directly measured tailpipe emissions. Analytics and Reports return hourly telemetry aggregates from ClickHouse; the latest recorded 37-hour query took about 0.2 seconds after aggregation optimization. This local request timing is not a challenge-scale performance result. The separate fuel figure for idling alerts remains an assumption-based estimate, not measured savings.

To generate the fleet again, open **Terminal** in the project folder and run:

```bash
bash scripts/generate_dataset.sh
```

This uses Docker to run the Python generator, so you do not need to install Python. It writes exactly 100,000 vehicle catalog rows and 100,000 base events (plus intentional duplicate-delivery examples) for the `tenant-100k` workspace under `data/`. Compressed `.gz` snapshots are kept in `data/`; uncompressed JSONL files are ignored by Git. `scripts/load_dataset.sh` publishes the events to Kafka for normal database processing. To keep positions changing independently, start Compose with `--profile live-simulator`; change its rate with `SIMULATOR_EVENTS_PER_SECOND` in `.env`. No data collection from physical vehicles is performed.

## Repository map

```text
.
├── docs/                 # Project brief, architecture, handoff guide, and decisions
├── backend/              # Spring Boot API and PostgreSQL migrations
├── frontend/             # React and TypeScript operations dashboard
├── src/fleetpulse/       # Python synthetic data generator
├── scripts/              # 100K data generation/loading and live simulator
├── Dockerfile            # Multi-stage Java API container
├── infra/clickhouse/     # ClickHouse analytics schema and Kafka ingestion setup
├── compose.yaml          # Kafka + API + PostgreSQL + ClickHouse + dashboard local stack
└── data/                 # Generated local data (git-ignored)
```

## Configuration

| Variable | Default | Meaning |
|---|---:|---|
| `API_PORT` | `8080` | Host port for the API |
| `POSTGRES_PORT` | `5432` | Host port for local database access |
| `KAFKA_PORT` | `9092` | Local Kafka broker port |
| `CLICKHOUSE_USER` | `fleetintel` | Local ClickHouse HTTP/client user |
| `CLICKHOUSE_PASSWORD` | local example value | Local-only ClickHouse password; replace for shared deployments |
| `POSTGRES_DB` | `fleetintel` | Local database name |
| `POSTGRES_USER` | `fleetintel` | Local database user |
| `POSTGRES_PASSWORD` | local example value | Local-only password; replace for shared deployments |
| `IDLE_ALERT_SECONDS` | `300` | Stationary engine-on duration before an idling alert opens |
| `IDLE_CRITICAL_SECONDS` | `900` | Stationary duration before an open idling alert escalates to critical |
| `FUEL_LITRES_PER_IDLE_HOUR` | `1.5` | Illustrative fuel-burn assumption used in alert estimates |
| `KAFKA_TOPIC_PARTITIONS` | `12` | Partition count for the telemetry topic |
| `KAFKA_TOPIC_REPLICATION_FACTOR` | `1` | Local replication factor; use 3 for a three-broker cluster |
| `KAFKA_TOPIC_MIN_ISR` | `1` | Required in-sync replicas; use 2 with replication factor 3 |
| `KAFKA_CONSUMER_CONCURRENCY` | `4` | Kafka listener threads |
| `KAFKA_MAX_POLL_RECORDS` | `500` | Maximum records returned in one consumer poll |
| `KAFKA_RETRY_ATTEMPTS` | `5` | Maximum total processing attempts before dead-letter routing |
| `KAFKA_PRODUCER_ACK_TIMEOUT_MS` | `2000` | Maximum HTTP wait for a broker acknowledgement |
| `SIMULATOR_EVENTS_PER_SECOND` | `5` | Conservative local synthetic live-stream rate; not a challenge-scale performance claim |
| `FLEET_SECURITY_ENABLED` | `false` in local Compose | Enable OAuth2/OIDC JWT validation; set true outside local demo |
| `OIDC_ISSUER_URI` | unset | OIDC issuer URL required when API security is enabled |

Fuel-use assumptions are illustrative and must be calibrated with documented fleet-specific data before presenting savings as measured results.

## Next milestones

1. Capture final-release and observability evidence, and repeat functional evidence for the end-to-end simulator, API, dashboard, alerts, and Reports path. Current local product screenshots and limits are documented in `evidences/2026-10-01/screenshot-capture.md`.
2. Run coverage, load/soak, security, and failure-recovery tests; publish measured results without presenting local snapshots as target certification.
3. Configure hosted interactive OIDC login and production security/privacy controls.
4. Verify the new 3NF ownership migration on fresh and existing 100K databases; add C4 diagrams, SQL plan comparisons, cloud deployment, STRIDE, the completed solution PDF, and the five-minute demo video.

The latest backend optimization is commit `51192e36d674e890fedc360ac263bccc612b0285`; its GitHub Actions run passed. It stores each vehicle's latest reported coordinates and status in the runtime-state table, allowing fleet overview and vehicle-list queries to avoid rescanning telemetry history. The V4 migration is applied by the currently running API image. Local Maven is not required because the backend build runs in Docker/CI, but Maven is not available in the current shell.

On 2026-10-01, `npm run build`, the three simulator unit tests (`PYTHONPATH=src python3.12 -m unittest discover -s tests -v`), `docker compose config --quiet`, and `bash -n scripts/start_demo.sh` passed. The app and alert routes were visually inspected in a browser and the console had no warnings/errors. The dated build/test record is in [evidences/2026-10-01/build-and-simulator-tests.md](evidences/2026-10-01/build-and-simulator-tests.md). Dashboard and Alerts screenshots are now stored under `evidences/2026-10-01/` and embedded in Section 3.1 of the solution draft; their counts, capture times, and limitations are recorded in `screenshot-capture.md`.

See [the project brief](docs/PROJECT_BRIEF.md) and [architecture notes](docs/ARCHITECTURE.md).

For a complete continuation brief—including the challenge acceptance criteria, prior decisions, verified state, known gaps, and next steps for a new agent—read [the agent handoff guide](docs/AGENT_HANDOFF.md).

For the live priority list, completion status, and external dependencies, see the [project work checklist](docs/PROJECT_CHECKLIST.md).
