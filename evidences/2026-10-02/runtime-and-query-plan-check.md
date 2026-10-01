# Runtime and query-plan check

Date: 2026-10-02 01:36 IST (2026-10-01 20:06 UTC)

Environment: user's Mac, Docker Compose, local synthetic `tenant-100k` fleet. No containers were started or stopped during these checks. The API image was rebuilt and only the API container was replaced to apply the additive V7 alert-order index migration; PostgreSQL, Kafka, ClickHouse, dashboard, simulator, and their persistent volumes were preserved.

## Current runtime sample

- API readiness returned HTTP 200 with `{"status":"UP"}`; dashboard root returned HTTP 200.
- PostgreSQL, Kafka, and ClickHouse were healthy; all six Compose services were running, including the optional simulator.
- Flyway recorded V1–V7 as successful.
- At the database sample, PostgreSQL contained 2 tenants, 100,003 registered vehicle identities, 980,932 telemetry events, and 11,517 alert records. These counts are time-specific; the simulator continues to add events and alerts.
- The tenant overview endpoint returned HTTP 200 and 100,000 vehicles. The alert, vehicle-list, and analytics endpoints also returned HTTP 200.
- A single historical analytics request over a populated approximately 27-hour range returned 15 hourly rows in 0.690 seconds. This is one local request sample, not a latency distribution or load test.

## Alert-list query plan before and after V7

V7 adds `fleet_alerts_tenant_list_order_idx`, whose expression keys match the tenant-scoped ordering used by the Alerts API (open first, newest event, then critical/warning priority and idle duration).

The exact same alert list query, projection, tenant, 100-row limit, and database snapshot were run with `EXPLAIN (ANALYZE, BUFFERS)`. To reproduce the previous plan after the index existed, index and bitmap scans were disabled for the baseline statement; they were reset before measuring the indexed query.

| Plan | Planner path | Rows scanned/returned | Execution time | Buffers |
|---|---|---:|---:|---:|
| Before-equivalent | Sequential scan of 11,517 alerts + top-N sort | 11,517 / 100 | 12.910 ms | 267 shared hits |
| After V7 | `fleet_alerts_tenant_list_order_idx` index scan | 100 / 100 | 0.100 ms | 64 shared hits |

This is a single warm-cache query-plan comparison on the local demo database. It supports the index choice but does not establish API p95/p99 or production performance. V7 was applied by restarting only the API; readiness returned UP afterward and the existing data counts remained present.

## Other representative PostgreSQL plans

The overview query scanned the 100,000-row runtime projection and aggregated open-alert severity. It completed in 82.143 ms in one `EXPLAIN ANALYZE` sample; PostgreSQL used the existing partial open-alert index and a hash join. A full-fleet count needs to visit the fleet projection, so this plan's sequential scan is expected. The tenant vehicle page returned the newest 200 rows through `vehicle_runtime_state_tenant_latest_idx` in 0.461 ms in one warm-cache plan sample; the correlated open-alert count used the partial alert index. These are current-plan observations only; no comparable before/after change was made for these two statements.

ClickHouse `EXPLAIN indexes=1` on the hourly rollup query used the `tenant_id, bucket_start` primary key and pruned the month partitions and granules for the requested range. The execution selected 4 of 8 granules across 4 parts; this is plan evidence, not a benchmark.

## Challenge targets still not measured

- Sustained ingest throughput at 100,000 events/second and the 3x five-minute burst.
- Event loss, broker-to-consumer lag under load, end-to-end dashboard freshness, and critical-alert latency.
- API p95/p99 under a stated workload.
- Soak, failover, multi-node availability, 99.9% availability, and cloud deployment.
- Core code coverage percentage and complete security scan/chaos evidence.

The optional local simulator is configured at 5 events/second. That setting is not a measured throughput result. This check used read-only queries and GET requests after applying V7; it did not trigger fuel purchases, issue test telemetry, delete rows, or remove volumes.
