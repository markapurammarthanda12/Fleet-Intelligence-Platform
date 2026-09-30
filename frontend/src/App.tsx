import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type FleetAlert = {
  alert_id: string;
  tenant_id: string;
  vehicle_id: string;
  rule_version: string;
  severity: string;
  episode_started_at: string;
  last_observed_at: string;
  idle_seconds: number;
  estimated_fuel_litres: number;
  status: "open" | "resolved" | string;
  resolved_at: string | null;
};

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function App() {
  const [tenantInput, setTenantInput] = useState("tenant-00");
  const [tenant, setTenant] = useState("tenant-00");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [alerts, setAlerts] = useState<FleetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!tenant.trim()) return;
    try {
      const query = new URLSearchParams({ tenant_id: tenant.trim(), limit: "500" });
      const response = await fetch(`/api/v1/alerts?${query.toString()}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`The API returned ${response.status}.`);
      const result = (await response.json()) as FleetAlert[];
      setAlerts(result);
      setError("");
      setLastUpdated(new Date());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load fleet alerts.");
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const visibleAlerts = useMemo(() => {
    const vehicle = vehicleFilter.trim().toLowerCase();
    return alerts.filter((alert) => {
      const matchesVehicle = !vehicle || alert.vehicle_id.toLowerCase().includes(vehicle);
      const matchesStatus = statusFilter === "all" || alert.status === statusFilter;
      return matchesVehicle && matchesStatus;
    });
  }, [alerts, statusFilter, vehicleFilter]);

  const openCount = alerts.filter((alert) => alert.status === "open").length;
  const criticalCount = alerts.filter((alert) => alert.status === "open" && alert.severity === "critical").length;
  const estimatedFuel = alerts
    .filter((alert) => alert.status === "open")
    .reduce((total, alert) => total + alert.estimated_fuel_litres, 0);

  function applyTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (tenantInput.trim()) setTenant(tenantInput.trim());
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Fleet Intelligence Platform home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3.5 16.5 8.7 11l3.3 3 7.9-8" />
              <path d="M14.8 6H20v5.2" />
              <path d="M4 20h16" />
            </svg>
          </span>
          <span className="brand-name">Fleet Intelligence</span>
        </a>
        <div className="topbar-right">
          <span className="workspace-label">Operations workspace</span>
          <span className="avatar" aria-label="Fleet operator">FO</span>
        </div>
      </header>

      <section className="page-heading">
        <div>
          <div className="eyebrow">CONNECTED FLEET · OVERVIEW</div>
          <h1>Operations overview</h1>
          <p className="subtitle">A clear view of fleet signals that may need your attention.</p>
        </div>
        <div className="live-status">
          <span className="pulse" />
          <span>Live updates</span>
          <span className="status-divider" />
          <span>Every 5 seconds</span>
        </div>
      </section>

      <section className="filters panel" aria-label="Alert filters">
        <form className="tenant-control" onSubmit={applyTenant}>
          <label htmlFor="tenant">Fleet / tenant</label>
          <div className="input-button">
            <input
              id="tenant"
              value={tenantInput}
              onChange={(event) => setTenantInput(event.target.value)}
              aria-label="Tenant identifier"
            />
            <button type="submit">View fleet</button>
          </div>
        </form>
        <label className="filter-control">
          <span>Vehicle</span>
          <input
            value={vehicleFilter}
            onChange={(event) => setVehicleFilter(event.target.value)}
            placeholder="Search vehicle ID"
            aria-label="Filter by vehicle ID"
          />
        </label>
        <label className="filter-control status-control">
          <span>Alert status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by alert status"
          >
            <option value="all">All alerts</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
        <button className="refresh-button" type="button" onClick={() => void refresh()}>
          <span aria-hidden="true">↻</span> Refresh
        </button>
      </section>

      <section className="metrics" aria-label="Fleet summary">
        <article className="metric-card panel">
          <div className="metric-top"><span>Open alerts</span><span className="metric-icon orange">!</span></div>
          <strong>{openCount}</strong>
          <small>Require fleet operator attention</small>
        </article>
        <article className="metric-card panel">
          <div className="metric-top"><span>Estimated idle fuel</span><span className="metric-icon blue">◒</span></div>
          <strong>{estimatedFuel.toFixed(2)} <em>L</em></strong>
          <small>Estimate for open idling alerts</small>
        </article>
        <article className="metric-card panel">
          <div className="metric-top"><span>Critical alerts</span><span className="metric-icon violet">!</span></div>
          <strong>{criticalCount}</strong>
          <small>Open idling alerts at 15+ minutes</small>
        </article>
      </section>

      <section className="alerts-section panel">
        <div className="section-heading">
          <div>
            <div className="section-title-row"><h2>Fleet alerts</h2><span className="count-pill">{visibleAlerts.length}</span></div>
            <p>Explainable signals from connected-vehicle activity</p>
          </div>
          <div className="last-updated">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Waiting for data"}
          </div>
        </div>

        {error && <div className="notice error" role="alert"><strong>Can’t reach the fleet API.</strong> {error}</div>}
        {loading ? (
          <div className="empty-state"><span className="loading-ring" /> Loading fleet alerts…</div>
        ) : visibleAlerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <strong>{alerts.length === 0 ? "No alerts for this fleet" : "No alerts match these filters"}</strong>
            <span>{alerts.length === 0 ? "New explainable fleet signals will appear here as vehicle events arrive." : "Try a different vehicle or status filter."}</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Signal</th>
                  <th>Vehicle</th>
                  <th>Idle duration</th>
                  <th>Est. fuel</th>
                  <th>Started</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleAlerts.map((alert) => (
                  <tr key={alert.alert_id}>
                    <td><span className={`signal-dot signal-${alert.severity}`} />Prolonged idling<small className="rule">Rule {alert.rule_version}</small></td>
                    <td><span className="vehicle-id">{alert.vehicle_id}</span><small className="tenant-id">{alert.tenant_id}</small></td>
                    <td>{formatDuration(alert.idle_seconds)}</td>
                    <td className="fuel-value">{alert.estimated_fuel_litres.toFixed(2)} L</td>
                    <td>{formatDate(alert.episode_started_at)}</td>
                    <td><span className={`badge badge-${alert.severity}`}><span />{alert.severity}</span><small className={`alert-status status-${alert.status}`}>{alert.status}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="table-footer">
          <span>Showing up to 500 alerts for <strong>{tenant}</strong></span>
          <span>Fuel estimate is an assumption-based indicator, not a measured saving.</span>
        </footer>
      </section>

      <footer className="page-footer">
        <span>Fleet Intelligence Platform</span>
        <span>Connected data. Clear decisions.</span>
      </footer>
    </main>
  );
}
