CREATE TABLE vehicle_runtime_state (
    tenant_id VARCHAR(64) NOT NULL,
    vehicle_id VARCHAR(64) NOT NULL,
    last_observed_at TIMESTAMPTZ NOT NULL,
    stationary_since TIMESTAMPTZ,
    alert_open BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, vehicle_id)
);

CREATE TABLE fleet_alerts (
    alert_id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    vehicle_id VARCHAR(64) NOT NULL,
    rule_version VARCHAR(32) NOT NULL,
    severity VARCHAR(16) NOT NULL,
    episode_started_at TIMESTAMPTZ NOT NULL,
    last_observed_at TIMESTAMPTZ NOT NULL,
    idle_seconds BIGINT NOT NULL CHECK (idle_seconds >= 0),
    estimated_fuel_litres NUMERIC(12, 3) NOT NULL CHECK (estimated_fuel_litres >= 0),
    status VARCHAR(16) NOT NULL DEFAULT 'open',
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, vehicle_id, rule_version, episode_started_at)
);

CREATE INDEX fleet_alerts_tenant_recent_idx
    ON fleet_alerts (tenant_id, last_observed_at DESC);
