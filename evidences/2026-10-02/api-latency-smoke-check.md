# API latency and live-ingest smoke check

**Captured:** 2026-10-02 02:08 IST  
**Environment:** local Docker Compose on one developer machine; existing synthetic fleet; simulator remained at its configured 5 events/second.  
**Purpose:** verify that the stack is reachable and establish an unloaded/local smoke baseline. This is not the hackathon performance benchmark.

## Runtime state

All six Compose services were running at inspection: API, dashboard, PostgreSQL, Kafka, ClickHouse, and the live simulator. PostgreSQL, Kafka, and ClickHouse reported healthy. The API readiness endpoint and dashboard were reachable. No container was stopped, restarted, or reconfigured during this check.

## Read-only API sample

Twenty sequential requests were sent to each endpoint while the simulator continued at 5 events/second. Responses were HTTP 200. Values below are wall-clock request times observed from the host; p95/p99 are empirical order statistics from only 20 samples and have no benchmark confidence.

| Endpoint | Requests | Median | Observed p95 / p99 | Response bytes |
|---|---:|---:|---:|---:|
| `/actuator/health/readiness` | 20 | 2.96 ms | 57.94 / 57.94 ms | 15 |
| `/v1/fleet/overview?tenant_id=tenant-100k` | 20 | 52.86 ms | 111.89 / 111.89 ms | 267 |
| `/v1/vehicles?tenant_id=tenant-100k&limit=10` | 20 | 2.37 ms | 10.59 / 10.59 ms | 1,998 |
| `/v1/alerts?tenant_id=tenant-100k&limit=10` | 20 | 1.92 ms | 8.15 / 8.15 ms | 3,817 |

An independent read-only PostgreSQL count observed 300 telemetry events in the preceding 60 seconds (5.00 events/second), matching the configured simulator rate.

## What this verifies

- The current local services are reachable and healthy enough to answer the sampled requests.
- At this moment, the small sequential API sample was below the brief's individual-request latency limits (p95 < 200 ms, p99 < 500 ms).
- The live simulator is producing about 5 events/second, not 100,000 events/second.

## What it does not verify

- This 20-request-per-endpoint smoke sample is not a representative sustained-load test. Its empirical p95/p99 cannot be used as acceptance proof for the brief's API target.
- It does not verify 100K events/second ingest, a 3x burst, dashboard freshness < 2 s, critical alert < 5 s, losslessness, consumer lag under load, soak, resilience, recovery, HA, or 99.9% availability.
- It was run on the local single-machine Compose stack, with synthetic data and an active simulator; results do not predict cloud or production behavior.
- No test wrote additional telemetry or changed the persistent Docker data.

## Next verification step

Run a repeatable load test against a disposable environment, with a bounded ramp to the target and 3x burst, and collect accepted/rejected counts, throughput, API p50/p95/p99, event-to-dashboard and event-to-alert latency, Kafka consumer lag, and database resource use. Do not direct a 100K events/second test at the persistent demo stack.
