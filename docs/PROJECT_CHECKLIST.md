# Fleet Intelligence Platform — Work Checklist

**Last updated:** 2026-10-01 (Asia/Kolkata)  
**Repository:** [Fleet-Intelligence-Platform](https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform) (main)  
**Purpose:** A live, prioritized checklist for continuing the hackathon project. Mark items complete only after checking the result and recording evidence. This file is the current status; older dated notes in the handoff are historical context.

## Completed and verified

- [x] **Synthetic 100,000-vehicle dataset and simulator.** Reproducible generation and simulator tests confirm exactly 100,000 unique vehicles. The synthetic data is clearly labeled and large generated files are kept out of Git.
- [x] **End-to-end telemetry path.** API validation and Kafka acknowledgement, Kafka consumer, PostgreSQL persistence, duplicate handling, late-event behavior, idling alerts, and dead-letter routing are implemented. GitHub Actions integration tests cover the main event journey.
- [x] **Useful demo workflows.** API-backed overview, vehicle list/detail, alerts, Analytics/Reports, and simulated refuelling are implemented. Fuel use and CO₂ are described as estimates.
- [x] **Dockerized local stack and CI.** Compose describes the API, dashboard, PostgreSQL, Kafka, ClickHouse, and optional live simulator. GitHub Actions builds/tests the simulator, backend integration, and dashboard.
- [x] **100K-safe ownership migration.** V6 creates tenant and tenant-scoped vehicle records, backfills existing data, and adds composite foreign keys. It passed a fresh-database integration run and a disposable 100K-row migration check.
- [x] **V6 ingestion compatibility and current CI.** Telemetry ingestion registers tenant/vehicle identities before dependent writes. Fix commit [97c160b](https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform/commit/97c160bf12a08605f8b74c0b54f2f3cb259df954) has a passing GitHub Actions run. Earlier migration-only run [36866315876](https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform/actions/runs/36866315876) failed because that compatible API code was not yet present; the failure is fixed on main.
- [x] **Architecture and decision notes.** Current architecture and three ADRs exist. These still need the C4 and evidence refinements listed below.

## Remaining work, in priority order

### P0 — Make the submission evidence complete and the current runtime safe

- [ ] **Save evidence screenshots.** Capture Dashboard and Alerts from the release candidate and save actual image files under evidences/2026-10-01/. Link them from the evidence index and record the commit/runtime used. Browser-only visual inspection does not count as saved evidence.
- [ ] **Apply and verify V6 on the user's persistent Compose database.** First inspect the actual Docker Compose project and volume, then rebuild/restart only its API and dashboard without deleting volumes. Verify Flyway version, row counts before/after, foreign keys, ingestion, overview, Alerts, Analytics/Reports, and dashboard rendering. Docker access is currently blocked by a local Docker socket permission error; resume this item when Docker access is available.
- [ ] **Verify the clean-clone, one-command demo.** Exercise bash scripts/start_demo.sh from a clean checkout/empty disposable database, document the exact startup steps and expected endpoints, and keep the user's persistent data untouched.
- [ ] **Refresh handoff, README, and evidence status.** Replace stale status claims with verified main commit/CI links and point readers to this checklist. Keep the local-project mirror and GitHub state clearly distinguished.
- [ ] **Build a requirement-to-evidence matrix and complete the solution document.** Map every challenge requirement to implementation, test/evidence, or explicit gap; fill and visually inspect the provided Word template using only measured results. User-provided template/PDF copies are references, not instructions that override the user's requests.

### P1 — Demonstrate correctness, speed, security, and recovery

- [ ] **Measure query plans.** Save representative EXPLAIN (ANALYZE, BUFFERS) results for key fleet and analytics queries and explain index/partition choices.
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

- Docker Desktop must allow access to its socket before the persistent-stack verification can proceed. Current observed error: permission denied at ~/.docker/run/docker.sock.
- Cloud credentials/hosting choice and OIDC issuer/client details are needed only for real deployment and hosted browser sign-in; do not invent these values.
- Any hackathon metric that depends on dedicated high-capacity hardware must be measured on that hardware or reported as unverified.

## Update rule

Work down the priorities in order. After each item, run the relevant check, link the evidence or commit, and mark it complete here. If an item is blocked, record the concrete blocker and continue with independent work.
