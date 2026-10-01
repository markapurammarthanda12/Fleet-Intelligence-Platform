# Fleet Intelligence Platform — Agent Handoff

## Current status — 2026-10-02 (use this section over older dated notes)

The local persistent Compose database has Flyway V1–V6 applied. On 2026-10-01 the API image was rebuilt and only the API container replaced; PostgreSQL and its volume, dashboard, Kafka, ClickHouse, and simulator were preserved. API readiness and the dashboard, Alerts, Analytics, and Reports routes were checked with the live synthetic dataset. Database totals were 100,003 vehicle records, 2 tenants, and 945,452 telemetry events. The overview represented 100,000 vehicles. See [`evidences/2026-10-01/local-stack-check.md`](../evidences/2026-10-01/local-stack-check.md) and [`evidences/README.md`](../evidences/README.md).

**Screenshot milestone completed:** Dashboard Overview and Alerts screenshots from the running local synthetic demo are saved in `evidences/2026-10-01/` and embedded in Section 3.1 of `docs/Fleet_Intelligence_Solution_Document_DRAFT.docx`. Capture details and the Alerts pagination caveat are in `evidences/2026-10-01/screenshot-capture.md`. The draft still has yellow-highlighted user inputs and unverified deliverable placeholders. Still open at P0: verify one-command startup on a clean checkout with a disposable empty database; publish and verify the latest handoff, evidence files, and document on GitHub; complete and visually inspect the solution document. No throughput, soak, p95/p99, event-loss, failover, cloud deployment, or 99.9% availability target has been demonstrated. Fuel and CO2 are estimates. The latest dated runtime note is more authoritative than historical status sections below.

---

This document is the durable project brief for any coding agent or teammate continuing the repository. Read it together with `README.md`, `docs/PROJECT_BRIEF.md`, `docs/ARCHITECTURE.md`, the ADRs, and the original hackathon problem statement before changing direction.

> **Latest local runtime check — 2026-10-01:** Docker Desktop and the 100,000-vehicle PostgreSQL/Kafka/ClickHouse volumes are present. Dashboard, API, PostgreSQL, Kafka, and ClickHouse are up; database/broker health checks passed. Dashboard, API readiness, fuel summary, and fleet overview return HTTP 200. Reports now reads exact hourly aggregate states, with raw events queried only for partial boundary hours: the previously slow 37-hour query returned in 0.16 seconds and a partial-hour range returned in 0.17 seconds. The hourly aggregate table and one-time historical backfill marker are installed in ClickHouse. At the latest resource sample, API used about 436 MiB, ClickHouse 950 MiB, Kafka 368 MiB, and CPU was modest. The optional live simulator is currently running at 5 events/second. After 20 seconds, the overview showed 184 moving and 31 idling vehicles with fresh telemetry; Reports returned in 0.20 seconds. At that sample, API CPU was 27%, ClickHouse 11%, Kafka 6%, and simulator 2%; memory was 476 MiB API, 1.09 GiB ClickHouse, 290 MiB Kafka, and 152 MiB PostgreSQL. No volumes were removed. Continue monitoring over a longer period; this short check does not establish the hackathon throughput or latency targets.
> **Latest code and CI — 2026-10-01:** Backend latest-state optimization is in `51192e36d674e890fedc360ac263bccc612b0285` (V4 backfill and late-event regression coverage; [CI run 36828684841 passed](https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform/actions/runs/36828684841)). It is built and running locally; fleet and fuel API checks passed. Frontend request-throttling is in `705700553c2ab25745c66028b7e2f5b46b172f4c`; [CI run 36829676934 passed](https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform/actions/runs/36829676934). Exact hourly aggregation and partial-hour handling are in commit `8b81cddffbef9f5e6576dbc84b428db641560e00`; [CI run 36832816641 passed](https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform/actions/runs/36832816641), including backend integration tests and dashboard build. Analytics/Reports now fetch only while their page is open, allow one request at a time, and refresh every 60 seconds. The new ClickHouse exact hourly aggregate and one-time backfill have reduced the checked 37-hour Reports request from 21.3 seconds to 0.16 seconds; a partial-hour range returned in 0.17 seconds. The 5 events/second stream has passed an initial 20-second check (dashboard updates visible, Reports 0.20 seconds, moderate CPU); continue a longer soak and load check. The Fuel trigger is in `5f2180bff08ac2971dff446bc1783516a4d8831d`; the summary showed 104 persisted stops. Keep CO₂ and fuel prices described as estimates/assumptions. The Compose default simulator rate is 5 events/second; this rate has passed an initial 20-second live check and is running locally.
>
> The React source targets `tenant-100k`, removes fabricated fallback fleet/analytics/history, and parks the four placeholder workflow screens. `npm run build`, Python syntax compilation, and `docker compose config --quiet` passed. The API image and V4 migration are active locally with demo authorization; dashboard root is served on port 3000. The hourly Reports API works but its wide time-range aggregate is too expensive at the current data volume. Preserve all Docker volumes; generated `data/` stays out of Git.
>
> To recreate data on this Mac or another clone with Docker: run `bash scripts/generate_dataset.sh`, then `bash scripts/load_dataset.sh` from the repository root. Start ongoing position changes with `docker compose --profile live-simulator up -d`; stop only that process with `docker compose stop live-simulator`. The generator and scripts are in GitHub; the current DB rows and local live process are not transferable to another agent's machine.

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
- **PostgreSQL** for transactional telemetry/event identity, latest vehicle runtime state, and explainable idling alerts. A uniqueness constraint on `(tenant_id, event_id)` is the database idempotency boundary.
- **ClickHouse** for a Kafka-fed analytical copy of telemetry and hourly historical aggregates. The API and mocked-store integration tests pass GitHub CI; live broker-to-ClickHouse-to-API behavior still needs Docker end-to-end verification.
- **Python 3.12 simulator** for seeded synthetic data. It can produce exactly 100,000 vehicle records and base telemetry coverage; this does not show API throughput at target scale.
- **React + TypeScript + Vite + Nginx** for the operator UI. Dashboard API calls go through the Nginx `/api` proxy to Spring Boot.
- **Docker Compose** for local Kafka, API, PostgreSQL, dashboard, health checks, and persistent volumes. Docker is required for the deliverable. Java/Maven/Node/Python need not be installed on the user's Mac when using container workflows.
- **GitHub Actions** for simulator tests, Java/Testcontainers integration tests, and frontend production build.

