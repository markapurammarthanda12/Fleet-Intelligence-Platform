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
- [x] **Architecture diagrams and decision notes.** Eight diagrams, including C4 context/container, event flow, post-V6 ownership ER, deployment, service layers, and two sequences, are embedded in the solution draft and listed in [`DIAGRAMS.md`](DIAGRAMS.md). Four ADRs cover product scope, Kafka, ClickHouse analytics, and consistency/retention.
- [x] **Improve and measure the live Alerts query.** Flyway V7 adds a tenant-scoped expression index matching the Alerts API priority ordering. On the persistent local database, the exact same 100-row query used a sequential scan plus top-N sort in 12.910 ms before-equivalent and an index scan in 0.100 ms after V7 (one warm-cache `EXPLAIN ANALYZE` sample). API readiness remained UP and the existing volumes were preserved. See [`runtime-and-query-plan-check.md`](../evidences/2026-10-02/runtime-and-query-plan-check.md).
- [x] **Document STRIDE risks and current controls.** [`SECURITY_THREAT_MODEL.md`](SECURITY_THREAT_MODEL.md) identifies assets, trust boundaries, six STRIDE categories, implemented controls, and gaps; this is a design review, not proof those controls are deployed or penetration-tested.
- [x] **Document event algorithms and capacity arithmetic.** [`ALGORITHMS_AND_CAPACITY.md`](ALGORITHMS_AND_CAPACITY.md) records pseudocode, complexity, CAP/retention choices, and official-brief volume estimates, explicitly separating arithmetic/design from measured capacity.

## Remaining work, in priority order

### P0 — Make the submission evidence complete and the current runtime safe

- [x] **Capture product screenshots.** The working local synthetic Dashboard and Alerts pages were captured on 2026-10-01, saved under [`evidences/2026-10-01/`](../evidences/README.md), and inserted in Section 3.1 of the solution draft. These are functional product screenshots, not performance or observability evidence. Capture final-release screenshots again after final UI changes.
- [ ] **Verify the clean-clone, one-command demo.** Exercise `bash scripts/start_demo.sh` from a clean checkout/empty disposable database and document expected endpoints. It was not run against the persistent database; a separate empty stack would duplicate the database, broker, analytics service, and 100K seed load on this machine. Keep the persistent volume untouched.
- [x] **Refresh handoff and README from the latest runtime.** The handoff and README distinguish the 2026-10-01 persistent local Compose checks from GitHub CI, screenshots, and the unverified clean-clone/load/availability requirements.
- [ ] **Complete the solution document.** The working draft contains the product screenshots and architecture diagrams, with unresolved user-editable fields highlighted yellow. Finish the remaining team, validation, benchmark, security, testing, demo, declarations, and final-release evidence fields; visually inspect the final Word/PDF export. User-provided template/PDF copies are reference material; the user's requests determine the project choices.

### P1 — Demonstrate correctness, speed, security, and recovery

- [ ] **Complete query-plan evidence.** One before/after alert-list plan is recorded; current overview (82.143 ms), 200-vehicle page (0.461 ms), and ClickHouse partition-pruning plans are also recorded. Capture a genuine before/after improvement for the other key queries; do not report the forced old plan as a historical pre-change run.
- [ ] **Raise and report test coverage.** Add meaningful unit, contract, acceptance, and security checks; measure core coverage and target at least 80% where the challenge requires it. Keep coverage reports as evidence.
- [ ] **Run realistic performance and soak tests.** Measure throughput, event loss, consumer lag, ingest-to-dashboard latency, critical-alert latency, and API p95/p99. Include 100,000 events/second and a 3× five-minute burst if the available test environment can support it. Do not claim a target passed until measured.
- [ ] **Test failure and recovery behavior.** Demonstrate broker/database interruption, retry and dead-letter inspection/replay, backlog recovery, and no event loss under the selected test conditions.
- [ ] **Implement and verify security/privacy controls.** The STRIDE review and retention/masking decisions are documented. Still implement/verify audit logging, rate limits, TLS/mTLS, location masking, deletion/retention workflows, security scans, and hosted browser OIDC when an issuer/client is configured. Local demo mode is not production security.

### P2 — Deployment and final submission

- [x] **Create the architecture diagram set.** The current repository includes C4 context/container plus event flow, tenant/vehicle ER, deployment, layers, and failure/alert sequences. Keep it aligned with implementation as the system changes.
- [ ] **Prove deployment and availability.** Add infrastructure/deployment configuration for a selected cloud or a credible cloud-agnostic target, remove single points of failure for the demonstrated topology, and measure recovery/availability. Credentials or provider setup may require the user.
- [ ] **Complete simulator scenarios.** Add reproducible bursts, duplicates, out-of-order events, faults/trips, and documented volume presets without committing large generated datasets.
- [x] **Finalize 3–5 ADRs** with alternatives and trade-offs; four records cover product scope, messaging, analytical storage, and the CAP/retention choice.
- [ ] **Prepare demo and release package.** Record the requested short demo, attach measured evidence, resolve checklist gaps, and create the submission tag only after the release candidate is verified.

## External/manual dependencies

- Docker Desktop is currently available through the app and Docker Engine. The shell could query and update this Compose project during the 2026-10-01 verification. If later sessions cannot reach `~/.docker/run/docker.sock`, use Docker Desktop or restore socket access before changing runtime state.
- Cloud credentials/hosting choice and OIDC issuer/client details are needed only for real deployment and hosted browser sign-in; do not invent these values.
- Any hackathon metric that depends on dedicated high-capacity hardware must be measured on that hardware or reported as unverified.

## Update rule

Work down the priorities in order. After each item, run the relevant check, link the evidence or commit, and mark it complete here. If an item is blocked, record the concrete blocker and continue with independent work.
