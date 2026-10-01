# Verification evidence

This folder holds dated evidence that can be referenced from the hackathon solution document. Keep screenshots, logs, and test reports tied to the exact commit, environment, and run date. Do not present one local response-time sample as a load benchmark or target certification.

The current ordered work and evidence status is tracked in [the project checklist](../docs/PROJECT_CHECKLIST.md). The latest V6-compatible API fix is GitHub commit [`97c160b`](https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform/commit/97c160bf12a08605f8b74c0b54f2f3cb259df954); its CI run passed. The earlier migration-only CI failure is superseded by that fix, but remains part of the commit history.

## Evidence captured in this workspace

- `2026-10-01/local-stack-check.md` records the live Docker/API/dashboard checks and their limits.
- `2026-10-01/build-and-simulator-tests.md` records repeatable source-level validation.
- `2026-10-01/current-stack-recheck.md` records the latest read-only runtime and build checks.

Dashboard and Alerts were visually inspected in the running local app on 2026-10-01. The browser displayed both captures, but this environment could not save them as image files in the repository. The following placeholder guides reserve the filenames and explain what to capture; replace them with actual images before submission:

- [`dashboard-overview.placeholder.md`](2026-10-01/dashboard-overview.placeholder.md) → `dashboard-overview.jpg`
- [`alerts.placeholder.md`](2026-10-01/alerts.placeholder.md) → `alerts.jpg`

## Still required for the submission

- Reproducible load/soak results at 100,000 events/second and a 3x five-minute burst, with throughput, p95/p99, errors, lost events, and consumer lag.
- Critical-alert and ingest-to-dashboard end-to-end latency results.
- Broker/service failure-recovery results and a multi-node availability demonstration.
- Coverage, contract/acceptance, security scan, and chaos test reports.
- Query-plan evidence (`EXPLAIN ANALYZE` before and after optimization).
- Final system/observability screenshots captured against the release candidate.

Screenshots show the local synthetic demo only. They do not prove cloud deployment, real vehicle connectivity, or the performance targets.

The screenshot placeholder guides are organizational aids only; they are not screenshot evidence and should not be submitted as image files.