Avoid adding a store, broker, cloud, AI layer, or provider just because it appears in the statement's examples. Add it only with a workload/design reason and supporting tests/evidence. In particular, vector storage is optional (“where useful”), not a requirement to install it without a grounded use case.

## 5. Implemented behavior at the last known baseline

Historical code commit `187a96b41385e0bd9b69c68f5aa5392b0eb11cc9` passed its simulator job, all 8 backend Testcontainers integration tests, and frontend build in CI. Later documentation commits updated repo state. Always check GitHub `main` and Actions for the actual latest state; these historical references are not proof that the current analytics changes passed CI.

At that baseline:

- `POST /v1/telemetry` validates a telemetry record and publishes to Kafka; consumer persists to PostgreSQL, deduplicates, updates event-time state, and opens/escalates/resolves idling alerts.
- `GET /v1/telemetry` provides bounded history; `GET /v1/alerts` lists a tenant's alerts; fleet endpoints `GET /v1/fleet/overview` and `GET /v1/vehicles` use latest tenant telemetry, latest coordinates and current status. Query limit caps exist.
- Vehicle status uses last telemetry freshness (five minutes for live movement/idling). Fleet counts include observed vehicles only, not a registered inventory.
- The idle alert explanation uses configurable `IDLE_ALERT_SECONDS`, `IDLE_CRITICAL_SECONDS`, and `FUEL_LITRES_PER_IDLE_HOUR`; default fuel use is an illustrative estimate (1.5 L/hour), not measured savings.
- UI contains working Overview/Vehicles/Alerts sections and a Reports screen for hourly historical aggregates. The Reports frontend production build passes locally; its live data path needs runtime verification. Drivers, Routes & Dispatch, Maintenance, and Fuel Management remain planned. No map/geocoder is connected.
- The simulator tests verify 100,000 vehicles and vehicle/event coverage. Backend integration tests use Kafka + PostgreSQL Testcontainers and exercise ingestion, idempotency/replay, idle alerts, late events, and fleet overview/list. Prior GitHub CI was green.
- The browser at `http://localhost:3000` previously rendered the dashboard and local API returned three synthetic vehicle records and two alerts. That observation reflects prior demo state only; re-check local containers before making claims about current runtime.

## 6. Current in-progress security milestone

The security milestone is committed and verified by CI. Inspect actual files and remote branch before continuing; the user workspace is a project mirror, not necessarily a Git checkout.

Files included in commit `3b84e783337cba7b399614114ab207b9f5937178`:

