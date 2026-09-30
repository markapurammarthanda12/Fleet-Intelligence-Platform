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

type FleetOverview = {
  vehicles_seen: number;
  moving_now: number;
  idling_now: number;
  inactive_now: number;
  offline: number;
  open_alerts: number;
  estimated_idle_fuel_litres: number;
  latest_event_at: string | null;
};

type FleetVehicle = {
  tenant_id: string;
  vehicle_id: string;
  status: "moving" | "idling" | "inactive" | "offline";
  last_seen_at: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  open_alert_count: number;
};

const emptyOverview: FleetOverview = {
  vehicles_seen: 0,
  moving_now: 0,
  idling_now: 0,
  inactive_now: 0,
  offline: 0,
  open_alerts: 0,
  estimated_idle_fuel_litres: 0,
  latest_event_at: null,
};

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatDate(value: string | null) {
  if (!value) return "No event received yet";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatCoordinate(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

export default function App() {
  const [tenantInput, setTenantInput] = useState("tenant-demo");
  const [tenant, setTenant] = useState("tenant-demo");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [overview, setOverview] = useState<FleetOverview>(emptyOverview);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [alerts, setAlerts] = useState<FleetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!tenant.trim()) return;
    try {
      const query = new URLSearchParams({ tenant_id: tenant.trim(), limit: "200" });
      const [overviewResponse, vehiclesResponse, alertsResponse] = await Promise.all([
        fetch(`/api/v1/fleet/overview?tenant_id=${encodeURIComponent(tenant.trim())}`, { headers: { Accept: "application/json" } }),
        fetch(`/api/v1/vehicles?${query.toString()}`, { headers: { Accept: "application/json" } }),
        fetch(`/api/v1/alerts?${query.toString()}`, { headers: { Accept: "application/json" } }),
      ]);
      for (const response of [overviewResponse, vehiclesResponse, alertsResponse]) {
        if (!response.ok) throw new Error(`The fleet API returned ${response.status}.`);
      }
      const [nextOverview, nextVehicles, nextAlerts] = await Promise.all([
        overviewResponse.json() as Promise<FleetOverview>,
        vehiclesResponse.json() as Promise<FleetVehicle[]>,
        alertsResponse.json() as Promise<FleetAlert[]>,
      ]);
      setOverview(nextOverview);
      setVehicles(nextVehicles);
      setAlerts(nextAlerts);
      setError("");
      setLastUpdated(new Date());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load fleet data.");
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const visibleVehicles = useMemo(() => {
    const filter = vehicleFilter.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      const matchesName = !filter || vehicle.vehicle_id.toLowerCase().includes(filter);
      const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
      return matchesName && matchesStatus;
    });
  }, [statusFilter, vehicleFilter, vehicles]);

  function applyTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (tenantInput.trim()) setTenant(tenantInput.trim());
  }

  return (
    <div className="app-layout">
      <aside className="sidebar" aria-label="Fleet sections">
        <a className="brand" href="#overview" aria-label="Fleet Intelligence Platform home">
          <span className="brand-mark" aria-hidden="true">↗</span>
          <span className="brand-name">Fleet Intelligence</span>
        </a>
        <nav className="side-nav">
          <a className="nav-item selected" href="#overview"><span>▦</span>Overview</a>
          <a className="nav-item" href="#vehicles"><span>▣</span>Vehicles <small>{overview.vehicles_seen}</small></a>
          <a className="nav-item" href="#alerts"><span>⚑</span>Alerts <small className="alert-count">{overview.open_alerts}</small></a>
          <div className="nav-divider" />
          <div className="nav-caption">MORE FLEET WORKFLOWS</div>
          <span className="nav-item planned"><span>♙</span>Drivers <small>Planned</small></span>
          <span className="nav-item planned"><span>⌁</span>Routes &amp; dispatch <small>Planned</small></span>
          <span className="nav-item planned"><span>⚒</span>Maintenance <small>Planned</small></span>
          <span className="nav-item planned"><span>◉</span>Fuel management <small>Planned</small></span>
          <span className="nav-item planned"><span>▥</span>Reports <small>Planned</small></span>
        </nav>
        <div className="sidebar-footer">Connected data.<br />Clear decisions.</div>
      </aside>

      <main className="workspace" id="overview">
        <header className="topbar">
          <div className="breadcrumb">Fleet overview <span>/</span> Operations</div>
          <div className="topbar-right">
            <span className="workspace-label">Local demo workspace</span>
            <span className="avatar" aria-label="Fleet operator">FO</span>
          </div>
        </header>

        <div className="content">
          <section className="page-heading">
            <div>
              <div className="eyebrow">CONNECTED FLEET · OVERVIEW</div>
              <h1>Fleet overview</h1>
              <p className="subtitle">A live view of vehicles and operational signals received by the platform.</p>
            </div>
            <div className="heading-actions">
              <span className="data-freshness">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Waiting for data"}</span>
              <button className="refresh-button" type="button" onClick={() => void refresh()}>↻ Refresh</button>
            </div>
          </section>

          <section className="filters panel" aria-label="Fleet filters">
            <form className="tenant-control" onSubmit={applyTenant}>
              <label htmlFor="tenant">Fleet / tenant</label>
              <div className="input-button">
                <input id="tenant" value={tenantInput} onChange={(event) => setTenantInput(event.target.value)} aria-label="Tenant identifier" />
                <button type="submit">View fleet</button>
              </div>
            </form>
            <label className="filter-control">
              <span>Search vehicles</span>
              <input value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)} placeholder="Enter a vehicle ID" aria-label="Filter by vehicle ID" />
            </label>
            <label className="filter-control status-control">
              <span>Vehicle status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by vehicle status">
                <option value="all">All vehicles</option><option value="moving">Moving</option><option value="idling">Idling</option><option value="inactive">Engine off</option><option value="offline">Offline</option>
              </select>
            </label>
          </section>

          {error && <div className="notice error" role="alert"><strong>Can’t reach the fleet API.</strong> {error}</div>}

          <section className="metrics overview-metrics" aria-label="Fleet summary">
            <article className="metric-card panel"><div className="metric-top"><span>Vehicles seen</span><span className="metric-icon blue">▣</span></div><strong>{loading ? "—" : overview.vehicles_seen}</strong><small>Distinct vehicles with telemetry</small></article>
            <article className="metric-card panel"><div className="metric-top"><span>Moving now</span><span className="metric-icon green">↗</span></div><strong>{loading ? "—" : overview.moving_now}</strong><small>Moving event seen in last 5 minutes</small></article>
            <article className="metric-card panel"><div className="metric-top"><span>Idling now</span><span className="metric-icon orange">Ⅱ</span></div><strong>{loading ? "—" : overview.idling_now}</strong><small>Engine on and speed at or below 0.5 km/h</small></article>
            <article className="metric-card panel"><div className="metric-top"><span>Engine off / offline</span><span className="metric-icon violet">◌</span></div><strong>{loading ? "—" : overview.inactive_now + overview.offline}</strong><small>{overview.inactive_now} engine off · {overview.offline} stale over 5 minutes</small></article>
            <article className="metric-card panel"><div className="metric-top"><span>Open alerts</span><span className="metric-icon red">!</span></div><strong>{loading ? "—" : overview.open_alerts}</strong><small>Require fleet operator attention</small></article>
            <article className="metric-card panel"><div className="metric-top"><span>Estimated idle fuel</span><span className="metric-icon violet">◒</span></div><strong>{loading ? "—" : overview.estimated_idle_fuel_litres.toFixed(2)} <em>L</em></strong><small>Assumption-based estimate for open idle alerts</small></article>
          </section>

          <section className="overview-grid">
            <article className="fleet-section panel" id="vehicles">
              <div className="section-heading">
                <div><div className="section-title-row"><h2>Vehicle fleet</h2><span className="count-pill">{visibleVehicles.length}</span></div><p>Latest vehicle signals received for <strong>{tenant}</strong></p></div>
                <span className="last-updated">Latest event: {formatDate(overview.latest_event_at)}</span>
              </div>
              {loading ? <div className="empty-state"><span className="loading-ring" />Loading connected vehicles…</div> : visibleVehicles.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">⌁</div><strong>{vehicles.length ? "No vehicles match these filters" : "No vehicle events received"}</strong><span>{vehicles.length ? "Change your search or status filter." : "Vehicles appear here as telemetry events reach the platform."}</span></div>
              ) : (
                <div className="table-wrap"><table><thead><tr><th>Vehicle ID</th><th>Status</th><th>Latest location</th><th>Speed</th><th>Last seen</th><th>Open alerts</th></tr></thead><tbody>
                  {visibleVehicles.map((vehicle) => <tr key={vehicle.vehicle_id}><td><span className="vehicle-id">{vehicle.vehicle_id}</span></td><td><span className={`vehicle-status vehicle-${vehicle.status}`}><i />{vehicle.status === "inactive" ? "Engine off" : vehicle.status}</span></td><td className="coordinate">{formatCoordinate(vehicle.latitude, vehicle.longitude)}</td><td>{vehicle.speed_kmh.toFixed(1)} km/h</td><td>{formatDate(vehicle.last_seen_at)}</td><td>{vehicle.open_alert_count}</td></tr>)}
                </tbody></table></div>
              )}
              <footer className="table-footer"><span>Showing up to 200 recently reporting vehicles</span><span>Coordinates are the latest vehicle-reported positions; no map/geocoding provider is connected.</span></footer>
            </article>

            <aside className="side-panels">
              <section className="location-panel panel">
                <div className="mini-heading"><div><h2>Latest locations</h2><p>Reported coordinates · {vehicles.length} vehicles</p></div><span className="location-icon">⌖</span></div>
                {vehicles.slice(0, 4).length === 0 ? <div className="mini-empty">Vehicle locations will appear after telemetry arrives.</div> : <ul className="location-list">{vehicles.slice(0, 4).map((vehicle) => <li key={vehicle.vehicle_id}><span className={`location-dot vehicle-${vehicle.status}`} /><span className="location-copy"><strong>{vehicle.vehicle_id}</strong><small>{formatCoordinate(vehicle.latitude, vehicle.longitude)}</small></span><span className="location-speed">{vehicle.speed_kmh.toFixed(0)} km/h</span></li>)}</ul>}
              </section>

              <section className="recent-alerts panel" id="alerts">
                <div className="mini-heading"><div><h2>Recent alerts</h2><p>Explainable operational signals</p></div><span className="count-pill">{alerts.length}</span></div>
                {alerts.slice(0, 4).length === 0 ? <div className="mini-empty">No alerts for this fleet.</div> : <ul className="alert-list">{alerts.slice(0, 4).map((alert) => <li key={alert.alert_id}><span className={`signal-dot signal-${alert.severity}`} /><div className="alert-copy"><strong>Prolonged idling · {alert.vehicle_id}</strong><small>{alert.severity} · {formatDuration(alert.idle_seconds)} · {formatDate(alert.last_observed_at)}</small></div><span className={`alert-status status-${alert.status}`}>{alert.status}</span></li>)}</ul>}
                <p className="estimate-note">Idle fuel uses an illustrative 1.5 L/hour assumption; it is not measured savings.</p>
              </section>
            </aside>
          </section>

          <section className="roadmap-note panel"><span className="roadmap-mark">i</span><p><strong>Fleet coverage:</strong> driver records, trip and dispatch workflows, maintenance schedules, fuel transactions, and report exports are not connected yet. This overview only shows vehicle telemetry and idling alerts currently stored by the platform.</p></section>
          <footer className="page-footer"><span>Fleet Intelligence Platform</span><span>Connected data. Clear decisions.</span></footer>
        </div>
      </main>
    </div>
  );
}
