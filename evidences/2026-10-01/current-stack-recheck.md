# Current stack recheck

Date: 2026-10-01 (Asia/Kolkata)

## Read-only runtime checks

- Docker Compose lists the API, dashboard, PostgreSQL, Kafka, ClickHouse, and live simulator as running. PostgreSQL, Kafka, and ClickHouse reported healthy.
- API readiness returned `{"status":"UP"}`.
- The dashboard root returned HTTP 200.
- The tenant overview returned 100,000 vehicles. At this sample, health counts were 888 healthy, 97,496 warning, and 1,616 critical. Counts change as synthetic telemetry arrives.
- No containers were rebuilt or restarted and no database state was changed during these checks.

## Source checks

- `docker compose config --quiet`: passed.
- `npm run build` in `frontend/`: TypeScript and Vite production build passed.
- Python simulator unit tests: 3 passed using the bundled Python 3.12 runtime.

## Limits and pending checks

This confirms a healthy local synthetic demo and successful source builds only. It does not measure throughput, API p95/p99, end-to-end alert or dashboard latency, data loss, soak behavior, failover, availability, cloud deployment, or coverage percentage. The clean-clone one-command startup has not been run because this task has no disposable empty database stack and using the persistent database for that test would risk altering the user's data. The Dashboard and Alerts screenshot files are still pending; see the placeholder guides in this directory.
