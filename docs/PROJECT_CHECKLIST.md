## Current update — 2026-10-01

- [x] Persistent local database migrated to V6; API readiness and Dashboard, Alerts, Analytics, Reports verified with live synthetic data. See [runtime evidence](../evidences/2026-10-01/local-stack-check.md).
- [x] GitHub evidence index and dated runtime note published. See [evidence index](../evidences/README.md).
- [ ] Save actual Dashboard and Alerts screenshot files. Placeholder guides now reserve dashboard-overview.jpg and alerts.jpg under evidences/2026-10-01; the image files still need to be captured and linked.
- [ ] Verify clean-clone startup on a disposable empty database.
- [x] README and agent handoff refreshed on GitHub with current V6/runtime results and links to the checklist and evidence.

---

# Fleet Intelligence Platform — Work Checklist

**Last updated:** 2026-10-01 (Asia/Kolkata)  
**Repository:** [Fleet-Intelligence-Platform](https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform) (`main`)  
**Purpose:** A live, prioritized checklist for continuing the hackathon project. Mark items complete only after checking the result and recording evidence. This file is the current status; older dated notes in the handoff are historical context.

## Completed and verified

- [x] **Track work in a prioritized checklist.** This checklist is committed on `main` in [`faa4b2f`](https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform/commit/faa4b2fa1166c368e26be9c42af55a3e5be7f68d) and is the single current task list. The failure notification for commit `6a4a082` was traced to missing tenant/vehicle registration before dependent telemetry writes; fix commit `97c160b` has a passing CI run.
- [x] **Map challenge requirements to implementation and evidence.** [`REQUIREMENTS_MATRIX.md`](REQUIREMENTS_MATRIX.md) records what is implemented, the available evidence, and what remains unproven.
- [x] **Synthetic 100,000-vehicle dataset and simulator.** Reproducible generation and simulator tests confirm exactly 100,000 unique vehicles. The synthetic data is clearly labeled and large generated files are kept out of Git.
- [x] **End-to-end telemetry path.** API validation and Kafka acknowledgement, Kafka consumer, PostgreSQL persistence, duplicate handling, late-event behavior, idling alerts, and dead-letter routing are implemented. GitHub Actions integration tests cover the main event journey.
- [x] **Useful demo workflows.** API-backed overview, vehicle list/detail, alerts, Analytics/Reports, and simulated refuelling are implemented. Fuel use and CO₂ are described as estimates.
- [x] **Dockerized local stack and CI.** Compose describes the API, dashboard, PostgreSQL, Kafka, ClickHouse, and optional live simulator. GitHub Actions builds/tests the simulator, backend integration, and dashboard.
- [x] **100K-safe ownership migration.** V6 creates tenant and tenant-scoped vehicle records, backfills existing data, and adds composite foreign keys. It passed a fresh-database integration run and a disposable 100K-row migration check.
- [x] **V6 ingestion compatibility and current CI.** Telemetry ingestion registers tenant/vehicle identities before dependent writes. Fix commit [`97c160b`](https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform/commit/97c160bf12a08605f8b74c0b54f2f3cb259df954) has a passing GitHub Actions run. Earlier migration-only run [`36866315876`](https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform/actions/runs/36866315876) failed because that compatible API code was not yet present; the failure is fixed on main.
- [x] **Architecture and decision notes.** Current architecture and three ADRs exist. These still need the C4 and evidence refinements listed below.
- [x] **Persistent local database migration.** On 2026-10-01, rebuilt and replaced only the API container in the confirmed Compose project. PostgreSQL and its volume, dashboard, Kafka, ClickHouse, and simulator remained intact. Flyway V1–V6 all succeeded. Counts after migration: 100,003 vehicles, 2 tenants, 945,452 telemetry events. Tenant-scoped foreign keys are present. API health returned HTTP 200/UP. Dashboard, Alerts, Analytics, and Reports rendered against live local synthetic data afterward; the 100,000-vehicle counts and telemetry timestamps continued to change. Details: [`local-stack-check.md`](../evidences/2026-10-01/local-stack-check.md).

