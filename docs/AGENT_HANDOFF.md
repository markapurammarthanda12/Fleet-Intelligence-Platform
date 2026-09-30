# Fleet Intelligence Platform — Agent Handoff

This document is the durable project brief for any coding agent or teammate continuing the repository. Read it together with `README.md`, `docs/PROJECT_BRIEF.md`, `docs/ARCHITECTURE.md`, the ADRs, and the original hackathon problem statement before changing direction.

> **Latest verified state — 2026-09-30:** The user's current priority is data-driven core fleet screens and live telemetry. Park Drivers, Routes/Dispatch, Maintenance, and Fuel workflows for later. On the connected Mac, 100,000 synthetic vehicle IDs and one base telemetry event per vehicle were generated; 101,026 JSONL lines include 1,026 intentional duplicate-delivery lines. Kafka/PostgreSQL processed the events idempotently: `GET /v1/fleet/overview?tenant_id=tenant-100k` returned `vehicles_seen: 100000`. Dataset files are in the ignored local `data/` folder and the database is in this machine's Docker volume; neither is on GitHub. The optional `live-simulator` Compose profile is running at 100 events/second through `POST /v1/telemetry` → Kafka → PostgreSQL; the dashboard refreshes every five seconds and gets locations from the API. This is synthetic simulation, not connected physical vehicles or proof of challenge-scale performance.
>
> The React source now targets `tenant-100k`, removes the fabricated fallback fleet/analytics/history, and parks the four placeholder workflow screens. `npm run build` passed after these edits. The refreshed dashboard image was built and is up on port 3000. Kafka and PostgreSQL are healthy; ClickHouse is running healthy. The existing API container was restarted but not rebuilt, so it still returns 404 for the hourly analytics API; Reports should show an unavailable state. Browser visual verification and GitHub CI for these latest edits are pending. Do not claim those checks passed. Generated `data/` must stay out of Git.

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

1. Investigate the Docker image build delay at Maven `dependency:go-offline`. CI proves compilation/tests pass, but the current local running API/dashboard are the earlier images. Adjust the Dockerfile/build path if needed, rebuild the services without deleting volumes, then verify `docker compose ps`, `/actuator/health/readiness`, fleet API and the dashboard browser. Record actual results.
2. Implement hosted OIDC browser sign-in after the user configures an identity provider, client ID, redirect URL and required claims/scopes. The local synthetic-data demo entry/sign-out flow is implemented, but is not authentication.
3. Produce a structured status/requirements matrix against the full PDF, including evidence and gaps. Fill in the provided solution document template with honest architecture, test and performance results; render/review the result.
4. Improve the simulator: trips, diagnostic/fault events, controlled out-of-order and duplicate rates, configurable bursts, and reproducible event-volume presets. Generate/seed 100K data in the demo path without checking giant generated output into Git.
5. Add fleet metadata/ownership schema and ER diagram; document 3NF and partitioning. Add time-series or columnar storage only after an explicit benchmark/design choice; provide a relational/NoSQL/polyglot rationale.
6. Verify the new ClickHouse batch analytics and Reports workflow end to end with generated history; add exports after the data path is proven.
7. Add keyset pagination, rate limits, authorization/audit/privacy lifecycle, retention, masking, and right-to-erasure tests. Add device authentication/mTLS and TLS for deployed environments.
8. Add dead-letter inspection/replay tooling, broker restart/consumer recovery evidence, multi-broker configuration, and cloud deployment artifacts. Choose a cloud/deployment target with the user if credentials/hosting are needed; maintain no-code-change portability.
9. Add metrics/logs/traces, security/dependency/image scanning, coverage reports and contract/acceptance tests. Validate test claims by exact CI artifacts, not workflow existence alone.
10. Benchmark API p95/p99, critical-alert and ingest-to-dashboard latency, throughput/error rate/consumer lag, 3x five-minute bursts and soak behavior. Do not claim challenge NFRs until measured, repeatable evidence exists.
11. Complete STRIDE threat model, algorithm complexity write-up, SQL `EXPLAIN ANALYZE` before/after, 3–5 ADRs, final demo script/video (max five minutes), and final `v1.0submission` tag before the challenge deadline.

## 8. Repository and workflow instructions

- GitHub repository: `https://github.com/markapurammarthanda12/Fleet-Intelligence-Platform`, default branch `main`.
- Earlier CI on commit `187a96b` passed simulator, 8 backend integration tests, and frontend build. Analytics/API changes later passed backend integration CI with the ClickHouse service mocked; inspect current main and the workflow before making claims about live ClickHouse runtime.
- The current ChatGPT project mirror's `AGENTS.md` says all files under `sources/` are read-only reference material. Never edit, rename, move, or delete anything in `sources/`. No files were present there at the last check.
- The workspace snapshot may not have `.git`; a `git status` failure does not mean the remote repo is missing. Use the connected GitHub integration or work in a normal authenticated clone/worktree. Check the remote `main` head immediately before making a push; do not overwrite a newer commit.
- Keep generated datasets, secrets, `.env`, and Docker volume data out of Git. Never commit access tokens/passwords. `.env.example` contains demo values only.
- Start local stack with Docker Desktop: `docker compose up --build`; browser `http://localhost:3000`; stop with `docker compose down`. Do not run `docker compose down -v` unless the user knowingly wants the local database/event history removed.
- Local Docker Desktop was inspected on 2026-09-30 after the user unlocked the Mac. The existing four-service stack is still running: PostgreSQL (`5432`, healthy), Kafka (`9092`, healthy), API (`8080`), and dashboard (`3000`). The updated five-service Compose stack has not started because its API image build stalls during Maven packaging. No volumes were removed; the existing services were left running. The ClickHouse image was pulled successfully, but no ClickHouse container is running.
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

