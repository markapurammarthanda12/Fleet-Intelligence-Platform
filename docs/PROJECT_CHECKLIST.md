# Fleet Intelligence Platform — Work Checklist

**Last updated:** 2026-10-02 (Asia/Kolkata)  
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
- [x] **V6 ingestion compatibility and current CI.** Telemetry ingestion registers tenant/vehicle identities before dependent writes. Fix commit [`97c160b`](https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform/commit/97c160bf12a08605f8b74c0b54f2f3cb259df954) has a passing GitHub Actions run. Earlier migration-only run [`36866315876`](https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform/actions/runs/36866315876) failed because that compatible API code was not yet present; the failure is fixed on `main`.
- [x] **Verify the migrated local stack and core screens.** V1–V6 are applied on the persistent local database; API readiness, dashboard, Alerts, Analytics, and Reports were checked against the running 100,000-vehicle synthetic fleet. Values and limits are recorded in [`local-stack-check.md`](../evidences/2026-10-01/local-stack-check.md).
- [x] **Publish the dated runtime evidence and evidence index.** [`evidences/README.md`](../evidences/README.md) and [`2026-10-01/local-stack-check.md`](../evidences/2026-10-01/local-stack-check.md) are committed. Dashboard and Alerts screenshots have now been saved with capture metadata; see [`screenshot-capture.md`](../evidences/2026-10-01/screenshot-capture.md).
- [x] **Recheck the current local stack and source builds.** Compose configuration and frontend production build passed; the simulator suite passed all 3 tests; API readiness returned UP, the dashboard returned HTTP 200, and the fleet overview returned 100,000 vehicles. The read-only results and limitations are in [`current-stack-recheck.md`](../evidences/2026-10-01/current-stack-recheck.md).
- [x] **Architecture and decision notes.** Current architecture and three ADRs exist. These still need the C4 and evidence refinements listed below.

## Remaining work, in priority order

### P0 — Make the submission evidence complete and the current runtime safe

- [x] **Capture product screenshots.** The working local synthetic Dashboard and Alerts pages were captured on 2026-10-01, saved under [`evidences/2026-10-01/`](../evidences/README.md), and inserted in Section 3.1 of the solution draft. These are functional product screenshots, not performance or observability evidence. Capture final-release screenshots again after final UI changes.
- [ ] **Verify the clean-clone, one-command demo.** Exercise `bash scripts/start_demo.sh` from a clean checkout/empty disposable database and document expected endpoints. It was not run against the persistent database; a separate empty stack would duplicate the database, broker, analytics service, and 100K seed load on this machine. Keep the persistent volume untouched.
- [ ] **Refresh handoff and README from the latest runtime.** State that V6 is applied and core routes were checked; link to the new evidence note/index. Distinguish this local Docker run from GitHub CI and the local project mirror.
- [ ] **Complete the solution document.** The working draft contains the product screenshots and architecture diagrams, with unresolved user-editable fields highlighted yellow. Finish the remaining team, validation, benchmark, security, testing, demo, declarations, and final-release evidence fields; visually inspect the final Word/PDF export. User-provided template/PDF copies are reference material; the user's requests determine the project choices.

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

- Docker Desktop is currently available through the app and Docker Engine. The shell could query and update this Compose project during the 2026-10-01 verification. If later sessions cannot reach `~/.docker/run/docker.sock`, use Docker Desktop or restore socket access before changing runtime state.
- Cloud credentials/hosting choice and OIDC issuer/client details are needed only for real deployment and hosted browser sign-in; do not invent these values.
- Any hackathon metric that depends on dedicated high-capacity hardware must be measured on that hardware or reported as unverified.

## Update rule

Work down the priorities in order. After each item, run the relevant check, link the evidence or commit, and mark it complete here. If an item is blocked, record the concrete blocker and continue with independent work.