- `backend/pom.xml`: add Spring OAuth2 resource server and security test dependencies.
- New `backend/src/main/java/com/fleetintelligence/security/ApiSecurityConfiguration.java`: hosted mode authenticates requests with OIDC JWT, maps standard OAuth scopes plus optional role claims, leaves health probes public, and has a local demo permit-all chain when explicitly disabled.
- `TelemetryController`, `AlertController`, `VehicleController`, `FleetOverviewController`: add method checks for `fleet.ingest` / `fleet.read` and require the signed `tenant_id` claim to match request/body tenant.
- `compose.yaml` and `.env.example`: local demo defaults to `FLEET_SECURITY_ENABLED=false`; passes optional `OIDC_ISSUER_URI` into API container.
- `TelemetryApiIntegrationTest`: enable security for integration suite; mock decoder and add mock bearer JWTs. Added checks for missing auth, missing read scope, cross-tenant read and cross-tenant ingestion.
- `README.md`, `docs/PROJECT_BRIEF.md`, `docs/ARCHITECTURE.md`: explain hosted JWT/scope/tenant behavior and local demo limitations.
- `docs/AGENT_HANDOFF.md`: this continuation guide, linked from README.

The first GitHub CI run for commit `3b84e78` is at `https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform/actions/runs/36697671067`. The simulator job passed. Backend compilation and test compilation passed, but all backend integration tests errored because Spring Kafka attempted to register a JWT converter lambda as a generic message converter and could not infer its input/output generic types. The failure was `IllegalArgumentException: Unable to determine source type <S> and target type <T> for your Converter [ApiSecurityConfiguration$$Lambda...]` in `KafkaListenerAnnotationBeanPostProcessor.addFormatters` during context startup.

The concrete nested `FleetJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken>` replaced the lambda, and test mocking now uses Spring Framework `@MockitoBean`. CI verified that Spring Kafka can load the app context and run the backend test suite with this converter.

Verification: frontend `npm run build` completed locally and again in GitHub Actions. Host Maven is unavailable. A Maven container was launched without the Docker socket required by Testcontainers and was stopped; it exited with code 143, so **do not count that local attempt as a passing backend test**. GitHub Actions run `36698258118` is the passing backend verification (8 integration tests, no failures/errors).

Docker state: Docker Desktop engine reported running. `docker compose up --build -d` was started after CI passed to rebuild the API/dashboard. The API image build remained at `RUN mvn -B -ntp dependency:go-offline` for over eight minutes without new output. I stopped that build with Ctrl-C (exec session `76075`, exit code 130); it did not stop or remove application containers or volumes. Its Buildx record was `kx45rru7ci89s2v6b35371hm5`. The four prior Compose containers are still running with the pre-OIDC image: `postgres-1` healthy at 5432, `kafka-1` healthy at 9092, `api-1` at 8080, and `dashboard-1` at 3000. Their readiness endpoint returned `{"status":"UP"}` and the fleet endpoint returned 3 vehicles, 2 open alerts, and a 0.3 L illustrative idle-fuel estimate. The browser tab at `http://localhost:3000/#alerts` rendered the fleet overview/table/location/alert panels with Drivers, Dispatch, Maintenance, Fuel and Reports visibly Planned. Compose local mode remains intentionally unauthenticated. The temporary container `priceless_roentgen` was only the Maven test runner and has been stopped; it is not an application service.

The user received a GitHub “run failed” email and asked for it to be checked. Mailbox access is not connected in this task. Plugin discovery found Outlook Email as available but not installed/connected (Gmail is unavailable by admin policy); a connection suggestion was presented. Do not claim the email itself was inspected until the user connects Outlook Email. The authoritative matching GitHub run and logs have already been inspected directly, so the failure cause above is known from GitHub Actions. If Outlook is connected in a resumed tool, search for the failure email for run 11 / commit `3b84e78` and compare the notification to the run logs.

Important review points before claiming completion:

- Confirm Spring's `FLEET_SECURITY_ENABLED` relaxed property binding works with `fleet.security.enabled` and Compose passes issuer URI correctly.
- Confirm `@MockBean JwtDecoder` suppresses the production decoder bean in the test context; otherwise adjust the test config safely.
- Confirm JWT scope expressions, tenant denial, and integration compilation in `mvn verify`.
- The local UI entry gate is demo-only and does not authenticate requests. Hosted secured API mode still needs interactive OIDC browser sign-in and issuer/client/redirect configuration; do not treat the demo gate as security.
- Local compose has `FLEET_SECURITY_ENABLED=false` for developer convenience only. Never expose that demo mode as a shared/public deployment.
- Scope checks are the current authorization policy; role claims are parsed but no role-based feature policy is implemented. Do not overstate complete RBAC.

## 7. Remaining project work (ordered, update as completed)

