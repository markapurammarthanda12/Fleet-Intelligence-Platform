# Fleet Intelligence Platform — Architecture

## Current implemented architecture

```mermaid
flowchart LR
  SIM[Python synthetic simulator / API client] -->|validated JSON| API[Spring Boot ingestion API]
  API -->|acks=all, key tenant:vehicle| K[(Apache Kafka: 12 partitions, 7-day retention)]
  K -->|consumer group, bounded retries| CONSUMER[Telemetry consumer]
  CONSUMER -->|idempotent transaction| PG[(PostgreSQL telemetry_events)]
  CONSUMER -->|event-time rule| RULE[Explainable idle alert rule]
  RULE --> PG2[(PostgreSQL fleet_alerts and vehicle state)]
  K -. exhausted retries .-> DLT[(Kafka dead-letter topic)]
  PG --> QUERY[Bounded tenant and vehicle history query]
  PG2 --> UI[React operations dashboard]
  API --> READY[Actuator readiness endpoint]
```

Docker Compose defines the Spring Boot API, a local single-node Apache Kafka broker, PostgreSQL, and the React dashboard. The API validates a request and waits for its Kafka broker acknowledgement before returning `202 Accepted`. It partitions events by tenant and vehicle, uses idempotent producer settings with `acks=all`, and retains the main topic for seven days. A consumer group writes to PostgreSQL; the listener acknowledges a Kafka offset only after the database handler returns, while the database event key deduplicates redelivery. Processing failures use bounded exponential retry topics and route exhausted attempts to a dead-letter topic. The Python generator writes a seeded vehicle catalog and event stream as separate JSONL files, and automated tests verify 100,000 unique vehicle IDs and fleet-wide event coverage. Flyway creates telemetry, vehicle runtime state, and alert tables with bounded-query indexes. The API validates coordinates, speed, identifiers, and event time before publishing. A versioned event-time rule opens and resolves idling alerts with a documented fuel estimate; late events are stored but do not rewind live vehicle state. Alerts are `warning` when first opened and escalate to `critical` at `IDLE_CRITICAL_SECONDS` (900 seconds by default); open critical alerts appear first in API results. The dashboard filters alerts by tenant and vehicle, displays severity, and refreshes automatically. The new Kafka-backed stack and its end-to-end test are still awaiting verification. The local broker is not highly available; shared deployment needs a multi-broker configuration, TLS, access controls, and measured load evidence.

## Intended challenge architecture

```mermaid
flowchart LR
  VEH[Vehicle / OEM cloud] -->|MQTT or HTTPS| ING[Ingestion adapters]
  ING -->|validated canonical event| K[(Kafka)]
  K --> RT[Stream detection]
  RT --> PG[(PostgreSQL: tenants, vehicles, alerts)]
  RT --> TS[(Time-series / column store: telemetry)]
  RT --> OBJ[(Object storage: Parquet history)]
  API[Secure API] --> PG
  API --> TS
  API --> UI[Operations dashboard]
  OBJ --> BATCH[Batch analytics]
  BATCH --> PG
  OBS[Metrics, logs, traces] -.-> ING
  OBS -.-> RT
  OBS -.-> API
```

This target architecture is a design direction, not implemented infrastructure. The product is the Fleet Intelligence Platform; prolonged idling is its first demonstration workflow, not its full scope. The broader fleet domain includes tenant, fleet, vehicle, trip, maintenance, alert, and user records. Store choices and CAP trade-offs are recorded as provisional ADRs in `docs/adr/`.

## Container and deployment deliverable

The current `Dockerfile` packages the API using a multi-stage Java build, and `frontend/Dockerfile` builds the dashboard into an Nginx image. Compose now includes an Apache Kafka broker with persistent storage, PostgreSQL, API, and dashboard. The local broker is deliberately single-node and plaintext; the completed shared environment still needs multi-broker deployment, TLS, authentication and authorization, high-volume telemetry storage, cloud deployment configuration, and scale evidence. Production secrets must come from the deployment environment, not the local example file. The API is not yet protected by authentication or tenant authorization and is intended for local development only.

## Data and consistency direction

- Tenant, vehicle, user, and alert acknowledgement records: relational store with transactional consistency.
- Raw telemetry: the implemented Kafka topic is partitioned and retained for seven days; a time-series or columnar store remains a target for measured high-volume workloads.
- Historical aggregates: object storage in a columnar format for economical batch analysis.
- Cache and vector store: defer unless a measured access pattern or grounded natural-language workflow needs them.

## Capacity baseline from the brief

The case study estimates 100,000 vehicles at one event per second and approximately 1 KB per event: about 100,000 events/second and 8.6 TB/day before compression and down-sampling. The current platform has not been benchmarked at this load. The first load-test plan must include a 3x five-minute burst and report throughput, p95/p99 latency, error rate, and consumer lag.
