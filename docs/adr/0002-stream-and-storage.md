# ADR 0002 Defer production messaging and persistence choices

- Status: Accepted for the first persistence milestone; stream components remain proposed
- Context: The challenge expects durable replayable messaging and a justified combination of relational and non-relational storage.
- Decision: Use PostgreSQL for the first durable telemetry slice and enforce event idempotency with a unique event identifier. Add Kafka-compatible messaging and a separate time-series or columnar store after the end-to-end slice is established and workload measurements justify the design.
- Consequences: Telemetry and rule state now survive API restarts, duplicate retries are safe, and idling alerts retain their rule version and assumptions. The platform still cannot demonstrate replayable stream processing, horizontal ingestion at challenge scale, or polyglot persistence; those remain explicit milestones.