The live priority list is [docs/PROJECT_CHECKLIST.md](PROJECT_CHECKLIST.md). It records completed work, remaining work, evidence links, and blockers; update it after each verified milestone. Do not use older numbered lists or status paragraphs below as the current project status.

## 8. Repository and workflow instructions

- GitHub repository: `https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform`, default branch `main`.
- Earlier CI on commit `187a96b` passed simulator, 8 backend integration tests, and frontend build. Analytics/API changes later passed backend integration CI with the ClickHouse service mocked; inspect current main and the workflow before making claims about live ClickHouse runtime.
- The current ChatGPT project mirror's `AGENTS.md` says all files under `sources/` are read-only reference material. Never edit, rename, move, or delete anything in `sources/`. No files were present there at the last check.
- The workspace snapshot may not have `.git`; a `git status` failure does not mean the remote repo is missing. Use the connected GitHub integration or work in a normal authenticated clone/worktree. Check the remote `main` head immediately before making a push; do not overwrite a newer commit.
- Keep generated datasets, secrets, `.env`, and Docker volume data out of Git. Never commit access tokens/passwords. `.env.example` contains demo values only.
- Start local stack with Docker Desktop: `docker compose up --build`; browser `http://localhost:3000`; stop with `docker compose down`. Do not run `docker compose down -v` unless the user knowingly wants the local database/event history removed.
- Historical note (2026-09-30): a prior five-service Compose rebuild stalled during Maven packaging, leaving an older four-service runtime. This was superseded by the 2026-10-01 six-service local check described at the start of this handoff. The current task mirror has no Docker socket access, so runtime state could not be rechecked after the V6 change.
- CI runs simulator tests and Maven/Testcontainers backend `verify`, then frontend `npm ci` and `npm run build`. A green CI run is evidence for those jobs only; it is not load/security/cloud proof.
- When a user asks “what do I do?”, give app/window-specific directions. If they only use Codex, avoid telling them to open a terminal unless necessary.

## 9. External/manual decisions not yet provided

- Which OIDC provider/tenant and app/client should be used for hosted login; corresponding client ID, issuer, callback URL and claim/scope setup.
- Cloud account/project/region and budget/hosting limits if deployment is expected.
- Whether a specific OIDC provider, cloud or managed NoSQL/time-series service is preferred. The challenge allows technology choice; don't block local feature work on these answers.
- Submission deadline and team/member credits if those are required by the solution template.

Proceed with the next useful implementation while any optional choice is pending. Keep the project recognizable as one Fleet Intelligence Platform and maintain a truthful feature/status boundary in code, docs, dashboard and demo.

## 10. Starter prompt for a new coding tool

After sharing the GitHub repository link, the user can paste this prompt:

> Continue the Fleet Intelligence Platform connected-vehicle hackathon project in this repository: https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform. Read `README.md`, this handoff, `docs/PROJECT_BRIEF.md`, `docs/ARCHITECTURE.md`, and the ADRs; inspect current `main` and CI. The product is the broad Fleet Intelligence Platform; prolonged-idle alerts are its first working use case. The user's current priority is the data-driven frontend backed by real API/database records, followed by backend improvements and then other hackathon deliverables. They specifically requested a generated 100,000-vehicle fleet with metrics, alerts, analytics, and map coordinates driven by stored telemetry, with changes reflected live. The latest code removes the hardcoded sample fleet when the API is unavailable and parks Drivers, Routes/Dispatch, Maintenance, and Fuel workflows for later. Check the latest verified status above: a 100K synthetic snapshot and live simulator were loaded on the user's Mac, but local data files, Docker volumes, and running containers do not transfer with GitHub. A new computer with Docker can recreate them using `bash scripts/generate_dataset.sh`, `bash scripts/load_dataset.sh`, then `docker compose --profile live-simulator up -d`. Clearly say if you lack computer/Docker access. Do not describe synthetic simulator events as actual physical fleet data. Do not claim the challenge targets (100K events/s, latency, availability, HA, security, cloud deployability) without measurements. Keep generated data, credentials, `.env`, and Docker volumes out of Git. The API/dashboard runtime, Reports endpoint, and latest GitHub CI still need checks described in the latest status; do not rely on older historical entries below. The user has authorized routine GitHub pushes; keep them updated incrementally. Do not remove Docker volumes or invent OIDC credentials. Outlook is not connected; read GitHub workflow status directly rather than claiming to have read failure emails.

## 11. Handoff for an agent without computer access

A coding agent does not need access to this Mac to read or change the project. Give it the repository URL and this guide; if its environment has GitHub connection or repository clone support, it can inspect files, edit code, run available CI/build steps, push a branch/commit, and read GitHub Actions results. It cannot infer the current Docker Desktop containers, local browser state, generated local `data/`, or any files that were never committed. Treat those as unknown until the user or a machine with computer access verifies them.

