# Security threat model

Scope: the current synthetic telemetry path from the REST ingestion API through Kafka, PostgreSQL, ClickHouse, and tenant-scoped API reads. This is a design review for the hackathon prototype, not a penetration test or legal compliance certification.

## Assets and trust boundaries

- Tenant and vehicle identity, location, speed, engine state, alert history, and simulated fuel purchases.
- REST requests cross the public API boundary; Kafka carries validated events between services; PostgreSQL and ClickHouse hold operational and analytical copies.
- In local Compose, the browser and APIs use demo mode, services share a private Compose network, Kafka uses plaintext, and example database credentials are local-only. This mode is not safe for public exposure.
- Hosted API mode can validate OIDC JWT signature, issuer and expiry; endpoint scopes and the signed `tenant_id` claim are checked. No hosted identity provider or interactive dashboard OIDC client is configured in the demo.

## STRIDE review

| Threat | Example | Existing control | Gap / next control |
|---|---|---|---|
| Spoofing | A client pretends to be a fleet user or vehicle | Hosted API mode validates OIDC JWTs and scopes; local mode is explicitly demo-only | Configure hosted OIDC and device identity; add per-device mTLS before accepting real vehicle traffic |
| Tampering | An attacker changes event values or replays an event | Request validation; immutable event ID; `(tenant_id, event_id)` uniqueness; event-time state does not rewind on late events | Require TLS 1.3 at ingress and between services; define a versioned JSON Schema/Schema Registry policy and validate schema evolution |
| Repudiation | An operator denies acknowledging an alert or accessing a location | Alert acknowledgement fields capture a demo operator and time | Add append-only audit events for reads, writes, exports, and administrative actions with authenticated subject, tenant, timestamp, and outcome |
| Information disclosure | Tenant A requests tenant B's vehicles or location | Hosted API scope/tenant claim checks; composite tenant/vehicle foreign keys; tenant-filtered queries | Add audit review, location masking, short-lived scoped tokens, retention/deletion workflows, and cross-tenant DAST tests; do not expose demo mode publicly |
| Denial of service | Burst traffic exhausts API threads, broker, database connections, or ClickHouse | Kafka decouples accepted ingress from consumers; bounded request validation and retry/DLQ behavior | Add authenticated per-tenant/device rate limits, body-size limits, quotas, back-pressure metrics, broker quotas, load tests, and autoscaling; none is proven at challenge load |
| Elevation of privilege | A read-only principal acknowledges alerts or crosses tenant scope | Separate `fleet.read`, `fleet.ingest`, and `fleet.write` scopes; method-level authorization and tenant claim checks | Define a formal role matrix, least-privilege deployment identities, secret rotation, and automated authorization tests for every endpoint |

## Priority controls

1. Keep local demo mode bound to a developer environment; never publish its unauthenticated API or local credentials.
2. Configure OIDC issuer/client, signed tenant claims, and separate read/ingest/write scopes before shared deployment.
3. Terminate TLS at an ingress proxy and use encrypted broker/database links; issue per-device identities and mTLS if devices connect directly.
4. Add append-only audit records, location masking, data-retention enforcement, and tenant-scoped erasure/export workflows before processing personal data.
5. Add request quotas, rate limits, dependency/image scans, DAST, and recovery/load tests. The current prototype has no verified scan or test report for these controls.

## Data lifecycle and privacy

The simulator creates synthetic data and no real driver or vehicle-owner records are intentionally used. Kafka retains events for seven days; ClickHouse raw and hourly data use a 90-day TTL. PostgreSQL currently has no verified tenant deletion or privacy-erasure workflow, and no cold object-store tier is implemented. Location is displayed from generated telemetry without masking in the local demo. For real data, define purpose limitation, retention periods, role-based access, audit review, masking precision, backup deletion, and subject-request handling before collection. This document records technical work still needed; it does not claim GDPR/DPDP compliance.
