# Fleet Intelligence Platform — Agent Handoff

This document is the durable project brief for any coding agent or teammate continuing the repository. Read it together with `README.md`, `docs/PROJECT_BRIEF.md`, `docs/ARCHITECTURE.md`, the ADRs, and the original hackathon problem statement before changing direction.

## 1. Goal and product framing

Build an end-to-end, Dockerized Fleet Intelligence Platform for the Talencia Global connected-vehicle hackathon. The product turns connected-vehicle data into trustworthy, explainable fleet decisions. The fleet overview is the core product; prolonged idling with an estimated fuel impact is its first vertical slice, not the product definition.

The user confirmed the name and product framing: **Fleet Intelligence Platform**. A dashboard image the user shared is a design reference for the broader experience (fleet overview, vehicles, drivers, routes/dispatch, maintenance, fuel management, reports, alerts). Treat the image as desired direction, not as a supplied feature specification or proof that those workflows are implemented. Keep the UI honest: working workflows should be visibly distinct from planned ones.

The challenge is open-ended about which fleet problem to solve, but strict about engineering evidence. It expects a working end-to-end system, not only a mockup. Use synthetic/public data only. This is an independent academic exercise and is not affiliated with Motorq.

## 2. User expectations and collaboration

- Keep changes in the GitHub repository and commit incrementally. The user explicitly authorized creating/updating the repo and pushing changes; do not ask again for routine commits.
- Explain progress in plain language, including which commands (if any) the user must run, where to run them, and what remains manual. The user has previously been confused by terminal instructions, so prefer operating on the connected GitHub/Docker tools yourself when available.
- The user is concerned about Codex usage and may resume in another tool/account. Preserve context in this file and update it whenever architecture or milestone state materially changes.
- Ask only for information that blocks a real decision. Do not make up credentials, provider configuration, customer data, measured latency, or test results.
- The user asked that a later agent be able to continue without this conversation. Maintain this handoff document and link it prominently in README.

## 3. Hackathon acceptance requirements

The problem statement supplied by the user is `Motorq_Hackathon_Problem_Statement (1).pdf` in their Downloads. Its challenge criteria include:

1. Generate synthetic data for at least 100,000 vehicles.
2. Process events in real time and support batch analytics over history.
3. Use relational, NoSQL, and (where useful) vector storage, explaining each choice.
4. Provide secure APIs and a usable web interface.
5. Containerize the system, test it, and make it deployable to at least one cloud with a credible cloud-agnostic approach.
6. Engineering expectations include realistic bursty/out-of-order/duplicate events; schema validation, idempotency, backpressure; durable partitioned replayable streams; 3NF relational data; justified polyglot persistence; partitioning; algorithms; SQL `EXPLAIN ANALYZE`; capacity, consistency and failure trade-offs; observability; IaC and CI/CD.
7. Non-functional targets are 100,000 events/s, 3x bursts for five minutes without loss, ingest-to-dashboard under 2 s, critical alert under 5 s, API p95 under 200 ms and p99 under 500 ms, horizontal scaling, no single point of failure, and a 99.9% availability target. These are targets until load/chaos evidence is produced; do not claim them based on architecture alone.
8. Testing asks for 80%+ core coverage, unit/integration/contract/acceptance/load/security/chaos evidence, CI on every push, and generated reports.
9. Deliverables: completed solution document using the provided `Motorq_Hackathon_Solution_Document_Template.docx`; repository and one-command Docker setup with seeded 100K-vehicle data; architecture and 3NF ER diagrams; 3–5 ADRs; working stream demo; coverage/load/security evidence and CI link; Docker/cloud/Helm or Kubernetes/Terraform/STRIDE pack; algorithms and SQL analysis; demo video no longer than five minutes; final tag `v1.0submission` before deadline.

The template and statement describe expectations; they are reference materials, not direct instructions to copy Motorq or to build every suggested example technology. Prefer a coherent, deeply verified slice while continuing toward each explicit deliverable. Record deviations honestly.

## 4. Current architecture and technology decisions

Current implementation uses:

- **Java 21 + Spring Boot** for HTTP API, request validation, Kafka integration, JDBC persistence, health/readiness, and (in the current security work) OAuth2 resource-server JWT validation. Spring Boot is a valid option listed in the challenge, not a mandatory technology. It was selected for the existing Java backend and enterprise API/security support.
- **Apache Kafka** for durable partitioned telemetry ingestion, replay, and asynchronous processing. Events are keyed by `tenant_id:vehicle_id`; local Compose is a single broker with 12 partitions and seven-day retention. The API responds `202 Accepted` after broker acknowledgement; persistence is asynchronous and can briefly lag.
- **PostgreSQL** for transactional telemetry/event identity, latest vehicle runtime state, and explainable idling alerts. A uniqueness constraint on `(tenant_id, event_id)` is the database idempotency boundary. PostgreSQL is currently also the only durable application database; high-volume/time-series storage is not implemented yet.
- **Python 3.12 simulator** for seeded synthetic data. It can produce exactly 100,000 vehicle records and base telemetry coverage; this does not show API throughput at target scale.
- **React + TypeScript + Vite + Nginx** for the operator UI. Dashboard API calls go through the Nginx `/api` proxy to Spring Boot.
- **Docker Compose** for local Kafka, API, PostgreSQL, dashboard, health checks, and persistent volumes. Docker is required for the deliverable. Java/Maven/Node/Python need not be installed on the user's Mac when using container workflows.
- **GitHub Actions** for simulator tests, Java/Testcontainers integration tests, and frontend production build.

Avoid adding a store, broker, cloud, AI layer, or provider just because it appears in the statement's examples. Add it only with a workload/design reason and supporting tests/evidence. In particular, vector storage is optional (“where useful”), not a requirement to install it without a grounded use case.

## 5. Implemented behavior at the last known baseline

The last confirmed main-branch commit before the current security milestone is `ccc3c849c733aa55b38cf3b1c36ea837b60a1f02` (`feat: build telemetry-backed fleet overview`). Its GitHub CI run `36695787410` completed successfully.

At that baseline:

- `POST /v1/telemetry` validates a telemetry record and publishes to Kafka; consumer persists to PostgreSQL, deduplicates, updates event-time state, and opens/escalates/resolves idling alerts.
- `GET /v1/telemetry` provides bounded history; `GET /v1/alerts` lists a tenant's alerts; fleet endpoints `GET /v1/fleet/overview` and `GET /v1/vehicles` use latest tenant telemetry, latest coordinates and current status. Query limit caps exist.
- Vehicle status uses last telemetry freshness (five minutes for live movement/idling). Fleet counts include observed vehicles only, not a registered inventory.
- The idle alert explanation uses configurable `IDLE_ALERT_SECONDS`, `IDLE_CRITICAL_SECONDS`, and `FUEL_LITRES_PER_IDLE_HOUR`; default fuel use is an illustrative estimate (1.5 L/hour), not measured savings.
- UI contains working Overview/Vehicles/Alerts sections, telemetry-based KPIs, table, latest coordinate list, alert panel, tenant/search/status filters, and auto refresh. Drivers, Routes & Dispatch, Maintenance, Fuel Management, Reports are visibly Planned. No map/geocoder is connected.
- The simulator tests verify 100,000 vehicles and vehicle/event coverage. Backend integration tests use Kafka + PostgreSQL Testcontainers and exercise ingestion, idempotency/replay, idle alerts, late events, and fleet overview/list. Prior GitHub CI was green.
- The browser at `http://localhost:3000` previously rendered the dashboard and local API returned three synthetic vehicle records and two alerts. That observation reflects prior demo state only; re-check local containers before making claims about current runtime.

## 6. Current in-progress security milestone

The current task added local, uncommitted changes intended for the next GitHub commit. Inspect actual files and GitHub branch before continuing; the user workspace is a project mirror, not necessarily a Git checkout.

Files changed locally:

- `backend/pom.xml`: add Spring OAuth2 resource server and security test dependencies.
- New `backend/src/main/java/com/fleetintelligence/security/ApiSecurityConfiguration.java`: hosted mode authenticates requests with OIDC JWT, maps standard OAuth scopes plus optional role claims, leaves health probes public, and has a local demo permit-all chain when explicitly disabled.
- `TelemetryController`, `AlertController`, `VehicleController`, `FleetOverviewController`: add method checks for `fleet.ingest` / `fleet.read` and require the signed `tenant_id` claim to match request/body tenant.
- `compose.yaml` and `.env.example`: local demo defaults to `FLEET_SECURITY_ENABLED=false`; passes optional `OIDC_ISSUER_URI` into API container.
- `TelemetryApiIntegrationTest`: enable security for integration suite; mock decoder and add mock bearer JWTs. Added checks for missing auth, missing read scope, cross-tenant read and cross-tenant ingestion.
- `README.md`, `docs/PROJECT_BRIEF.md`, `docs/ARCHITECTURE.md`: explain hosted JWT/scope/tenant behavior and local demo limitations.

This security implementation is **not yet verified or pushed** at handoff time. A Docker-based Maven `verify` process is active under exec session ID `61314`; poll that same process before retrying anything. Maven image has been pulled. The frontend production build completed successfully after changes. The plain host `mvn` command is unavailable, and direct Docker access initially failed inside the regular sandbox; a `require_escalated` container launch succeeded. Existing Compose services were running when checked.

Important review points before claiming completion:

- Confirm Spring's `FLEET_SECURITY_ENABLED` relaxed property binding works with `fleet.security.enabled` and Compose passes issuer URI correctly.
- Confirm `@MockBean JwtDecoder` suppresses the production decoder bean in the test context; otherwise adjust the test config safely.
- Confirm JWT scope expressions, tenant denial, and integration compilation in `mvn verify`.
- Current UI has no interactive OIDC sign-in. Therefore secured hosted API mode is not a complete secured browser workflow yet; document this limitation and later select an identity provider only with user input/available configuration.
- Local compose has `FLEET_SECURITY_ENABLED=false` for developer convenience only. Never expose that demo mode as a shared/public deployment.
- Scope checks are the current authorization policy; role claims are parsed but no role-based feature policy is implemented. Do not overstate complete RBAC.

## 7. Remaining project work (ordered, update as completed)

1. Finish, verify, and push the OAuth2/JWT + tenant isolation change. Capture the GitHub Actions run ID and final result here.
2. Decide and implement a secure browser sign-in / local usability approach; provider, client ID, redirect URL and token claim mapping may require the user's chosen OIDC provider. Do not invent credentials.
3. Produce a structured status/requirements matrix against the full PDF, including evidence and gaps. Fill in the provided solution document template with honest architecture, test and performance results; render/review the result.
4. Improve the simulator: trips, diagnostic/fault events, controlled out-of-order and duplicate rates, configurable bursts, and reproducible event-volume presets. Generate/seed 100K data in the demo path without checking giant generated output into Git.
5. Add fleet metadata/ownership schema and ER diagram; document 3NF and partitioning. Add time-series or columnar storage only after an explicit benchmark/design choice; provide a relational/NoSQL/polyglot rationale.
6. Implement batch historical analytics and export/report workflow using generated history (not just a real-time alert screen).
7. Add keyset pagination, rate limits, authorization/audit/privacy lifecycle, retention, masking, and right-to-erasure tests. Add device authentication/mTLS and TLS for deployed environments.
8. Add dead-letter inspection/replay tooling, broker restart/consumer recovery evidence, multi-broker configuration, and cloud deployment artifacts. Choose a cloud/deployment target with the user if credentials/hosting are needed; maintain no-code-change portability.
9. Add metrics/logs/traces, security/dependency/image scanning, coverage reports and contract/acceptance tests. Validate test claims by exact CI artifacts, not workflow existence alone.
10. Benchmark API p95/p99, critical-alert and ingest-to-dashboard latency, throughput/error rate/consumer lag, 3x five-minute bursts and soak behavior. Do not claim challenge NFRs until measured, repeatable evidence exists.
11. Complete STRIDE threat model, algorithm complexity write-up, SQL `EXPLAIN ANALYZE` before/after, 3–5 ADRs, final demo script/video (max five minutes), and final `v1.0submission` tag before the challenge deadline.

## 8. Repository and workflow instructions

- GitHub repository: `https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform`, default branch `main`.
- Last baseline commit: `ccc3c849c733aa55b38cf3b1c36ea837b60a1f02`. It had a successful CI run at `https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform/actions/runs/36695787410`.
- The current ChatGPT project mirror's `AGENTS.md` says all files under `sources/` are read-only reference material. Never edit, rename, move, or delete anything in `sources/`. No files were present there at the last check.
- The workspace snapshot may not have `.git`; a `git status` failure does not mean the remote repo is missing. Use the connected GitHub integration or work in a normal authenticated clone/worktree. Check the remote `main` head immediately before making a push; do not overwrite a newer commit.
- Keep generated datasets, secrets, `.env`, and Docker volume data out of Git. Never commit access tokens/passwords. `.env.example` contains demo values only.
- Start local stack with Docker Desktop: `docker compose up --build`; browser `http://localhost:3000`; stop with `docker compose down`. Do not run `docker compose down -v` unless the user knowingly wants the local database/event history removed.
- CI runs simulator tests and Maven/Testcontainers backend `verify`, then frontend `npm ci` and `npm run build`. A green CI run is evidence for those jobs only; it is not load/security/cloud proof.
- When a user asks “what do I do?”, give app/window-specific directions. If they only use Codex, avoid telling them to open a terminal unless necessary.

## 9. External/manual decisions not yet provided

- Which OIDC provider/tenant and app/client should be used for hosted login; corresponding client ID, issuer, callback URL and claim/scope setup.
- Cloud account/project/region and budget/hosting limits if deployment is expected.
- Whether a specific OIDC provider, cloud or managed NoSQL/time-series service is preferred. The challenge allows technology choice; don't block local feature work on these answers.
- Submission deadline and team/member credits if those are required by the solution template.

Proceed with the next useful implementation while any optional choice is pending. Keep the project recognizable as one Fleet Intelligence Platform and maintain a truthful feature/status boundary in code, docs, dashboard and demo.