For GitHub-only work:

1. Open `https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform`, read this file and the README/architecture/brief/ADRs, then inspect the latest `main` commit and working tree before coding. Do not rely on the commit numbers or status in older paragraphs; this guide is updated over time.
2. Run the repository's GitHub Actions workflow or available local frontend/simulator checks. Record the exact commit, workflow result, and test counts. A passing frontend build does not verify Spring compilation, ClickHouse startup, Docker Compose, or end-to-end broker delivery.
3. If no Docker engine is available, do not say Docker works. Inspect `compose.yaml`, Dockerfiles, and ClickHouse init SQL statically, then report container/runtime checks as “not run: no Docker access.” Do not claim that the user's Mac stack has been rebuilt.
4. Keep changes in a feature branch or the authorized `main` workflow; the user has asked for frequent GitHub updates. Never commit credentials, `.env`, generated datasets, local database volumes, or secrets. Update this guide and README with every material architecture or verification change.
5. Ask the user only for a decision or manual action that cannot be performed in your environment. If a Docker check is needed on their Mac, give them one short action in Docker Desktop or a copyable command and identify the application where it belongs. A connected GitHub account does not grant access to Docker Desktop, browser tabs, or the user's filesystem.

The user-facing path if the next agent has no computer access: share the repository URL and paste the starter prompt below; connect GitHub in that tool if it asks for repository permission. The user does not need to install GitHub Desktop or another Git app. If GitHub write access is unavailable, the agent can still prepare a patch or pull request instructions, but cannot push directly. For local verification later, the user can open Docker Desktop and use Terminal in the repository folder; no Java, Maven, Node, Spring Boot, or ClickHouse installation is needed because Compose runs the services in containers. The remaining local action is to diagnose why the Dockerized Maven package step makes no progress (the same stall has recurred at both dependency resolution and package phases), then rebuild and run the updated Compose stack without deleting volumes. Confirm Kafka, ClickHouse, PostgreSQL, API, and dashboard become healthy, submit synthetic telemetry, and verify Alerts and Reports. Until the rebuild succeeds, port 3000 serves the old dashboard image; the Vite source preview at port 5173 reflects the latest UI.

## 12. Latest analytics implementation status (2026-09-30)

The latest working copy adds an independent analytical path: Kafka topic `fleet.telemetry.v1` is read by a ClickHouse Kafka Engine table and materialized view into a monthly-partitioned MergeTree table with a 90-day TTL. PostgreSQL remains the transactional/event-processing store. The Spring API exposes `GET /v1/analytics/telemetry/hourly?tenant_id=...&from=...&to=...`, requires `fleet.read` and tenant-claim equality in secured mode, and caps the requested range at 31 days. The React Reports screen calls this endpoint. ClickHouse credentials and its persistent volume are configured in Compose; `.env.example` documents local defaults.

Frontend TypeScript and Vite production build pass locally after removing the tenant ID text box, adding the fixed Demo fleet workspace, navigation, synthetic workflow previews, responsive layout, searchable/filterable Alert Center, and CSV exports for filtered vehicle, alert and report data. The synthetic Drivers, Routes & Dispatch, Maintenance, and Fuel screens now include status chips (All/Active/Needs attention/Scheduled), search, and selectable row details; they remain sample-only and intentionally have no live mutation actions. The Vehicles table opens an API-backed detail panel with latest status/coordinates, recent telemetry history (`GET /v1/telemetry`), and related alerts. A global search filters vehicle and alert lists. The app has a local demo entry/sign-out flow stored in `sessionStorage`; it is an access gate for this synthetic local demo only, not authentication. The user chose this option while an OIDC provider remains unconfigured. Simulator tests pass 3/3 with Python 3.12. GitHub Actions run `36709685851` for commit `e0b4aa36642340ad42e97d194e60e1f91aa932c1` passed (simulator, backend Testcontainers integration and frontend production build); backend integration CI confirms compile/tests with the ClickHouse service mocked, not live ClickHouse consumption. `docker compose config --quiet` had passed earlier (syntax only). On the unlocked Mac, `docker compose up --build -d` pulled the ClickHouse image but the API Docker build stalled at `mvn -B -ntp -DskipTests package` for 9m38s, with no output after Maven project discovery. The same Maven stage had stalled in earlier attempts. I interrupted only that `docker compose up` process; `docker compose ps` confirms the original four services remain Up, PostgreSQL and Kafka healthy, on ports 5432/9092/8080/3000. No containers or volumes were removed, and no ClickHouse container is running. The already running dashboard on port 3000 is therefore still an older image. A separate Vite preview at `http://127.0.0.1:5173/#alerts` displays the latest UI, including Alert Center; CSV export is in source but the Docker dashboard still needs a successful rebuild to include it.