## Remaining work, in priority order

### P0 — Make the submission evidence complete and the current runtime safe

- [ ] **Save evidence screenshots.** Dashboard and Alerts were visually inspected on 2026-10-01, and placeholder guides reserve the target filenames in `evidences/2026-10-01/`. The actual `dashboard-overview.jpg` and `alerts.jpg` files still need to be captured from the release candidate and recorded with commit/runtime details; placeholders are not evidence.
- [ ] **Verify the clean-clone, one-command demo.** Exercise `bash scripts/start_demo.sh` from a clean checkout/empty disposable database and document expected endpoints. It was not run against the persistent database; a separate empty stack would duplicate PostgreSQL, Kafka, ClickHouse, and the 100K seed load on this machine. Keep the persistent volume untouched.
- [ ] **Refresh handoff, README, and evidence status.** README and handoff point to this checklist and the requirements matrix, and the CI fix is linked. Refresh the evidence index and current runtime note to include the V6 verification above. Keep the local-project mirror and GitHub state clearly distinguished.
- [ ] **Complete the solution document.** Fill and visually inspect the provided Word template using only measured results. User-provided template/PDF copies are references, not instructions that override the user's requests. The requirement/evidence mapping is complete; the document itself remains pending.

### P1 — Demonstrate correctness, speed, security, and recovery

- [ ] **Measure query plans.** Save representative `EXPLAIN (ANALYZE, BUFFERS)` results for key fleet and analytics queries and explain index/partition choices.
- [ ] **Raise and report test coverage.** Add meaningful unit, contract, acceptance, and security checks; measure core coverage and target at least 80% where the challenge requires it. Keep coverage reports as evidence.
- [ ] **Run realistic performance and soak tests.** Measure throughput, event loss, consumer lag, ingest-to-dashboard latency, critical-alert latency, and API p95/p99. Include 100,000 events/second and a 3× five-minute burst if the available test environment can support it. Do not claim a target passed until measured.
- [ ] **Test failure and recovery behavior.** Demonstrate broker/database interruption, retry and dead-letter inspection/replay, backlog recovery, and no event loss under the selected test conditions.
- [ ] **Complete security/privacy design.** Add threat model/STRIDE, audit controls, rate limits, retention/deletion/masking decisions, and verify hosted OIDC browser login when an issuer/client is configured. Local demo mode is not production security.

### P2 — Deployment and final submission

- [ ] **Create a C4 architecture set** (context, container, and relevant component view) consistent with the code and deployment model.
- [ ] **Prove deployment and availability.** Add infrastructure/deployment configuration for a selected cloud or a credible cloud-agnostic target, remove single points of failure for the demonstrated topology, and measure recovery/availability. Credentials or provider setup may require the user.
- [ ] **Complete simulator scenarios.** Add reproducible bursts, duplicates, out-of-order events, faults/trips, and documented volume presets without committing large generated datasets.
- [ ] **Finalize 3–5 ADRs** with alternatives and trade-offs; ensure relational, stream, and analytical storage choices are justified against the requirements.
- [ ] **Prepare demo and release package.** Record the requested short demo, attach measured evidence, resolve checklist gaps, and create the submission tag only after the release candidate is verified.

## External/manual dependencies

- Docker Desktop is available through the app and Docker Engine. The shell could query and update this Compose project during 2026-10-01 verification. If later sessions cannot reach `~/.docker/run/docker.sock`, use Docker Desktop or restore socket access before changing runtime state.
- Cloud credentials/hosting choice and OIDC issuer/client details are needed only for real deployment and hosted browser sign-in; do not invent these values.
- Any hackathon metric that depends on dedicated high-capacity hardware must be measured on that hardware or reported as unverified.

## Update rule

Work down the priorities. After each item, verify its result, link evidence, and check it off here. If an item is blocked, record the concrete blocker and continue with independent work.
