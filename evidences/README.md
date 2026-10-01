# Verification evidence

This folder holds dated evidence that can be referenced from the hackathon solution document. Keep screenshots, logs, and test reports tied to the exact commit, environment, and run date. Do not present one local response-time sample as a load benchmark or target certification.

The current ordered work and evidence status is tracked in [the project checklist](../docs/PROJECT_CHECKLIST.md). The latest V6-compatible API fix is GitHub commit [`97c160b`](https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform/commit/97c160bf12a08605f8b74c0b54f2f3cb259df954); its CI run passed. The earlier migration-only CI failure is superseded by that fix, but remains part of the commit history.

## Evidence captured in this workspace

- `2026-10-01/local-stack-check.md` records the live Docker/API/dashboard checks and their limits.
- `2026-10-01/build-and-simulator-tests.md` records repeatable source-level validation.
- `2026-10-01/current-stack-recheck.md` records the latest read-only runtime and build checks.
- `2026-10-01/screenshot-capture.md` records the local app, capture time, viewport, counts, and interpretation limits for the images below.
- `2026-10-02/runtime-and-query-plan-check.md` records the latest Docker/API/database check and the V7 Alerts query-plan comparison.
- [`2026-10-01/dashboard-overview.jpg`](2026-10-01/dashboard-overview.jpg) shows the Overview page.
- [`2026-10-01/alerts.jpg`](2026-10-01/alerts.jpg) shows the Alerts page.

The screenshots are embedded in Section 3.1 of [`docs/Fleet_Intelligence_Solution_Document_DRAFT.docx`](../docs/Fleet_Intelligence_Solution_DRAFT.docx). They show a synthetic local demo only. The Alerts page reports 1,809 open records overall but displays 200 loaded rows; all 200 were Critical and 0 Warning at capture. This paginated snapshot does not establish that there were no warnings outside the loaded rows.

## Still required for the submission

- Reproducible load/soak results at 100,000 events/second and a 3x five-minute burst, with throughput, p95/p99, errors, lost events, and consumer lag.
- Critical-alert and ingest-to-dashboard end-to-end latency results.
- Broker/service failure-recovery results and a multi-node availability demonstration.
- Coverage, contract/acceptance, security scan, and chaos test reports.
- Comparable before/after `EXPLAIN ANALYZE` plans for the overview and vehicle/history/report queries. One warm-cache alert-list plan comparison and a ClickHouse partition-pruning plan are available in `2026-10-02/runtime-and-query-plan-check.md`.
- Final system/observability screenshots captured against the release candidate, including observability metrics not shown in these product screenshots.

The screenshots do not prove cloud deployment, real vehicle connectivity, performance targets, availability, or production security.