No throughput, p95/p99 latency, data-loss, HA, 99.9% availability, coverage percentage, cloud deployability, OIDC browser sign-in, or ClickHouse runtime success is demonstrated by the frontend build. Preserve those as open evidence items.

## 13. Frontend-first direction from the user

The user has asked to complete the frontend first, then the backend, then the remaining deployment/hackathon work. Discuss a materially better direction with them before changing the agreed product scope. They specifically questioned the dashboard's **Fleet / tenant** text box: fleet managers operate a fleet, not an internal tenant ID. The frontend opens into a fixed local Demo fleet workspace and sends the tenant ID internally; operators do not type it. In hosted mode, the tenant should come from the authenticated account. Overview/Vehicles/Alerts use the telemetry API; vehicle rows open a detail panel with API-backed recent history and related alerts. Alert acknowledgement and its current status are recorded by the API and PostgreSQL (see section 16). Global search filters the vehicle and alert lists. Reports uses the ClickHouse API. Drivers, Routes & Dispatch, and Maintenance are synthetic previews, not live records. Fuel uses the persisted simulated-refuelling API. Historic CI notes below are superseded by the current status in section 16.

## 16. Current continuation status (2026-10-01)

The current Docker Compose stack was inspected on the user's Mac: API, dashboard, ClickHouse, Kafka, PostgreSQL, and the optional live simulator are all up; database and broker health checks pass. The live simulator is configured at 5 telemetry events/second. The current fleet overview reports 100,000 vehicles and a fresh latest-event timestamp. During the simulator run, a 37-hour Reports request returned HTTP 200 in 0.214 seconds. A single resource sample showed ClickHouse at about 1.12 GiB memory and 109% CPU, API 483 MiB, Kafka 484 MiB, and the whole Docker VM limit at 3.825 GiB. Treat this as one observation, not a long soak or benchmark; continue monitoring before increasing event rate.

Alert acknowledgement is now implemented end to end. `POST /v1/alerts/{alertId}/acknowledge?tenant_id=...` stores `acknowledged` state and timestamp in PostgreSQL. Secured API mode requires `fleet.write` plus a matching tenant claim. The local demo actor is recorded as `demo-operator`; hosted identity must replace this fixed actor. An acknowledged alert stays acknowledged as new telemetry updates the same idle episode, becomes resolved when the vehicle moves, and a new idle episode opens a new alert. The Alert Center now supports an Acknowledge action and an Acknowledged filter. Flyway migration V5 adds acknowledgement metadata and an alert-list index.

The alert feature is in commit `e0e7d67680b2370e06ba42961201306c936323f3` and CI run `36834384180` passed. The latest handoff refresh is commit `db0174b1263a47fe11530eea05ab5a203dd84e70` and CI run `36834739194` passed. Frontend TypeScript/Vite build and Docker Maven package both passed locally. The API and dashboard images were rebuilt and restarted; API readiness is UP, dashboard root returns HTTP 200, and the alert API returned real alert rows. A temporary isolated alert verified the acknowledge endpoint (HTTP 200, status and timestamp persisted) and was then deleted. The one-request Reports latency and one resource sample are not a throughput, soak, or challenge-target certification. Hosted interactive sign-in, audit identity, full Drivers/Routes/Maintenance APIs, deployment, and measured challenge-scale load remain unfinished.

## 14. Reference-aligned frontend pass (2026-09-30)

The user provided a multi-screen fleet dashboard image as a visual reference and asked for the same overall style with only minor product-appropriate changes. Keep the product name **Fleet Intelligence Platform**. The current frontend has been restyled around that reference: deep navy sidebar with blue active navigation; clean, compact white workspace; four summary cards; telemetry trend chart and status donut; map with a searchable vehicle list; alert center; analytics; detailed vehicle view; decision-rule catalog; reports; and settings. A local demo sign-in screen gates the dashboard. It is a session-only demo gate, not authentication.

`frontend/src/FleetMap.tsx` uses Leaflet with OpenStreetMap tiles and attribution. The map positions vehicles based on telemetry coordinates; tile loading needs network access in the user's browser, and the standard OSM tile service is suitable for this demo, not an assumed high-volume production deployment. The local browser settings hide map pins and coordinates when “Show vehicle locations on map” is off. The displayed fleet and chart data are synthetic when the API is unavailable and carry a visible sample-data label. Java record camelCase JSON fields are normalized in `frontend/src/App.tsx` before use by the dashboard.

