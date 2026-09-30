# Fleet Intelligence Platform

The Fleet Intelligence Platform turns connected-vehicle data into trustworthy, explainable fleet decisions. It brings together vehicle activity, trips, health signals, operational alerts, and cost insights so fleet teams can see what is happening and decide what to do. Prolonged idling is the first example workflow used to prove the end-to-end system; it is not the product's full scope. Later workflows can cover maintenance risk, utilisation, safety, and fleet-wide reporting. This repository is the starting MVP for the Motorq connected-vehicle hackathon; it uses synthetic data and has no affiliation with Motorq.

## Current implementation

- A Java 21 / Spring Boot API validates connected-vehicle telemetry and publishes it to a partitioned Kafka topic; a consumer persists events and evaluates idling alerts in PostgreSQL.
- PostgreSQL uniqueness on `(tenant_id, event_id)` makes retries idempotent; duplicate submissions are acknowledged without a second row.
- The Python simulator produces a repeatable 100,000-record synthetic vehicle catalog and synthetic events with delayed and duplicate deliveries.
- Docker Compose runs Apache Kafka, the API, PostgreSQL, and an operator dashboard, with persistent broker/database volumes and service health checks.
- The API exposes readiness through Spring Boot Actuator and supports bounded telemetry history queries.
- Idling alerts escalate from `warning` to `critical` after 15 minutes by default and are returned with open, critical alerts first. This is a demo policy configurable with `IDLE_CRITICAL_SECONDS`.

## Hackathon deliverables and current status

| Deliverable | Current status | What remains |
|---|---|---|
| Dockerized, portable system | GitHub Compose configuration and Kafka-backed tests pass; local Compose rebuild started but service health remains unverified | Confirm the refreshed stack on the Mac and add deployment profiles and cloud portability evidence |
| Real-time ingestion and alerting | The API waits for Kafka broker acknowledgement; keyed consumer persists idempotently, retries failures, and routes exhausted retries to a dead-letter topic | Measure end-to-end latency and burst behavior at challenge scale; test dead-letter replay |
| Relational and high-volume data | PostgreSQL telemetry, vehicle state, and alert tables are implemented | Add fleet metadata and a high-volume telemetry store after measuring workload |
| User interface | Local dashboard with tenant and vehicle filters and automatic refresh | Add alert acknowledgement and authenticated API access |
| Security, tests, and observability | Five Kafka/PostgreSQL API integration tests, simulator coverage tests, and the production dashboard build pass in GitHub Actions; a retained-log replay scenario has been added and awaits CI | Measure core coverage; add tenant-aware access controls, security checks, and metrics/logs/traces |
| Performance targets | Not measured | Load test target throughput and burst behavior; report measured latency, loss/error rate, and lag |

Docker is part of the deliverable. Compose defines the API, single-node local Apache Kafka broker, PostgreSQL, dashboard, persistent volumes, and health checks. A rebuild was started from Docker Desktop; it was still in the Maven dependency step at last observation, so service health is not verified. This is not a claim of cloud portability, high availability, or challenge-scale performance.

The generator can create exactly 100,000 synthetic vehicle records. Generating at least 100,000 base telemetry events distributes at least one event to every generated vehicle. This proves deterministic dataset generation only; it does not claim that the current API sustains the challenge's 100,000 events/second target.

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

5. Open `http://localhost:3000` in a browser. The first start downloads the Java, Node, and Kafka images and can take several minutes. Leave the Terminal window open while using the app. Press `Control + C` there to stop it.

To start the already-built services in the background later, use `docker compose up -d`. To stop background services, use `docker compose down` from the same repository folder.

The dashboard starts with no alerts because the database is empty. To create a synthetic idling alert for the demo, leave the services running, open a second Terminal window in the repository folder, and run:

```bash
bash scripts/demo.sh
```

Then set the dashboard's **Fleet / tenant** field to `tenant-demo`. The script submits two synthetic stationary events six minutes apart and waits up to 10 seconds for the consumer to make the alert visible; it does not use real vehicle data.

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

The API returns `202 Accepted` only after Kafka acknowledges the event; the response means `queued`, not yet written to PostgreSQL. A partition key of `tenant_id:vehicle_id` keeps one vehicle's stream on one partition. The consumer persists events and evaluates alerts, with PostgreSQL uniqueness protecting against duplicate delivery. Once consecutive event timestamps show an engine-on vehicle stationary for at least `IDLE_ALERT_SECONDS`, the API consumer opens an explainable idling alert; later movement resolves it. List a tenant's alerts with `GET /v1/alerts?tenant_id=tenant-00`. History and alert queries are limited to 500 rows. Authentication and tenant authorization are not implemented yet, so the API is for local development only.

Local Kafka stores seven days of topic data across 12 partitions. For a replay of retained events, stop the API consumer, reset its group offset, then start it again. PostgreSQL's event ID uniqueness makes reprocessed events safe from duplicate inserts. The local broker is a single instance with replication factor 1; a shared environment must use a multi-broker cluster with replication factor 3 and minimum in-sync replicas 2 to remove that broker as a single point of failure. The local setup uses plaintext Kafka and is not production-secure.

The sample password in `.env.example` is for a local demonstration only. Use a managed secret for any shared or deployed environment. `docker compose down` stops the services; `docker compose down -v` also removes the local database volume and its data.

To generate a full 100,000-vehicle synthetic dataset locally, open **Terminal** in the project folder and run:

```bash
bash scripts/generate_dataset.sh
```

This uses Docker to run the Python generator, so you do not need to install Python. It writes 100,000 synthetic vehicle-catalog rows plus a repeatable telemetry sample covering those vehicle IDs under the project's `data/` folder. The event file may contain a few extra rows because it deliberately includes duplicate deliveries. Pass generator options after the script name, such as `--seed 7`, to change deterministic inputs. These generated files are local and are not checked into Git. To generate a smaller sample, use Python 3.11 or later after running `python -m pip install -e .` from the project folder.

## Repository map

```text
.
├── docs/                 # Project brief, architecture, and decisions
├── backend/              # Spring Boot API and PostgreSQL migrations
├── frontend/             # React and TypeScript operations dashboard
├── src/fleetpulse/       # Python synthetic data generator
├── Dockerfile            # Multi-stage Java API container
├── compose.yaml          # Kafka + API + PostgreSQL + dashboard local stack
└── data/                 # Generated local data (git-ignored)
```

## Configuration

| Variable | Default | Meaning |
|---|---:|---|
| `API_PORT` | `8080` | Host port for the API |
| `POSTGRES_PORT` | `5432` | Host port for local database access |
| `KAFKA_PORT` | `9092` | Local Kafka broker port |
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

Fuel-use assumptions are illustrative and must be calibrated with documented fleet-specific data before presenting savings as measured results.

## Next milestones

1. Verify local compose behavior and add alert acknowledgement, authentication, and tenant-aware authorization.
2. Add multi-broker deployment, dead-letter replay tooling, and a justified high-volume telemetry store.
3. Add observability and reproducible scale evidence for the hackathon targets.

See [the project brief](docs/PROJECT_BRIEF.md) and [architecture notes](docs/ARCHITECTURE.md).
