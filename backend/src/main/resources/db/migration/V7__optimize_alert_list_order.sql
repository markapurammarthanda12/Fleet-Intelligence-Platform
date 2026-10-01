-- Keep the alert list's priority ordering in an index so PostgreSQL can stop
-- after the requested page instead of sorting every alert for the tenant.
CREATE INDEX fleet_alerts_tenant_list_order_idx
    ON fleet_alerts (
        tenant_id,
        (CASE WHEN status = 'open' THEN 0 ELSE 1 END),
        last_observed_at DESC,
        (CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END),
        idle_seconds DESC
    );
