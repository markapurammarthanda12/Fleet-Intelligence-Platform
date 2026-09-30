# ADR 0002 Defer production messaging and persistence choices

- Status: Proposed
- Context: The challenge expects durable replayable messaging and a justified combination of relational and non-relational storage.
- Decision: Keep the local starter process in memory to shorten the first iteration. Before scale work, compare Kafka-compatible messaging, PostgreSQL for relational records, and a time-series or columnar store for telemetry using measured workloads.
- Consequences: The starter loses state on restart and cannot demonstrate replay, high availability, or the required polyglot persistence. Those are explicit implementation milestones, not hidden assumptions.