Decision-rule create/pause/remove actions and dashboard preferences persist in browser localStorage only; they do not update server policy. Drivers, Routes & Dispatch, Maintenance, and Fuel are sample-data previews. API-backed workflows include fleet overview/vehicles/alerts when the API is reachable, vehicle history, and hourly analytics when ClickHouse/API are ready. Do not describe every screen as a production-connected workflow.

Frontend package includes Leaflet and `@types/leaflet`. The most recent TypeScript/Vite production build and Docker dashboard rebuild passed; the current port 3000 image is up with alert acknowledgement. Earlier notes below describing an old dashboard image, missing acknowledgement, or unpushed changes are historical and superseded by section 16.

Next: publish the frontend components/styles/package lock and update README/handoff; inspect the rendered page at 5173 after the user opens it, especially the first-run local demo sign-in, responsive narrow layout, map, and each sidebar route. Continue frontend visual/interaction refinement before starting the separate backend completion phase. Then address the outstanding backend and hackathon requirements already listed above.

## 17. Health dashboard continuation (2026-10-01)

The latest user request is to finish the requested dashboard changes quickly, continue from prior work, inspect Docker (which the user had closed), and complete/publish. Docker Desktop was started by the user before this continuation; the Docker Engine is running. Kafka, PostgreSQL, ClickHouse, and the optional live simulator had been running, while API and dashboard were stopped. Rebuilt `api` and `dashboard` images with `docker compose build --no-cache api dashboard`, then started those services via `docker compose up -d api dashboard`. Do not remove or reset database volumes.

The API health endpoint returned `UP`, the dashboard root returned HTTP 200, and `GET /v1/fleet/overview?tenant_id=tenant-100k` returned 100,000 vehicles plus live `healthy_vehicles`, `warning_vehicles`, and `critical_vehicles` fields. The dashboard now displays Total / Healthy / Warnings / Critical summary cards, the current status donut, filter tabs for All / Healthy / Warning / Critical, `VH-####` display IDs, severity tabs, Analytics KPIs, and an estimated fuel-consumption chart. The current UI uses API values; the vehicle list and alert tabs are bounded to the most recently loaded API rows.

Health definitions: Critical is a vehicle with an open critical alert; Warning is an open warning alert or a last signal older than five minutes; Healthy is a fresh vehicle with no open warning/critical alert. Counts cover the full reported vehicle state, while the table/map load up to 200 recent vehicles at a time. At the configured 5 telemetry events/second and 100,000-vehicle scale, most seeded records become stale, so the high warning count is a truthful consequence of the simulator rate and five-minute freshness rule, not a UI fixture. Do not change category labels or hide stale vehicles to make the distribution look prettier.

The simulator reserves existing IDs VH-2048 and VH-7182 for visible rule demonstrations: VH-2048 idles in alternating 10-minute windows and should reach warning after the configured 5-minute idle threshold; VH-7182 idles continuously and should reach critical after the configured 15-minute threshold. These are genuine telemetry events and use no extra vehicle records. Analytics derives distance/fuel/CO₂ as illustrative estimates from hourly moving-event counts (one second per event at 45 km/h, 10 km/L, and 2.68 kg CO₂/L). Label those estimates; they are not odometer or fuel-sensor data.

The overview chart plots hourly unique telemetry events and idling samples, not historical fleet-health categories. Its visible title is `Fleet activity trend`; do not call it a historical health trend unless severity history is implemented in the data pipeline. Frontend `npm run build`, Docker Maven package, and dashboard image builds passed. Docker API readiness is UP, dashboard responds HTTP 200, and the live overview reports 100,000 vehicles. GitHub commit `eb4144cffa92b45726322795618161ed23ce8d24` published the dashboard/API/simulator changes; CI run `36856602453` passed. The current snapshot has a high warning count because 5 events/second cannot keep 100,000 vehicles within the 5-minute freshness window. Older continuation notes above are historical and superseded by this section for runtime status.

### Blank page after demo sign-in: diagnosed and fixed

On 2026-09-30 the browser console showed `TypeError: Invalid option : option` from a `Date.toLocaleString()` call in the Reports/Analytics table. The invalid combination used `dateStyle` together with an hour field; React aborted rendering the entire dashboard after demo sign-in, which made the page appear blank. The formatter now uses explicit year/month/day/hour/minute options with UTC. After the change, the same browser tab rendered the dashboard, navigation, fleet table, charts, and alerts; the browser console’s earlier errors were from before the hot reload. `npm run build` passes after the fix. Local Vite preview: `http://localhost:5173/#overview`. The Docker dashboard `http://localhost:3000` remains a separate older image/runtime and should not be used to inspect the latest frontend source until Compose is successfully rebuilt.

