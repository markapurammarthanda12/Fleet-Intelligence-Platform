CREATE DATABASE IF NOT EXISTS fleet_analytics;

DROP TABLE IF EXISTS fleet_analytics.telemetry_stream_to_store;
DROP TABLE IF EXISTS fleet_analytics.telemetry_kafka;

CREATE TABLE IF NOT EXISTS fleet_analytics.telemetry_events
(
    event_id String,
    tenant_id LowCardinality(String),
    vehicle_id String,
    observed_at DateTime64(3, 'UTC'),
    latitude Float64,
    longitude Float64,
    speed_kmh Float32,
    engine_on Bool,
    sequence Nullable(UInt64),
    received_at DateTime64(3, 'UTC') DEFAULT now64(3)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(observed_at)
ORDER BY (tenant_id, observed_at, vehicle_id, event_id)
TTL observed_at + INTERVAL 90 DAY DELETE;

CREATE TABLE IF NOT EXISTS fleet_analytics.telemetry_kafka
(
    event_id String,
    tenant_id String,
    vehicle_id String,
    observed_at String,
    latitude Float64,
    longitude Float64,
    speed_kmh Float32,
    engine_on Bool,
    sequence Nullable(UInt64)
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'fleet.telemetry.v1',
    kafka_group_name = 'fleet-clickhouse-analytics-v2',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 3,
    kafka_max_block_size = 1000;

CREATE MATERIALIZED VIEW IF NOT EXISTS fleet_analytics.telemetry_stream_to_store
TO fleet_analytics.telemetry_events
AS SELECT
    event_id,
    tenant_id,
    vehicle_id,
    parseDateTime64BestEffort(observed_at, 3, 'UTC') AS observed_at,
    latitude,
    longitude,
    speed_kmh,
    engine_on,
    sequence
FROM fleet_analytics.telemetry_kafka;
