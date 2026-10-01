CREATE TABLE tenants (
    tenant_id VARCHAR(64) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
    tenant_id VARCHAR(64) NOT NULL,
    vehicle_id VARCHAR(64) NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, vehicle_id),
    CONSTRAINT vehicles_tenant_fk FOREIGN KEY (tenant_id)
        REFERENCES tenants (tenant_id)
);

-- Preserve existing identities from all data paths, including the synthetic
-- fuel history which may exist before a vehicle has ever reported telemetry.
INSERT INTO tenants (tenant_id)
SELECT tenant_id FROM telemetry_events
UNION SELECT tenant_id FROM vehicle_runtime_state
UNION SELECT tenant_id FROM fleet_alerts
UNION SELECT tenant_id FROM fuel_purchases
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO vehicles (tenant_id, vehicle_id)
SELECT tenant_id, vehicle_id FROM telemetry_events
UNION SELECT tenant_id, vehicle_id FROM vehicle_runtime_state
UNION SELECT tenant_id, vehicle_id FROM fleet_alerts
UNION SELECT tenant_id, vehicle_id FROM fuel_purchases
ON CONFLICT (tenant_id, vehicle_id) DO NOTHING;

ALTER TABLE telemetry_events
    ADD CONSTRAINT telemetry_events_vehicle_fk
    FOREIGN KEY (tenant_id, vehicle_id)
    REFERENCES vehicles (tenant_id, vehicle_id)
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE vehicle_runtime_state
    ADD CONSTRAINT vehicle_runtime_state_vehicle_fk
    FOREIGN KEY (tenant_id, vehicle_id)
    REFERENCES vehicles (tenant_id, vehicle_id);

ALTER TABLE fleet_alerts
    ADD CONSTRAINT fleet_alerts_vehicle_fk
    FOREIGN KEY (tenant_id, vehicle_id)
    REFERENCES vehicles (tenant_id, vehicle_id);

ALTER TABLE fuel_purchases
    ADD CONSTRAINT fuel_purchases_vehicle_fk
    FOREIGN KEY (tenant_id, vehicle_id)
    REFERENCES vehicles (tenant_id, vehicle_id);