## 15. Responsive UI and coincident map positions (2026-09-30)

At the user's 805 px browser width, the 224 px sidebar overlapped a workspace grid column that was only 190 px. Tablet responsive CSS now makes those widths match, reduces the metric cards to a clean two-column grid, stacks the trend charts, and narrows the global search. The observed page routes (Dashboard, Fleet Overview, Alerts, Analytics, Vehicles, Decisions, Reports, Settings, Drivers, Routes, Maintenance, Fuel) rendered with no browser console errors during the browser inspection. The local production build passed.

The API currently reports three demo vehicles with the same coordinates. Their old map pins occupied the same pixels and looked like one vehicle. The map now groups identical reported coordinates into one numbered marker; its popup lists each actual vehicle/status, and the adjacent list keeps the separate vehicles. Coordinates are not altered. Long IDs are visually truncated in the map list and remain available as the element title and in the vehicle table/details.

At tablet widths, long synthetic UUIDs now render as a compact prefix/ellipsis/suffix with the complete ID retained in the title and CSV. The Alerts table hides estimated-fuel and last-observed columns at this width and explains that those fields remain in Export CSV; its remaining columns fit without horizontal scrolling. Browser inspection confirmed the compact alert table and an empty browser error/warning log after the UI updates.

## 18. Verification and evidence refresh (2026-10-02)

The following checks passed in the project checkout:

- Frontend TypeScript and Vite production build: `npm run build`.
- Simulator tests: `PYTHONPATH=src python3.12 -m unittest discover -s tests -v` (3 passed).
- Compose syntax/config: `docker compose config --quiet`.
- Startup-script syntax: `bash -n scripts/start_demo.sh`.
- Browser inspection of Dashboard and Alerts: routes rendered API-backed data; browser console showed no warnings/errors.

Detailed run notes: `evidences/2026-10-01/build-and-simulator-tests.md`. The host's default `python3` is 3.9; use Python 3.12 for simulator tests. Dashboard and Alerts images are now saved under `evidences/2026-10-01/`, with their timestamped counts and limits in `screenshot-capture.md`, and embedded in Section 3.1 of the solution draft. These images document the local synthetic demo and do not count as load or observability evidence. Capture a fresh set against the final release candidate if the UI changes.

This project directory is a ChatGPT project mirror without `.git`. Changes made here are not automatically published; publish them through the authenticated GitHub interface or a real Git checkout, then verify the remote commit before marking publication complete. The `sources/` directory, if populated in a future mirror, remains read-only.

## 19. Architecture and relational model refresh (2026-10-01)

`docs/ARCHITECTURE.md` reflects the six-service local setup, ClickHouse hourly rollups, and observed local Reports/API behavior. Migration V6 now adds tenant/vehicle ownership tables, backfills them from existing data, and enforces composite foreign keys. Those changes are only in this local project mirror and have not been applied to the Mac database or verified by backend tests. Operational state/alerts remain intentional read projections; the vehicle catalog has identity fields only. `docs/adr/0003-analytical-store.md` records the ClickHouse choice and unverified scale/recovery limits. The next schema priority is to run V6 against clean and existing 100K databases and check the query plans.

`backend/src/main/resources/db/migration/V6__normalize_tenant_vehicle_ownership.sql` adds tenant and tenant-scoped vehicle identity tables, backfills IDs from existing telemetry/state/alerts/fuel data, and adds composite vehicle foreign keys. `TelemetryService` registers ownership keys before dependent writes. A migration-only commit initially failed CI because the API compatibility change had not landed yet. The follow-up API fix is on GitHub `main` in commit [`97c160b`](https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform/commit/97c160bf12a08605f8b74c0b54f2f3cb259df954), and CI run [`36866785103`](https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform/actions/runs/36866785103) passed. A local Maven/Testcontainers run passed 10 integration tests; a disposable PostgreSQL check applied V6 to 100,000 synthetic telemetry events plus representative alert/fuel rows and confirmed the catalog and all four foreign keys. These tests do not prove the user's persistent Compose volume is migrated. Access to the local Docker socket is currently denied in this workspace, so its current migration/runtime status must be rechecked before rebuilding or claiming it is current.

The current project status is maintained in [docs/PROJECT_CHECKLIST.md](PROJECT_CHECKLIST.md). This project mirror has no `.git` metadata; files edited here require a verified update to the connected GitHub repository before claiming they have been published.
