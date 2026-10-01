# Local stack check

Date: 2026-10-01 (Asia/Kolkata)

Environment: user's Mac, Docker Compose project g-p-6abc7b38f4c0819198e720f8919cbd8c, synthetic tenant-100k fleet, local dashboard at http://localhost:3000.

## Results

- Docker Desktop Engine was running. All six Compose services were running: API, dashboard, PostgreSQL, Kafka, ClickHouse, and live simulator. PostgreSQL and Kafka health checks were healthy; ClickHouse was healthy in the earlier check.
- Before the API rebuild, a read-only PostgreSQL query showed Flyway V1–V5. Rebuilt the API image from this workspace and recreated only the API container. PostgreSQL and its persistent volume, dashboard, Kafka, ClickHouse, and simulator were left intact.
- After API restart, Flyway V1–V6 succeeded. PostgreSQL retained 100,003 vehicle rows, 2 tenant rows, and 945,452 telemetry event rows. V6 tenant-scoped foreign keys were present for telemetry events, runtime state, fleet alerts, fuel purchases, and vehicles.
- GET /actuator/health returned HTTP 200 with status UP and liveness/readiness groups.
- GET /v1/fleet/overview?tenant_id=tenant-100k returned HTTP 200 and vehicles_seen: 100000.
- After migration and API replacement, Dashboard, Alerts, Analytics, and Reports rendered from the running local services. Dashboard counts and latest signals continued updating. At about 19:12 IST, the dashboard showed 100,000 vehicles, 837 healthy, 97,558 warning, and 1,605 critical; newest telemetry timestamps were 19:12. These synthetic values change as the simulator runs.
- Analytics loaded telemetry-derived KPIs and hourly trend data. At about 19:18 IST it showed 10,060 km estimated distance, 1,006 L estimated fuel, 87.6% utilization, and 2.7 t estimated CO2. Estimates are labeled and are not sensor or odometer readings.
- Reports loaded hourly ClickHouse data: 918,920 unique events, 100,000 peak vehicles/hour, 114,138 idling samples, and 804,782 moving samples for the selected range; CSV export was enabled.
- docker compose ps confirmed the services belong to this workspace's Compose project and PostgreSQL uses a named persistent volume. No volume was removed.

## Interpretation and limits

The local simulator is configured at 5 events/second. It cannot refresh all 100,000 seeded vehicles within the five-minute freshness window, so most old signals become Warning. This check confirms local availability, the V6 migration, and synthetic-data page rendering only. It is not a throughput, end-to-end latency, soak, data-loss, high-availability, or cloud-deployment test. The 100K events/second, 3x burst, p95/p99 API, ingest-to-dashboard, critical-alert, 80% coverage, and 99.9% availability targets remain unverified.

## Reproducibility

Run bash scripts/start_demo.sh to build and start Compose, wait for API readiness, generate the 100,000-vehicle seed if needed, preserve an already populated fleet, wait for the fleet snapshot, and start the live simulator. The clean-clone path has not yet been exercised against an empty disposable database.

No screenshot image file was captured during this runtime check. Capture Dashboard and Alerts screenshots separately before marking that evidence item complete.