The user has asked to complete the frontend first, then the backend, then the remaining deployment/hackathon work. Discuss a materially better direction with them before changing the agreed product scope. They specifically questioned the dashboard's **Fleet / tenant** text box: fleet managers operate a fleet, not an internal tenant ID. The frontend now opens into a fixed local **Demo fleet** workspace and sends `tenant-demo` internally; it no longer asks the operator to type this technical identifier. In hosted mode, the tenant should come from the authenticated account. Overview/Vehicles/Alerts use the telemetry API; vehicle rows open a detail panel with API-backed recent history and related alerts. The Alert Center supports local search and severity/status filtering but has no acknowledge action because no API endpoint exists for it. Global search filters the vehicle and alert lists. Reports uses the ClickHouse API. Drivers, Routes & Dispatch, Maintenance, and Fuel Management are synthetic previews with search, status filters, and sample-record detail panels, not live records. Finish visual/interaction completeness of all screens first; then connect those workflows to backend APIs in the backend phase. The frontend build passes locally. GitHub Actions runs `36714156145` and `36714177261` passed for the preview filter/detail changes. The later live vehicle-details/global-search changes are `5be3133` and `f788fb1`; CI needs checking on the latest commits. The local demo sign-in changes are `648a551` and `063a9e8`; they were just pushed and their CI is pending. The README and handoff now document the demo-only gate and the new live vehicle details; check the latest GitHub Actions runs before claiming CI verification.

## 14. Reference-aligned frontend pass (2026-09-30)

The user provided a multi-screen fleet dashboard image as a visual reference and asked for the same overall style with only minor product-appropriate changes. Keep the product name **Fleet Intelligence Platform**. The current frontend has been restyled around that reference: deep navy sidebar with blue active navigation; clean, compact white workspace; four summary cards; telemetry trend chart and status donut; map with a searchable vehicle list; alert center; analytics; detailed vehicle view; decision-rule catalog; reports; and settings. A local demo sign-in screen gates the dashboard. It is a session-only demo gate, not authentication.

`frontend/src/FleetMap.tsx` uses Leaflet with OpenStreetMap tiles and attribution. The map positions vehicles based on telemetry coordinates; tile loading needs network access in the user's browser, and the standard OSM tile service is suitable for this demo, not an assumed high-volume production deployment. The local browser settings hide map pins and coordinates when “Show vehicle locations on map” is off. The displayed fleet and chart data are synthetic when the API is unavailable and carry a visible sample-data label. Java record camelCase JSON fields are normalized in `frontend/src/App.tsx` before use by the dashboard.

Decision-rule create/pause/remove actions and dashboard preferences persist in browser localStorage only; they do not update server policy. Drivers, Routes & Dispatch, Maintenance, and Fuel are sample-data previews. API-backed workflows include fleet overview/vehicles/alerts when the API is reachable, vehicle history, and hourly analytics when ClickHouse/API are ready. Do not describe every screen as a production-connected workflow.

Frontend package now includes Leaflet and `@types/leaflet`. `npm run build` passed locally after the reference-aligned pass (TypeScript and Vite production build). The running source preview is `http://127.0.0.1:5173`; the Docker dashboard at port 3000 remains an older image until the previously stalled Maven/Docker rebuild is resolved and Compose is rebuilt. Latest frontend source changes from this pass still need to be pushed to GitHub and CI rechecked.

Next: publish the frontend components/styles/package lock and update README/handoff; inspect the rendered page at 5173 after the user opens it, especially the first-run local demo sign-in, responsive narrow layout, map, and each sidebar route. Continue frontend visual/interaction refinement before starting the separate backend completion phase. Then address the outstanding backend and hackathon requirements already listed above.

### Blank page after demo sign-in: diagnosed and fixed

On 2026-09-30 the browser console showed `TypeError: Invalid option : option` from a `Date.toLocaleString()` call in the Reports/Analytics table. The invalid combination used `dateStyle` together with an hour field; React aborted rendering the entire dashboard after demo sign-in, which made the page appear blank. The formatter now uses explicit year/month/day/hour/minute options with UTC. After the change, the same browser tab rendered the dashboard, navigation, fleet table, charts, and alerts; the browser console’s earlier errors were from before the hot reload. `npm run build` passes after the fix. Local Vite preview: `http://localhost:5173/#overview`. The Docker dashboard `http://localhost:3000` remains a separate older image/runtime and should not be used to inspect the latest frontend source until Compose is successfully rebuilt.

## 15. Responsive UI and coincident map positions (2026-09-30)

At the user's 805 px browser width, the 224 px sidebar overlapped a workspace grid column that was only 190 px. Tablet responsive CSS now makes those widths match, reduces the metric cards to a clean two-column grid, stacks the trend charts, and narrows the global search. The observed page routes (Dashboard, Fleet Overview, Alerts, Analytics, Vehicles, Decisions, Reports, Settings, Drivers, Routes, Maintenance, Fuel) rendered with no browser console errors during the browser inspection. The local production build passed.

The API currently reports three demo vehicles with the same coordinates. Their old map pins occupied the same pixels and looked like one vehicle. The map now groups identical reported coordinates into one numbered marker; its popup lists each actual vehicle/status, and the adjacent list keeps the separate vehicles. Coordinates are not altered. Long IDs are visually truncated in the map list and remain available as the element title and in the vehicle table/details.

At tablet widths, long synthetic UUIDs now render as a compact prefix/ellipsis/suffix with the complete ID retained in the title and CSV. The Alerts table hides estimated-fuel and last-observed columns at this width and explains that those fields remain in Export CSV; its remaining columns fit without horizontal scrolling. Browser inspection confirmed the compact alert table and an empty browser error/warning log after the UI updates.
