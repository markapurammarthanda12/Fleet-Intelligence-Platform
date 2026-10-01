# Bounded telemetry ingest smoke test

**Captured:** 2026-10-02 02:19 IST  
**Environment:** local Docker Compose, 8 Docker CPUs and 3.825 GiB memory limit; synthetic 100,000-vehicle catalog; live simulator stayed enabled at 5 events/second.  
**Scope:** short, low-rate functional/latency check. Not a capacity, burst, losslessness-under-load, or production benchmark.

## Procedure and result

Sent synthetic telemetry through `POST /v1/telemetry` using the API's snake_case event contract. Ran three 8-second stages, scheduled at 2, 5, and 10 test requests/second. A separate single-event payload check was also accepted. No services were restarted, no configuration was changed, and no Docker volumes were removed.

| Scheduled test rate | Test events accepted | HTTP errors | Measured accepted rate | API-to-Kafka acknowledgement p50 / p95 / p99 |
|---:|---:|---:|---:|---:|
| 2 events/s | 16 | 0 | 2.00 events/s | 24.41 / 34.80 / 34.80 ms |
| 5 events/s | 40 | 0 | 5.00 events/s | 18.06 / 24.58 / 25.27 ms |
| 10 events/s | 80 | 0 | 9.99 events/s | 29.83 / 40.49 / 43.91 ms |
| **Total** | **136** | **0** | — | — |

A read-only PostgreSQL check found all **136/136** ramp events persisted. For those rows, the measured delay from their `observed_at` timestamp to PostgreSQL's `ingested_at` timestamp was p50 **29.82 ms**, p95 **49.53 ms**, and p99 **51.79 ms**. One separate schema-confirmation event was also persisted, so this check added 137 synthetic rows in total to the existing demo database.

The first attempted harness payload used camelCase JSON and was rejected by request validation before queueing. PostgreSQL confirmed zero rows from that attempt. The harness was corrected to match the simulator's snake_case payload, then the run above completed with zero HTTP errors. This is a test-harness correction, not an application failure.

## Interpretation and limits

- This verifies that the local API accepted and persisted a short synthetic workload up to 10 test events/second, while the background simulator continued at 5 events/second.
- API acknowledgement means Kafka accepted the individual message; it is not dashboard delivery or alert creation. The PostgreSQL interval is one event-to-database hop only.
- The sample does **not** verify 100,000 events/second, the required 3x burst, sustained/soak behavior, no-loss behavior at target scale, p95/p99 at representative load, dashboard freshness, critical-alert latency, broker/pod recovery, high availability, or 99.9% availability.
- The existing laptop's Docker memory budget is about 3.8 GiB, with ClickHouse already using about 1.6 GiB at the pre-test snapshot. A target-scale run was not attempted on this shared persistent demo stack.
- Data was appended, not cleaned up: 136 ramp events plus one schema-confirmation event. Existing services and volumes remain running and intact.

## Required next test

Use a disposable, suitably sized environment and a reproducible load generator. Ramp toward 100,000 events/second, then sustain a 3x five-minute burst only if resources support it. Reconcile generator acknowledgements, PostgreSQL persistence, ClickHouse visibility, and dead-letter counts; record CPU/memory, Kafka lag, errors, p50/p95/p99 API time, event-to-dashboard freshness, and critical-alert delay. Separately test controlled broker/service failures and a multi-node deployment. Do not send target load to the persistent local demo stack.
