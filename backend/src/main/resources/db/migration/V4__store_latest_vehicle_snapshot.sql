ALTER TABLE vehicle_runtime_state
    ADD COLUMN latitude NUMERIC(9, 6),
    ADD COLUMN longitude NUMERIC(9, 6),
    ADD COLUMN speed_kmh NUMERIC(6, 2),
    ADD COLUMN engine_on BOOLEAN,
    ADD COLUMN event_sequence BIGINT;

-- Backfill the current snapshot once from the append-only history. The runtime
-- table is then maintained transactionally by the telemetry consumer.
WITH latest AS (
    SELECT DISTINCT ON (tenant_id, vehicle_id)
           tenant_id, vehicle_id, latitude, longitude, speed_kmh, engine_on, event_sequence
    FROM telemetry_events
    ORDER BY tenant_id, vehicle_id, observed_at DESC,
             event_sequence DESC NULLS LAST, ingested_at DESC
)
UPDATE vehicle_runtime_state state
SET latitude = latest.latitude,
    longitude = latest.longitude,
    speed_kmh = latest.speed_kmh,
    engine_on = latest.engine_on,
    event_sequence = latest.event_sequence
FROM latest
WHERE state.tenant_id = latest.tenant_id
  AND state.vehicle_id = latest.vehicle_id;

ALTER TABLE vehicle_runtime_state
    ALTER COLUMN latitude SET NOT NULL,
    ALTER COLUMN longitude SET NOT NULL,
    ALTER COLUMN speed_kmh SET NOT NULL,
    ALTER COLUMN engine_on SET NOT NULL;

CREATE INDEX vehicle_runtime_state_tenant_latest_idx
    ON vehicle_runtime_state (tenant_id, last_observed_at DESC);

CREATE INDEX fleet_alerts_open_tenant_vehicle_idx
    ON fleet_alerts (tenant_id, vehicle_id)
    INCLUDE (estimated_fuel_litres)
    WHERE status = 'open';
