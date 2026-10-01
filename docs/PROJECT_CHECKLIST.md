# Fleet Intelligence Platform — Work Checklist

**Last updated:** 2026-10-01 (Asia/Kolkata)
**Repository:** https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform (main)
**Purpose:** Live, prioritized project status. Mark work complete only after checking the result and recording evidence. Older handoff entries are historical context.

## Completed and verified

- [x] Track project work in order. This checklist is in main as commit faa4b2f.
- [x] Review the CI failure for 6a4a082. It was caused by missing tenant/vehicle registration before dependent writes. Fix commit 97c160b has a passing CI run.
- [x] Map requirements to implementation and evidence. REQUIREMENTS_MATRIX.md shows what is implemented and what still needs proof; published in baf7882.
- [x] Synthetic 100,000-vehicle dataset and simulator. Reproducible generation and simulator tests confirm exactly 100,000 unique vehicles; generated data files stay out of Git.
- [x] End-to-end telemetry path. API validation/Kafka acknowledgement, Kafka consumer, PostgreSQL persistence, duplicate handling, late-event behavior, idling alerts, and dead-letter routing are implemented. CI covers the main event journey.
- [x] Working demo workflows. API-backed overview, vehicle list/detail, alerts, Analytics/Reports, and simulated refuelling are implemented. Fuel and CO2 values are labeled estimates.
- [x] Docker stack and CI configuration. Compose describes API, dashboard, PostgreSQL, Kafka, ClickHouse, and optional simulator. GitHub Actions builds/tests simulator, backend integration, and frontend.
- [x] 100K-safe ownership migration. V6 adds tenant-scoped vehicle ownership and composite keys; fresh-database integration and disposable 100K-row migration checks passed.
- [x] V6 ingestion compatibility. Ingestion registers tenant/vehicle identity before dependent writes; fix is on main.
- [x] Architecture decisions. Architecture and three ADRs are present; C4 and submission evidence refinements remain.

## Remaining work, in priority order

### P0 — Complete submission evidence and verify the current runtime

- [ ] Save dashboard and alerts screenshots. Capture the release candidate into evidences/2026-10-01/, link them from the evidence index, and record the tested commit/runtime. Browser-only viewing is not saved evidence.
- [ ] Verify V6 on the persistent Compose database. Inspect the active project/volume, then rebuild/restart only API/dashboard without removing volumes. Verify migration version, row counts, foreign keys, ingestion, overview, Alerts, Analytics/Reports, and rendering. Docker socket access is denied in this workspace; retry when available.
- [ ] Verify clean-clone one-command startup. Exercise bash scripts/start_demo.sh using a clean checkout and disposable database; document expected endpoints and preserve the user's database.
- [ ] Refresh handoff, README, and evidence index with current main/CI links and distinguish GitHub from this local project mirror.
- [ ] Complete and visually review the solution document using measured results only.

### P1 — Prove correctness, speed, security, and recovery

- [ ] Save representative SQL EXPLAIN (ANALYZE, BUFFERS) evidence and explain index/partition choices.
- [ ] Measure core test coverage (target 80% if required); add contract, acceptance, and security checks and publish reports.
- [ ] Measure throughput, event loss, consumer lag, ingest-to-dashboard and critical-alert latency, and API p95/p99. Test 100,000 events/second and a 3x five-minute burst if the available hardware can support it. Do not claim targets without measurement.
- [ ] Demonstrate broker/database interruption, retry, dead-letter inspection/replay, backlog recovery, and event counts.
- [ ] Complete STRIDE/threat model, audit controls, rate limits, retention/deletion/masking decisions, and hosted OIDC browser verification after identity-provider configuration.

### P2 — Deployment and final submission

- [ ] Create C4 context, container, and relevant component diagrams.
- [ ] Add cloud-agnostic deployment or selected cloud setup; remove single points of failure for the claimed topology and measure recovery/availability. Cloud account/configuration may need user input.
- [ ] Add reproducible simulator trips/faults, duplicates, out-of-order events, bursts, and volume presets.
- [ ] Finalize 3–5 ADRs with alternatives and trade-offs, including relational/stream/analytical storage rationale.
- [ ] Prepare demo of at most five minutes, attach measured evidence, close gaps, and create v1.0submission only after verifying release candidate.

## External/manual dependencies

- Docker Desktop must grant this workspace access to its Docker socket before persistent-stack checks can proceed. Current error: permission denied at ~/.docker/run/docker.sock.
- Cloud credentials/hosting choice and OIDC issuer/client details are needed only for real deployment and hosted sign-in.
- High-capacity performance targets must be measured on suitable hardware.

## Update rule

Work down this list. After each item, run the relevant check, link evidence or commit, and mark it complete. If blocked, record the concrete reason and continue with independent work.
