# Algorithms, capacity, and consistency notes

## Problem and current decision rule

The first end-to-end decision is prolonged idling. For each tenant/vehicle pair, the consumer keeps the latest event-time snapshot, tracks when a stationary episode began, opens a warning after `IDLE_ALERT_SECONDS`, escalates to critical after `IDLE_CRITICAL_SECONDS`, and resolves the episode when a newer moving or engine-off event arrives. Defaults are 300 seconds for warning and 900 seconds for critical. Estimated idle fuel is `configured_litres_per_hour × idle_seconds / 3600`; it is illustrative and is not a measured saving.

```text
on event e:
  if event_id already exists for e.tenant: acknowledge duplicate and stop
  register tenant and vehicle identity in the same database transaction
  lock the tenant/vehicle state row
  if e.observed_at <= state.last_observed_at:
      keep event history; do not rewind current state; stop
  if e is not engine_on and stationary:
      clear stationary_since; resolve any open idle episode
  else if e is stationary:
      stationary_since = existing value or e.observed_at
      duration = e.observed_at - stationary_since
      if duration >= warning threshold: open or refresh warning/critical alert
  else:
      clear stationary_since; resolve any open idle episode
  persist the newer current-state projection and commit
```

The event identity index and vehicle-state primary key make average database lookup/update cost logarithmic in table size (`O(log N)`) for a B-tree, with storage I/O and Kafka/network work dominant. One event needs a bounded number of indexed writes, so application working memory per event is `O(1)`; broker and database queues add bounded buffering. Kafka keys events by `tenant_id:vehicle_id`, preserving partition order for a vehicle, not correcting event time. Late events are stored as history but do not rewind the latest operational projection.

## Other algorithms in the implementation

- **Synthetic generation:** deterministic seeded PRNG and lazy iterators. Producing `V` vehicle records costs `O(V)` time and `O(1)` generator state (materializing them in a list uses `O(V)` memory). Producing `E` base events costs `O(E)` time plus occasional intentional duplicate output. Three Python tests passed, including a generated 100,000-ID uniqueness check; this is a dataset correctness test, not a throughput measurement.
- **Alert listing:** order by open status, newest observation, severity, and idle duration. Before V7 the database scanned `A` tenant alerts and top-N sorted them (`O(A log L)` comparison work for a top-N implementation, with `A` rows read); the matching expression index now seeks by tenant and yields the requested `L` rows in order (`O(log A + L)` index work). One local 100-row comparison measured 12.910 ms for a forced scan/sort plan and 0.100 ms for the index plan on a warm cache.
- **Fleet overview:** aggregate latest state for all `V` vehicles and join open alert severity. It must examine the current projection, so work is `O(V + A_open)`; a local one-shot plan over 100,000 vehicles completed in 82.143 ms. This is one plan sample, not p95/p99.
- **Vehicle page:** seek the tenant/latest index and return at most `L=200` latest states, with indexed open-alert existence/count lookups; one local plan returned 200 rows in 0.461 ms on a warm cache.
- **Historical reports:** hourly exact distinct-count aggregate states are stored in a partitioned `AggregatingMergeTree`. Full hours merge aggregate states; raw telemetry is read only for partial first/last hours. ClickHouse partitions by month and sorts by `(tenant_id, bucket_start)`. One populated local analytics API request returned 15 rows in 0.690 s; a prior 37-hour report sample was about 0.2 s. Do not infer load capacity from either sample.

## Capacity arithmetic from the case study

These are workload estimates from the official brief, not observed system capacity. Using decimal units and the brief's approximately 1 KB/event:

| Scenario | Events | Payload estimate |
|---|---:|---:|
| Baseline, 100,000 vehicles × 1 event/s | 100,000 events/s | about 100 MB/s; 8.64 TB/day; 3.15 PB/year raw |
| 3× five-minute burst | 300,000 events/s for 300 s | 90 million events; about 90 GB total, 60 GB above the baseline five-minute volume |
| Current Compose simulator | configured 5 events/s | a demo setting only; not a measured sustained rate |

Actual bytes, compression, replication, indexes, aggregates, and retention change disk/network requirements. At the baseline, seven days of uncompressed raw Kafka payload alone would be about 60.5 TB before replication and broker overhead. A replicated production topology would multiply storage. The existing local broker's 12 partitions and replication factor 1 are only demo settings; partition count, broker count, consumer parallelism, disk, network, ClickHouse parts, and PostgreSQL write capacity need a controlled benchmark and lag/reconciliation measurements before sizing.

## Persistence, partitioning, and consistency choices

| Data | Store and key | Consistency / trade-off | Retention in current configuration |
|---|---|---|---|
| Tenant/vehicle ownership, event identity, latest state, alert lifecycle, simulated refuelling | PostgreSQL; composite `(tenant_id, vehicle_id)` ownership and `(tenant_id, event_id)` deduplication | Transactional/CP-oriented writes: reject unavailable writes rather than accept cross-tenant or duplicate state; no HA claim in local Compose | Persistent local volume; application-level expiry/erasure not implemented |
| Replayable telemetry stream | Kafka; key `tenant_id:vehicle_id`, currently 12 partitions | Durable acknowledgement and per-key partition ordering; consumer views are eventually consistent with API acceptance | Seven days; current single broker/RF=1 is a single point of failure |
| Historical telemetry and hourly report aggregates | ClickHouse MergeTree/AggregatingMergeTree, monthly `toYYYYMM` partitions; order by tenant/time | Independent consumer means reports can lag the operational store; optimize bounded scans and eventual consistency over cross-store transactions | 90-day TTL for raw telemetry; hourly table uses the same bucket-month partitioning |
| Cold archive / vector retrieval | Not implemented | No justified current use case for vectors; object storage/Parquet is a future cost tier | None |

CAP/PACELC decisions are provisional for the prototype. The relational ownership/alert transaction favors consistency and may reject writes during a partition (CP-oriented). The Kafka stream buffers accepted events for replay, but the local single broker cannot remain available after broker failure. ClickHouse is a separately consumed analytical copy; dashboards may see it later than the operational path (eventual consistency). No multi-node configuration or availability percentage has been verified.

## Evidence limits

Evidence and full query plans are recorded in [`../evidences/2026-10-02/runtime-and-query-plan-check.md`](../evidences/2026-10-02/runtime-and-query-plan-check.md). No test at 100,000 events/s, 3× burst, or billions of rows has been run. API p95/p99, ingest-to-dashboard freshness, critical-alert latency, consumer lag under load, data loss, soak, and failover remain unmeasured or unverified.
