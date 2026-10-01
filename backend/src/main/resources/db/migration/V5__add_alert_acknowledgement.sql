ALTER TABLE fleet_alerts
    ADD COLUMN acknowledged_at TIMESTAMPTZ,
    ADD COLUMN acknowledged_by VARCHAR(128);

CREATE INDEX fleet_alerts_tenant_status_recent_idx
    ON fleet_alerts (tenant_id, status, last_observed_at DESC);
