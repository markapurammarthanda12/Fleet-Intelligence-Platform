CREATE TABLE telemetry_events (
    event_id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    vehicle_id VARCHAR(64) NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    latitude NUMERIC(9, 6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(9, 6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    speed_kmh NUMERIC(6, 2) NOT NULL CHECK (speed_kmh BETWEEN 0 AND 400),
    engine_on BOOLEAN NOT NULL,
    event_sequence BIGINT CHECK (event_sequence >= 0),
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, event_id)
);

CREATE INDEX telemetry_events_tenant_vehicle_time_idx
    ON telemetry_events (tenant_id, vehicle_id, observed_at DESC);
