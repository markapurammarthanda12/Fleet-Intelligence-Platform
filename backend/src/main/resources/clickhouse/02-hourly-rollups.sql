CREATE TABLE IF NOT EXISTS fleet_analytics.telemetry_hourly_rollup
(
    tenant_id LowCardinality(String),
    bucket_start DateTime('UTC'),
    unique_events_state AggregateFunction(uniqExact, String),
    vehicles_seen_state AggregateFunction(uniqExact, String),
    idling_events_state AggregateFunction(uniqExactIf, String, UInt8),
    moving_events_state AggregateFunction(uniqExactIf, String, UInt8)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(bucket_start)
ORDER BY (tenant_id, bucket_start);

CREATE MATERIALIZED VIEW IF NOT EXISTS fleet_analytics.telemetry_events_to_hourly_rollup
TO fleet_analytics.telemetry_hourly_rollup
AS SELECT
    tenant_id,
    toStartOfHour(observed_at) AS bucket_start,
    uniqExactState(event_id) AS unique_events_state,
    uniqExactState(vehicle_id) AS vehicles_seen_state,
    uniqExactIfState(event_id, engine_on AND speed_kmh <= 0.5) AS idling_events_state,
    uniqExactIfState(event_id, engine_on AND speed_kmh > 0.5) AS moving_events_state
FROM fleet_analytics.telemetry_events
GROUP BY tenant_id, bucket_start;

CREATE TABLE IF NOT EXISTS fleet_analytics.rollup_backfill_status
(
    version UInt8
)
ENGINE = MergeTree
ORDER BY version;
