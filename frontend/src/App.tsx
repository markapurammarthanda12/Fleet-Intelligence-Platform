import { useCallback, useEffect, useMemo, useState } from "react";
import PreviewWorkspace from "./PreviewWorkspace";
import FleetMap from "./FleetMap";
import type { PreviewColumn, PreviewRow } from "./PreviewWorkspace";

// The local demo has one fleet workspace. In a hosted deployment this ID comes
// from the authenticated user's tenant claim rather than a user-editable field.
const DEMO_TENANT_ID = "tenant-demo";

const driverColumns: PreviewColumn[] = [
  { key: "driver", label: "Driver" }, { key: "vehicle", label: "Assigned vehicle" },
  { key: "driving", label: "Driving today" }, { key: "safety", label: "Safety events" }, { key: "status", label: "Status" },
];
const driverRows: PreviewRow[] = [
  { driver: "Driver 001", vehicle: "VH-DEMO-01", driving: "5h 12m", safety: "0", status: "On duty" },
  { driver: "Driver 002", vehicle: "VH-DEMO-02", driving: "3h 48m", safety: "1 speeding event", status: "On duty" },
  { driver: "Driver 003", vehicle: "VH-DEMO-03", driving: "6h 05m", safety: "0", status: "On break" },
];
const routeColumns: PreviewColumn[] = [
  { key: "route", label: "Route" }, { key: "corridor", label: "Corridor" },
  { key: "vehicles", label: "Vehicles" }, { key: "progress", label: "Progress" }, { key: "status", label: "Status" },
];
const routeRows: PreviewRow[] = [
  { route: "Route 001", corridor: "North depot → Central hub", vehicles: "4 vehicles", progress: "72%", status: "In progress" },
  { route: "Route 002", corridor: "East depot → Airport zone", vehicles: "3 vehicles", progress: "46%", status: "In progress" },
  { route: "Route 003", corridor: "Central hub → South depot", vehicles: "2 vehicles", progress: "Scheduled", status: "Upcoming" },
];
const maintenanceColumns: PreviewColumn[] = [
  { key: "vehicle", label: "Vehicle" }, { key: "service", label: "Service" },
  { key: "due", label: "Due" }, { key: "odometer", label: "Odometer" }, { key: "status", label: "Status" },
];
const maintenanceRows: PreviewRow[] = [
  { vehicle: "VH-DEMO-04", service: "Oil and filter", due: "Today", odometer: "48,210 km", status: "Overdue" },
  { vehicle: "VH-DEMO-07", service: "Brake inspection", due: "In 3 days", odometer: "61,840 km", status: "Due soon" },
  { vehicle: "VH-DEMO-02", service: "Tire rotation", due: "In 12 days", odometer: "32,440 km", status: "Scheduled" },
];
const fuelColumns: PreviewColumn[] = [
  { key: "vehicle", label: "Vehicle" }, { key: "date", label: "Fill date" },
  { key: "volume", label: "Volume" }, { key: "cost", label: "Cost" }, { key: "efficiency", label: "Efficiency" },
];
const fuelRows: PreviewRow[] = [
  { vehicle: "VH-DEMO-01", date: "Today · 09:20", volume: "52.4 L", cost: "₹5,764", efficiency: "11.8 km/L" },
  { vehicle: "VH-DEMO-03", date: "Today · 08:05", volume: "47.1 L", cost: "₹5,181", efficiency: "10.6 km/L" },
  { vehicle: "VH-DEMO-05", date: "Yesterday · 17:42", volume: "60.0 L", cost: "₹6,600", efficiency: "12.1 km/L" },
];

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

type HourlyTelemetryPoint = {
  bucket_start_epoch_ms: number;
  unique_events: number;
  vehicles_seen: number;
  idling_events: number;
  moving_events: number;
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

type VehicleTelemetry = {
  eventId: string;
  observedAt: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  engineOn: boolean;
  sequence: number | null;
};

type DemoRule = { id: string; name: string; category: string; condition: string; action: string; active: boolean };
type DemoSettings = { organization: string; timeZone: string; dateFormat: string; language: string; realTimeAlerts: boolean; autoAcknowledge: boolean; showLocations: boolean };
const defaultRules: DemoRule[] = [
  { id: "idle-v1", name: "Prolonged idle detection", category: "Idle", condition: "Engine on · speed < 1 km/h · > 5 min", action: "Create fleet alert", active: true },
  { id: "idle-critical-v1", name: "Critical idle escalation", category: "Idle", condition: "Idle duration > 15 min", action: "Escalate to critical", active: true },
  { id: "speed-v1", name: "High speed warning", category: "Safety", condition: "Speed > fleet threshold", action: "Notify fleet operator", active: true },
  { id: "offline-v1", name: "Vehicle signal stale", category: "Health", condition: "No event received for 5 min", action: "Mark vehicle offline", active: true },
];
const defaultSettings: DemoSettings = { organization: "Demo fleet", timeZone: "Asia/Kolkata", dateFormat: "DD/MM/YYYY", language: "English", realTimeAlerts: true, autoAcknowledge: false, showLocations: true };

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

function demoFleetSnapshot() {
  const now = Date.now();
  const coordinates = [
    [13.0827, 80.2707], [13.0674, 80.2376], [13.0569, 80.2425], [13.0475, 80.2090],
    [13.1067, 80.2206], [13.0358, 80.2445], [13.0878, 80.2785], [13.0125, 80.2140],
    [13.1190, 80.2960], [13.0590, 80.1850], [12.9910, 80.2200], [13.0960, 80.2540],
  ];
  const statuses: FleetVehicle["status"][] = ["moving", "idling", "moving", "offline", "moving", "inactive", "moving", "idling", "moving", "offline", "moving", "moving"];
  const vehicles = coordinates.map(([latitude, longitude], index): FleetVehicle => ({
    tenant_id: DEMO_TENANT_ID,
    vehicle_id: `VH-${String([2048, 7182, 3319, 4521, 4567, 7733, 8811, 9204, 1052, 4450, 6628, 5103][index])}`,
    status: statuses[index],
    last_seen_at: new Date(now - [2, 1, 7, 19, 3, 8, 1, 2, 4, 21, 1, 2][index] * 60_000).toISOString(),
    latitude, longitude,
    speed_kmh: statuses[index] === "moving" ? 24 + (index * 7) % 55 : 0,
    open_alert_count: index === 1 || index === 7 ? 1 : 0,
  }));
  const alerts: FleetAlert[] = [
    { alert_id: "AL-2048-01", tenant_id: DEMO_TENANT_ID, vehicle_id: "VH-7182", rule_version: "idle-v1", severity: "warning", episode_started_at: new Date(now - 42 * 60_000).toISOString(), last_observed_at: new Date(now - 1 * 60_000).toISOString(), idle_seconds: 2520, estimated_fuel_litres: 1.05, status: "open", resolved_at: null },
    { alert_id: "AL-2048-02", tenant_id: DEMO_TENANT_ID, vehicle_id: "VH-9204", rule_version: "idle-v1", severity: "critical", episode_started_at: new Date(now - 68 * 60_000).toISOString(), last_observed_at: new Date(now - 2 * 60_000).toISOString(), idle_seconds: 4080, estimated_fuel_litres: 1.70, status: "open", resolved_at: null },
    { alert_id: "AL-2048-03", tenant_id: DEMO_TENANT_ID, vehicle_id: "VH-3319", rule_version: "idle-v1", severity: "info", episode_started_at: new Date(now - 85 * 60_000).toISOString(), last_observed_at: new Date(now - 20 * 60_000).toISOString(), idle_seconds: 900, estimated_fuel_litres: 0.38, status: "resolved", resolved_at: new Date(now - 18 * 60_000).toISOString() },
    { alert_id: "AL-2048-04", tenant_id: DEMO_TENANT_ID, vehicle_id: "VH-4567", rule_version: "idle-v1", severity: "warning", episode_started_at: new Date(now - 32 * 60_000).toISOString(), last_observed_at: new Date(now - 3 * 60_000).toISOString(), idle_seconds: 1920, estimated_fuel_litres: 0.80, status: "open", resolved_at: null },
  ];
  const overview: FleetOverview = { vehicles_seen: vehicles.length, moving_now: 7, idling_now: 2, inactive_now: 1, offline: 2, open_alerts: 3, estimated_idle_fuel_litres: 3.55, latest_event_at: new Date(now - 60_000).toISOString() };
  const analytics = Array.from({ length: 24 }, (_, index): HourlyTelemetryPoint => ({
    bucket_start_epoch_ms: Math.floor((now - (23 - index) * 60 * 60_000) / 3_600_000) * 3_600_000,
    unique_events: 75 + (index * 47) % 180,
    vehicles_seen: 8 + (index * 3) % 5,
    idling_events: 5 + (index * 7) % 28,
    moving_events: 35 + (index * 23) % 120,
  }));
  return { overview, vehicles, alerts, analytics };
}

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

function toDateTimeInput(value: Date) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function apiValue(row: Record<string, unknown>, camel: string, snake: string) {
  return row[camel] ?? row[snake];
}

function normalizeOverview(raw: Record<string, unknown>): FleetOverview {
  return {
    vehicles_seen: Number(apiValue(raw, "vehiclesSeen", "vehicles_seen") ?? 0),
    moving_now: Number(apiValue(raw, "movingNow", "moving_now") ?? 0),
    idling_now: Number(apiValue(raw, "idlingNow", "idling_now") ?? 0),
    inactive_now: Number(apiValue(raw, "inactiveNow", "inactive_now") ?? 0),
    offline: Number(raw.offline ?? 0),
    open_alerts: Number(apiValue(raw, "openAlerts", "open_alerts") ?? 0),
    estimated_idle_fuel_litres: Number(apiValue(raw, "estimatedIdleFuelLitres", "estimated_idle_fuel_litres") ?? 0),
    latest_event_at: (apiValue(raw, "latestEventAt", "latest_event_at") as string | null) ?? null,
  };
}

function normalizeVehicle(raw: Record<string, unknown>): FleetVehicle {
  return {
    tenant_id: String(apiValue(raw, "tenantId", "tenant_id") ?? ""),
    vehicle_id: String(apiValue(raw, "vehicleId", "vehicle_id") ?? ""),
    status: String(raw.status ?? "offline") as FleetVehicle["status"],
    last_seen_at: String(apiValue(raw, "lastSeenAt", "last_seen_at") ?? ""),
    latitude: Number(raw.latitude ?? 0),
    longitude: Number(raw.longitude ?? 0),
    speed_kmh: Number(apiValue(raw, "speedKmh", "speed_kmh") ?? 0),
    open_alert_count: Number(apiValue(raw, "openAlertCount", "open_alert_count") ?? 0),
  };
}

function normalizeAlert(raw: Record<string, unknown>): FleetAlert {
  return {
    alert_id: String(apiValue(raw, "alertId", "alert_id") ?? ""),
    tenant_id: String(apiValue(raw, "tenantId", "tenant_id") ?? ""),
    vehicle_id: String(apiValue(raw, "vehicleId", "vehicle_id") ?? ""),
    rule_version: String(apiValue(raw, "ruleVersion", "rule_version") ?? "1"),
    severity: String(raw.severity ?? "info"),
    episode_started_at: String(apiValue(raw, "episodeStartedAt", "episode_started_at") ?? ""),
    last_observed_at: String(apiValue(raw, "lastObservedAt", "last_observed_at") ?? ""),
    idle_seconds: Number(apiValue(raw, "idleSeconds", "idle_seconds") ?? 0),
    estimated_fuel_litres: Number(apiValue(raw, "estimatedFuelLitres", "estimated_fuel_litres") ?? 0),
    status: String(raw.status ?? "open"),
    resolved_at: (apiValue(raw, "resolvedAt", "resolved_at") as string | null) ?? null,
  };
}

function normalizeTelemetry(raw: Record<string, unknown>): VehicleTelemetry {
  return {
    eventId: String(apiValue(raw, "eventId", "event_id") ?? ""),
    observedAt: String(apiValue(raw, "observedAt", "observed_at") ?? ""),
    latitude: Number(raw.latitude ?? 0),
    longitude: Number(raw.longitude ?? 0),
    speedKmh: Number(apiValue(raw, "speedKmh", "speed_kmh") ?? 0),
    engineOn: Boolean(apiValue(raw, "engineOn", "engine_on")),
    sequence: (raw.sequence as number | null) ?? null,
  };
}

function normalizeAnalytics(raw: Record<string, unknown>): HourlyTelemetryPoint {
  return {
    bucket_start_epoch_ms: Number(apiValue(raw, "bucketStartEpochMs", "bucket_start_epoch_ms") ?? 0),
    unique_events: Number(apiValue(raw, "uniqueEvents", "unique_events") ?? 0),
    vehicles_seen: Number(apiValue(raw, "vehiclesSeen", "vehicles_seen") ?? 0),
    idling_events: Number(apiValue(raw, "idlingEvents", "idling_events") ?? 0),
    moving_events: Number(apiValue(raw, "movingEvents", "moving_events") ?? 0),
  };
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const csv = [headers, ...rows].map((row) => row.map((cell) => {
    const value = String(cell);
    const safeValue = /^[=+@\t\r]/.test(value) || (/^-/.test(value) && !/^-?\d+(\.\d+)?$/.test(value)) ? `'${value}` : value;
    return `"${safeValue.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [demoSignedIn, setDemoSignedIn] = useState(() => sessionStorage.getItem("fleet-demo-session") === "active");
  const [activeSection, setActiveSection] = useState(() => window.location.hash.slice(1) || "overview");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [alertSearch, setAlertSearch] = useState("");
  const [alertSeverityFilter, setAlertSeverityFilter] = useState("all");
  const [alertStatusFilter, setAlertStatusFilter] = useState("all");
  const [overview, setOverview] = useState<FleetOverview>(emptyOverview);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [alerts, setAlerts] = useState<FleetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [analytics, setAnalytics] = useState<HourlyTelemetryPoint[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsSampleData, setAnalyticsSampleData] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehicleHistory, setVehicleHistory] = useState<VehicleTelemetry[]>([]);
  const [vehicleHistoryLoading, setVehicleHistoryLoading] = useState(false);
  const [vehicleHistoryError, setVehicleHistoryError] = useState("");
  const [vehicleDetailTab, setVehicleDetailTab] = useState<"overview" | "history" | "alerts">("overview");
  const [rules, setRules] = useState<DemoRule[]>(() => {
    try { return JSON.parse(localStorage.getItem("fleet-demo-rules") ?? "null") ?? defaultRules; } catch { return defaultRules; }
  });
  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [settings, setSettings] = useState<DemoSettings>(() => {
    try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem("fleet-demo-settings") ?? "{}") }; } catch { return defaultSettings; }
  });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [analyticsTo, setAnalyticsTo] = useState(() => toDateTimeInput(new Date()));
  const [analyticsFrom, setAnalyticsFrom] = useState(() => toDateTimeInput(new Date(Date.now() - 24 * 60 * 60 * 1000)));

  const refresh = useCallback(async () => {
    try {
      const query = new URLSearchParams({ tenant_id: DEMO_TENANT_ID, limit: "200" });
      const [overviewResponse, vehiclesResponse, alertsResponse] = await Promise.all([
        fetch(`/api/v1/fleet/overview?tenant_id=${encodeURIComponent(DEMO_TENANT_ID)}`, { headers: { Accept: "application/json" } }),
        fetch(`/api/v1/vehicles?${query.toString()}`, { headers: { Accept: "application/json" } }),
        fetch(`/api/v1/alerts?${query.toString()}`, { headers: { Accept: "application/json" } }),
      ]);
      for (const response of [overviewResponse, vehiclesResponse, alertsResponse]) {
        if (!response.ok) throw new Error(`The fleet API returned ${response.status}.`);
      }
      const [overviewJson, vehiclesJson, alertsJson] = await Promise.all([
        overviewResponse.json() as Promise<Record<string, unknown>>,
        vehiclesResponse.json() as Promise<Array<Record<string, unknown>>>,
        alertsResponse.json() as Promise<Array<Record<string, unknown>>>,
      ]);
      setOverview(normalizeOverview(overviewJson));
      setVehicles(vehiclesJson.map(normalizeVehicle));
      setAlerts(alertsJson.map(normalizeAlert));
      setError("");
      setUsingSampleData(false);
      setLastUpdated(new Date());
    } catch {
      const sample = demoFleetSnapshot();
      setOverview(sample.overview);
      setVehicles(sample.vehicles);
      setAlerts(sample.alerts);
      setError("");
      setUsingSampleData(true);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!demoSignedIn) return;
    void refresh();
    if (usingSampleData || !settings.realTimeAlerts) return;
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [demoSignedIn, refresh, settings.realTimeAlerts, usingSampleData]);

  useEffect(() => {
    const syncSection = () => setActiveSection(window.location.hash.slice(1) || "overview");
    window.addEventListener("hashchange", syncSection);
    return () => window.removeEventListener("hashchange", syncSection);
  }, []);

  useEffect(() => {
    if (!demoSignedIn) return;
    if (!analyticsFrom || !analyticsTo) return;
    const from = new Date(analyticsFrom);
    const to = new Date(analyticsTo);
    const rangeDays = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || rangeDays <= 0 || rangeDays > 31) {
      setAnalyticsError("Choose a valid range of up to 31 days, with the end after the start.");
      setAnalytics([]);
      setAnalyticsLoading(false);
      return;
    }

    let active = true;
    setAnalyticsLoading(true);
    const query = new URLSearchParams({
      tenant_id: DEMO_TENANT_ID,
      from: from.toISOString(),
      to: to.toISOString(),
    });
    fetch(`/api/v1/analytics/telemetry/hourly?${query.toString()}`, { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (response.status === 404) {
          throw new Error("Reports are not enabled in the currently running API. Update the local application image to enable this section.");
        }
        if (response.status === 503) {
          throw new Error("The historical analytics store is not ready. Check that ClickHouse is running.");
        }
        if (!response.ok) throw new Error(`Reports could not be loaded (HTTP ${response.status}).`);
        return response.json() as Promise<Array<Record<string, unknown>>>;
      })
      .then((rows) => {
        if (!active) return;
        setAnalytics(rows.map(normalizeAnalytics));
        setAnalyticsError("");
        setAnalyticsSampleData(false);
      })
      .catch(() => {
        if (!active) return;
        const sample = demoFleetSnapshot();
        setAnalyticsError("");
        setAnalytics(sample.analytics);
        setAnalyticsSampleData(true);
      })
      .finally(() => {
        if (active) setAnalyticsLoading(false);
      });
    return () => { active = false; };
  }, [analyticsFrom, analyticsTo, demoSignedIn]);

  useEffect(() => {
    if (!selectedVehicleId) {
      setVehicleHistory([]);
      setVehicleHistoryError("");
      return;
    }
    let active = true;
    setVehicleHistoryLoading(true);
    setVehicleHistoryError("");
    const query = new URLSearchParams({ tenant_id: DEMO_TENANT_ID, vehicle_id: selectedVehicleId, limit: "50" });
    fetch(`/api/v1/telemetry?${query.toString()}`, { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Vehicle history could not be loaded (HTTP ${response.status}).`);
        return response.json() as Promise<Array<Record<string, unknown>>>;
      })
      .then((events) => { if (active) setVehicleHistory(events.map(normalizeTelemetry)); })
      .catch(() => { if (active) { setVehicleHistoryError(""); setVehicleHistory(demoFleetSnapshot().analytics.slice(0, 12).map((point, index) => ({ eventId: `DEMO-${selectedVehicleId}-${index + 1}`, observedAt: new Date(point.bucket_start_epoch_ms).toISOString(), latitude: selectedVehicle?.latitude ?? 13.0827, longitude: selectedVehicle?.longitude ?? 80.2707, speedKmh: selectedVehicle?.speed_kmh ?? 0, engineOn: selectedVehicle?.status !== "inactive", sequence: index + 1 }))); } })
      .finally(() => { if (active) setVehicleHistoryLoading(false); });
    return () => { active = false; };
  }, [selectedVehicleId]);

  const analyticsTotals = useMemo(() => analytics.reduce((totals, row) => ({
    events: totals.events + row.unique_events,
    vehicles: Math.max(totals.vehicles, row.vehicles_seen),
    idling: totals.idling + row.idling_events,
    moving: totals.moving + row.moving_events,
  }), { events: 0, vehicles: 0, idling: 0, moving: 0 }), [analytics]);

  const visibleVehicles = useMemo(() => {
    const filter = vehicleFilter.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      const matchesName = !filter || vehicle.vehicle_id.toLowerCase().includes(filter);
      const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
      return matchesName && matchesStatus;
    });
  }, [statusFilter, vehicleFilter, vehicles]);

  const visibleAlerts = useMemo(() => {
    const filter = alertSearch.trim().toLowerCase();
    return alerts.filter((alert) => {
      const matchesSearch = !filter || alert.vehicle_id.toLowerCase().includes(filter) || alert.alert_id.toLowerCase().includes(filter);
      const matchesSeverity = alertSeverityFilter === "all" || alert.severity === alertSeverityFilter;
      const matchesStatus = alertStatusFilter === "all" || alert.status === alertStatusFilter;
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [alertSearch, alertSeverityFilter, alertStatusFilter, alerts]);
  const selectedVehicle = vehicles.find((vehicle) => vehicle.vehicle_id === selectedVehicleId) ?? null;
  const selectedVehicleAlerts = alerts.filter((alert) => alert.vehicle_id === selectedVehicleId);
  const chartMax = Math.max(1, ...analytics.map((point) => point.unique_events));
  const eventTrendPath = analytics.map((point, index) => `${analytics.length < 2 ? 50 : 36 + (index / (analytics.length - 1)) * 640},${150 - (point.unique_events / chartMax) * 128}`).join(" ");
  const idleTrendPath = analytics.map((point, index) => `${analytics.length < 2 ? 50 : 36 + (index / (analytics.length - 1)) * 640},${150 - (point.idling_events / Math.max(1, ...analytics.map((row) => row.idling_events))) * 115}`).join(" ");
  const statusTotal = Math.max(1, overview.moving_now + overview.idling_now + overview.inactive_now + overview.offline);
  const movingPct = (overview.moving_now / statusTotal) * 100;
  const idlePct = movingPct + (overview.idling_now / statusTotal) * 100;
  const inactivePct = idlePct + (overview.inactive_now / statusTotal) * 100;
  const sectionMeta: Record<string, { title: string; subtitle: string }> = {
    overview: { title: "Dashboard", subtitle: "Live fleet health, vehicle activity, and operational signals." },
    map: { title: "Fleet Overview", subtitle: "See current vehicle locations and status across your fleet." },
    vehicles: { title: "Vehicles", subtitle: "Inspect vehicle status, current position, and recent telemetry." },
    alerts: { title: "Alerts & decisions", subtitle: "Review operational alerts and the signals that need attention." },
    analytics: { title: "Analytics", subtitle: "Explore fleet activity and trends across the selected period." },
    reports: { title: "Reports", subtitle: "Download reports based on retained fleet telemetry." },
    decisions: { title: "Decision engine", subtitle: "Review the rules that turn vehicle events into operator alerts." },
    settings: { title: "Settings", subtitle: "Configure local demo preferences for this browser." },
    drivers: { title: "Drivers", subtitle: "Driver roster and duty status preview." },
    routes: { title: "Routes & dispatch", subtitle: "Planned fleet runs and route progress preview." },
    maintenance: { title: "Maintenance", subtitle: "Upcoming service needs preview." },
    fuel: { title: "Fuel management", subtitle: "Fuel use and spend preview." },
  };
  const page = sectionMeta[activeSection] ?? sectionMeta.overview;
  const updateRules = (next: DemoRule[]) => { setRules(next); localStorage.setItem("fleet-demo-rules", JSON.stringify(next)); };
  const updateSetting = <K extends keyof DemoSettings>(key: K, value: DemoSettings[K]) => { setSettings((current) => ({ ...current, [key]: value })); setSettingsSaved(false); };

  if (!demoSignedIn) return (
    <main className="login-page">
      <section className="login-brand-panel">
        <a className="login-brand" href="#overview"><span className="brand-mark" aria-hidden="true">↗</span><span><strong>Fleet Intelligence</strong><small>Connected fleets. Clear decisions.</small></span></a>
        <div className="login-brand-message"><span className="eyebrow">FLEET OPERATIONS PLATFORM</span><h1>Connected vehicles.<br />Smarter decisions.</h1><p>Bring vehicle activity, alerts, and fleet signals into one clear workspace.</p></div>
        <div className="login-brand-foot">Local demonstration · Synthetic fleet data</div>
      </section>
      <section className="login-card-wrap">
        <div className="login-card panel">
          <div className="login-mobile-brand"><span className="brand-mark" aria-hidden="true">↗</span><strong>Fleet Intelligence</strong></div>
          <span className="eyebrow">WELCOME</span>
          <h2>Open your fleet workspace</h2>
          <p className="login-copy">Explore the local demo using synthetic vehicle data.</p>
          <div className="login-demo-note"><strong>Demo sign-in</strong><span>This opens a local demo session on this browser. It does not authenticate a real account or protect private fleet data.</span></div>
          <button className="login-submit" type="button" onClick={() => { sessionStorage.setItem("fleet-demo-session", "active"); setDemoSignedIn(true); }}>Continue to demo fleet <span aria-hidden="true">→</span></button>
          <p className="login-footnote">For real organization sign-in, an OIDC provider must be configured.</p>
        </div>
      </section>
    </main>
  );

  return (
    <div className="app-layout">
      <aside className="sidebar" aria-label="Fleet sections">
        <a className="brand" href="#overview" aria-label="Fleet Intelligence Platform home">
          <span className="brand-mark" aria-hidden="true">↗</span>
          <span className="brand-name">Fleet Intelligence</span>
        </a>
        <nav className="side-nav">
          <a className={`nav-item${activeSection === "overview" ? " selected" : ""}`} href="#overview"><span>⌂</span>Dashboard</a>
          <a className={`nav-item${activeSection === "map" ? " selected" : ""}`} href="#map"><span>◉</span>Fleet overview</a>
          <a className={`nav-item${activeSection === "alerts" ? " selected" : ""}`} href="#alerts"><span>♧</span>Alerts</a>
          <a className={`nav-item${activeSection === "analytics" ? " selected" : ""}`} href="#analytics"><span>▥</span>Analytics</a>
          <a className={`nav-item${activeSection === "vehicles" ? " selected" : ""}`} href="#vehicles"><span>▣</span>Vehicles <small>{overview.vehicles_seen}</small></a>
          <a className={`nav-item${activeSection === "decisions" ? " selected" : ""}`} href="#decisions"><span>◇</span>Decisions</a>
          <a className={`nav-item${activeSection === "reports" ? " selected" : ""}`} href="#reports"><span>▤</span>Reports</a>
          <a className={`nav-item${activeSection === "settings" ? " selected" : ""}`} href="#settings"><span>⚙</span>Settings</a>
          <div className="nav-divider" />
          <div className="nav-caption">MORE FLEET WORKFLOWS</div>
          <a className={`nav-item preview-nav${activeSection === "drivers" ? " selected" : ""}`} href="#drivers"><span>♙</span>Drivers <small>Preview</small></a>
          <a className={`nav-item preview-nav${activeSection === "routes" ? " selected" : ""}`} href="#routes"><span>⌁</span>Routes &amp; dispatch <small>Preview</small></a>
          <a className={`nav-item preview-nav${activeSection === "maintenance" ? " selected" : ""}`} href="#maintenance"><span>⚒</span>Maintenance <small>Preview</small></a>
          <a className={`nav-item preview-nav${activeSection === "fuel" ? " selected" : ""}`} href="#fuel"><span>◉</span>Fuel management <small>Preview</small></a>
        </nav>
        <div className="sidebar-footer">Connected data.<br />Clear decisions.</div>
      </aside>

      <main className="workspace" id="overview">
        <header className="topbar">
          <div className="breadcrumb">Fleet Intelligence <span>/</span> {page.title}</div>
          <label className="global-search"><span aria-hidden="true">⌕</span><span className="sr-only">Search vehicles and alerts</span><input value={globalSearch} onChange={(event) => { setGlobalSearch(event.target.value); setVehicleFilter(event.target.value); setAlertSearch(event.target.value); }} placeholder="Search vehicles, alerts…" /></label>
          <div className="topbar-right">
            <span className={`workspace-label${usingSampleData ? " sample-mode-label" : ""}`}>{usingSampleData ? "Demo fleet · sample data" : "Demo fleet · local"}</span>
            <span className="avatar" aria-label="Demo operator">DO</span>
            <button className="sign-out-button" type="button" onClick={() => { sessionStorage.removeItem("fleet-demo-session"); setDemoSignedIn(false); }}>Sign out</button>
          </div>
        </header>

        <div className="content" data-active-section={activeSection}>
          <section className="page-heading">
            <div>
              <div className="eyebrow">CONNECTED FLEET · {page.title.toUpperCase()}</div>
              <h1>{page.title}</h1>
              <p className="subtitle">{page.subtitle}</p>
            </div>
            <div className="heading-actions">
              <span className="data-freshness">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Waiting for data"}</span>
              <button className="refresh-button" type="button" onClick={() => void refresh()}>↻ Refresh</button>
            </div>
          </section>

          {usingSampleData && <div className="notice sample-notice" role="status"><strong>Sample demo data</strong><span>The fleet API is unavailable, so this screen is showing synthetic vehicles and alerts.</span></div>}
          {analyticsSampleData && (activeSection === "analytics" || activeSection === "reports") && <div className="notice sample-notice" role="status"><strong>Sample analytics</strong><span>Historical values are synthetic until ClickHouse is connected.</span></div>}

          <section className="filters panel" aria-label="Fleet filters">
            <div className="active-fleet" aria-label="Selected fleet workspace">
              <span className="active-fleet-icon">▦</span>
              <span><small>FLEET WORKSPACE</small><strong>Demo fleet</strong></span>
            </div>
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
            <article className="metric-card panel"><div className="metric-top"><span>Total vehicles</span><span className="metric-icon blue">▣</span></div><strong>{loading ? "—" : overview.vehicles_seen.toLocaleString()}</strong><small>Vehicles with telemetry observed</small></article>
            <article className="metric-card panel"><div className="metric-top"><span>Moving now</span><span className="metric-icon green">↗</span></div><strong>{loading ? "—" : overview.moving_now.toLocaleString()}</strong><small>Latest signal within 5 minutes</small></article>
            <article className="metric-card panel"><div className="metric-top"><span>Idling now</span><span className="metric-icon orange">Ⅱ</span></div><strong>{loading ? "—" : overview.idling_now.toLocaleString()}</strong><small>Engine on · stationary</small></article>
            <article className="metric-card panel"><div className="metric-top"><span>Open alerts</span><span className="metric-icon red">!</span></div><strong>{loading ? "—" : overview.open_alerts.toLocaleString()}</strong><small>Require fleet operator attention</small></article>
          </section>

          <section className="overview-charts" aria-label="Fleet health summary">
            <article className="chart-card panel">
              <div className="chart-card-heading"><div><h2>Fleet health trend</h2><p>Hourly telemetry events · last 24 hours</p></div><span className="chart-chip">{analyticsSampleData ? "Sample" : "Live analytics"}</span></div>
              <div className="line-chart-wrap"><div className="chart-y-labels"><span>{chartMax.toLocaleString()}</span><span>{Math.round(chartMax / 2).toLocaleString()}</span><span>0</span></div><svg className="fleet-line-chart" viewBox="0 0 700 180" role="img" aria-label="Hourly unique events and idling events"><path className="chart-gridline" d="M36 22H676 M36 85H676 M36 150H676"/><polyline className="event-line" points={eventTrendPath}/><polyline className="idle-line" points={idleTrendPath}/></svg></div>
              <div className="chart-x-labels"><span>24 hours ago</span><span>12 hours ago</span><span>Now</span></div>
              <div className="chart-legend"><span><i className="legend-blue" />Unique events</span><span><i className="legend-orange" />Idling samples</span></div>
            </article>
            <article className="chart-card status-chart-card panel">
              <div className="chart-card-heading"><div><h2>Vehicle status</h2><p>Latest observed signal</p></div><span className="status-chart-icon">◉</span></div>
              <div className="status-chart-body"><div className="status-donut" style={{ background: `conic-gradient(#11a77b 0 ${movingPct}%, #e9952d ${movingPct}% ${idlePct}%, #7b8ba4 ${idlePct}% ${inactivePct}%, #d4dce7 ${inactivePct}% 100%)` }}><div><strong>{overview.vehicles_seen.toLocaleString()}</strong><span>observed</span></div></div><ul className="status-legend"><li><i className="legend-green" /><span>Moving</span><strong>{overview.moving_now}</strong></li><li><i className="legend-orange" /><span>Idling</span><strong>{overview.idling_now}</strong></li><li><i className="legend-slate" /><span>Engine off</span><strong>{overview.inactive_now}</strong></li><li><i className="legend-gray" /><span>Offline</span><strong>{overview.offline}</strong></li></ul></div>
              <div className="chart-footnote">Status is based on each vehicle’s most recent report.</div>
            </article>
          </section>

          <section className="overview-grid">
            <article className="fleet-section panel" id="vehicles">
              <div className="section-heading">
                <div><div className="section-title-row"><h2>Vehicle fleet</h2><span className="count-pill">{visibleVehicles.length}</span></div><p>Latest vehicle signals received for this fleet workspace</p></div>
                <div className="section-actions"><span className="last-updated">Latest event: {formatDate(overview.latest_event_at)}</span><button className="export-button" type="button" disabled={loading || Boolean(error) || visibleVehicles.length === 0} onClick={() => downloadCsv("fleet-vehicles.csv", ["Vehicle ID", "Status", "Latitude", "Longitude", "Speed km/h", "Last seen", "Open alerts"], visibleVehicles.map((vehicle) => [vehicle.vehicle_id, vehicle.status, vehicle.latitude, vehicle.longitude, vehicle.speed_kmh, vehicle.last_seen_at, vehicle.open_alert_count]))}>Export CSV</button></div>
              </div>
              {loading ? <div className="empty-state"><span className="loading-ring" />Loading connected vehicles…</div> : error ? <div className="empty-state"><strong>Fleet data is unavailable</strong><span>Check the API connection and refresh to try again.</span></div> : visibleVehicles.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">⌁</div><strong>{vehicles.length ? "No vehicles match these filters" : "No vehicle events received"}</strong><span>{vehicles.length ? "Change your search or status filter." : "Vehicles appear here as telemetry events reach the platform."}</span></div>
              ) : (
                <div className="table-wrap"><table><thead><tr><th>Vehicle ID</th><th>Status</th><th>Latest location</th><th>Speed</th><th>Last seen</th><th>Open alerts</th></tr></thead><tbody>
                  {visibleVehicles.map((vehicle) => <tr key={vehicle.vehicle_id}><td><button className="vehicle-detail-link" type="button" onClick={() => { setSelectedVehicleId(vehicle.vehicle_id); setVehicleDetailTab("overview"); }}>{vehicle.vehicle_id}</button></td><td><span className={`vehicle-status vehicle-${vehicle.status}`}><i />{vehicle.status === "inactive" ? "Engine off" : vehicle.status}</span></td><td className="coordinate">{formatCoordinate(vehicle.latitude, vehicle.longitude)}</td><td>{vehicle.speed_kmh.toFixed(1)} km/h</td><td>{formatDate(vehicle.last_seen_at)}</td><td>{vehicle.open_alert_count}</td></tr>)}
                </tbody></table></div>
              )}
              {selectedVehicle && <section className="vehicle-detail-panel" aria-label={`Details for ${selectedVehicle.vehicle_id}`}>
                <div className="vehicle-detail-heading"><div><span className="eyebrow">VEHICLE DETAILS</span><h3>{selectedVehicle.vehicle_id}</h3></div><button className="preview-close" type="button" onClick={() => setSelectedVehicleId(null)}>Close</button></div>
                <div className="vehicle-detail-summary">
                  <div><span>Current status</span><strong className={`vehicle-status vehicle-${selectedVehicle.status}`}><i />{selectedVehicle.status === "inactive" ? "Engine off" : selectedVehicle.status}</strong></div>
                  <div><span>Last reported speed</span><strong>{selectedVehicle.speed_kmh.toFixed(1)} km/h</strong></div>
                  <div><span>Latest coordinates</span><strong>{formatCoordinate(selectedVehicle.latitude, selectedVehicle.longitude)}</strong></div>
                  <div><span>Last seen</span><strong>{formatDate(selectedVehicle.last_seen_at)}</strong></div>
                </div>
                <div className="vehicle-detail-tabs" role="tablist" aria-label="Vehicle detail sections">
                  {(["overview", "history", "alerts"] as const).map((tab) => <button key={tab} id={`vehicle-tab-${tab}`} role="tab" aria-selected={vehicleDetailTab === tab} type="button" className={vehicleDetailTab === tab ? "selected" : ""} onClick={() => setVehicleDetailTab(tab)}>{tab === "overview" ? "Overview" : tab === "history" ? "Telemetry history" : `Alerts (${selectedVehicleAlerts.length})`}</button>)}
                </div>
                {vehicleDetailTab === "overview" && <p className="vehicle-detail-note">This view uses the latest vehicle telemetry received by the platform. Reported coordinates are shown on the fleet map; map tiles are provided by OpenStreetMap.</p>}
                {vehicleDetailTab === "history" && (vehicleHistoryLoading ? <div className="mini-empty">Loading recent telemetry…</div> : vehicleHistoryError ? <div className="mini-empty" role="alert">{vehicleHistoryError}</div> : vehicleHistory.length === 0 ? <div className="mini-empty">No telemetry history is available for this vehicle.</div> : <div className="table-wrap"><table><thead><tr><th>Observed</th><th>Engine</th><th>Speed</th><th>Coordinates</th><th>Event</th></tr></thead><tbody>{vehicleHistory.map((event) => <tr key={event.eventId}><td>{formatDate(event.observedAt)}</td><td>{event.engineOn ? "On" : "Off"}</td><td>{event.speedKmh.toFixed(1)} km/h</td><td>{formatCoordinate(event.latitude, event.longitude)}</td><td><span className="vehicle-id">{event.eventId}</span></td></tr>)}</tbody></table></div>)}
                {vehicleDetailTab === "alerts" && (selectedVehicleAlerts.length === 0 ? <div className="mini-empty">No alerts are associated with this vehicle.</div> : <div className="table-wrap"><table><thead><tr><th>Alert</th><th>Severity</th><th>Status</th><th>Duration</th><th>Estimated fuel</th></tr></thead><tbody>{selectedVehicleAlerts.map((alert) => <tr key={alert.alert_id}><td>Prolonged idling · {alert.vehicle_id}</td><td><span className={`badge badge-${alert.severity}`}><span />{alert.severity}</span></td><td>{alert.status}</td><td>{formatDuration(alert.idle_seconds)}</td><td>{alert.estimated_fuel_litres.toFixed(2)} L</td></tr>)}</tbody></table></div>)}
              </section>}
              <footer className="table-footer"><span>Showing up to 200 recently reporting vehicles</span><span>Coordinates come from telemetry; the fleet map uses OpenStreetMap tiles.</span></footer>
            </article>

            <aside className="side-panels">
              <section className="location-panel panel">
                <div className="mini-heading"><div><h2>Latest locations</h2><p>Reported coordinates · {vehicles.length} vehicles</p></div><span className="location-icon">⌖</span></div>
                {error ? <div className="mini-empty">Vehicle locations are unavailable while the API is offline.</div> : vehicles.slice(0, 4).length === 0 ? <div className="mini-empty">Vehicle locations will appear after telemetry arrives.</div> : <ul className="location-list">{vehicles.slice(0, 4).map((vehicle) => <li key={vehicle.vehicle_id}><span className={`location-dot vehicle-${vehicle.status}`} /><span className="location-copy"><strong>{vehicle.vehicle_id}</strong><small>{formatCoordinate(vehicle.latitude, vehicle.longitude)}</small></span><span className="location-speed">{vehicle.speed_kmh.toFixed(0)} km/h</span></li>)}</ul>}
              </section>

              <section className="recent-alerts panel">
                <div className="mini-heading"><div><h2>Recent alerts</h2><p>Explainable operational signals</p></div><span className="count-pill">{alerts.length}</span></div>
                {error ? <div className="mini-empty">Alerts are unavailable while the API is offline.</div> : alerts.slice(0, 4).length === 0 ? <div className="mini-empty">No alerts for this fleet.</div> : <ul className="alert-list">{alerts.slice(0, 4).map((alert) => <li key={alert.alert_id}><span className={`signal-dot signal-${alert.severity}`} /><div className="alert-copy"><strong>Prolonged idling · {alert.vehicle_id}</strong><small>{alert.severity} · {formatDuration(alert.idle_seconds)} · {formatDate(alert.last_observed_at)}</small></div><span className={`alert-status status-${alert.status}`}>{alert.status}</span></li>)}</ul>}
                <p className="estimate-note">Idle fuel uses an illustrative 1.5 L/hour assumption; it is not measured savings.</p>
              </section>
            </aside>
          </section>

          <section className="fleet-map-view panel" aria-label="Fleet map and vehicle list">
            <div className="fleet-map-heading"><div><h2>Live fleet map</h2><p>Click a vehicle marker or select a vehicle to open its details.</p></div><div className="map-status-legend"><span><i className="legend-green" />Moving</span><span><i className="legend-orange" />Idling</span><span><i className="legend-slate" />Engine off</span><span><i className="legend-gray" />Offline</span></div></div>
            <div className="fleet-map-layout"><FleetMap vehicles={settings.showLocations ? visibleVehicles : []} /><aside className="fleet-map-vehicle-list"><div className="map-list-heading"><strong>Vehicle list</strong><span>{visibleVehicles.length}</span></div><label className="map-search"><span aria-hidden="true">⌕</span><input value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)} placeholder="Search by vehicle ID" aria-label="Search map vehicles" /></label><div className="map-vehicle-scroll">{visibleVehicles.map((vehicle) => <button type="button" className="map-vehicle-row" key={vehicle.vehicle_id} onClick={() => { setSelectedVehicleId(vehicle.vehicle_id); setVehicleDetailTab("overview"); setActiveSection("vehicles"); window.location.hash = "vehicles"; }}><span className={`location-dot vehicle-${vehicle.status}`} /><span className="map-vehicle-copy"><strong>{vehicle.vehicle_id}</strong><small>{settings.showLocations ? `${vehicle.latitude.toFixed(3)}, ${vehicle.longitude.toFixed(3)}` : "Location hidden by settings"}</small></span><span className={`map-status-tag tag-${vehicle.status}`}>{vehicle.status === "inactive" ? "Engine off" : vehicle.status}</span></button>)}</div></aside></div>
          </section>

          <section className="alert-center panel" id="alerts" aria-labelledby="alert-center-title">
            <div className="section-heading alert-center-heading">
              <div><div className="section-title-row"><h2 id="alert-center-title">Alert center</h2><span className="count-pill">{loading || error ? "—" : overview.open_alerts} open</span></div><p>Review idling events with the vehicle, severity, duration, and estimated fuel impact.</p></div>
              <div className="alert-filters">
                <label><span className="sr-only">Search alerts by vehicle or alert ID</span><input value={alertSearch} onChange={(event) => setAlertSearch(event.target.value)} placeholder="Search vehicle or alert ID" /></label>
                <label><span className="sr-only">Filter alerts by severity</span><select value={alertSeverityFilter} onChange={(event) => setAlertSeverityFilter(event.target.value)}><option value="all">All severities</option><option value="critical">Critical</option><option value="warning">Warning</option><option value="info">Info</option></select></label>
                <label><span className="sr-only">Filter alerts by status</span><select value={alertStatusFilter} onChange={(event) => setAlertStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="open">Open</option><option value="resolved">Resolved</option></select></label>
                <button className="export-button" type="button" disabled={loading || Boolean(error) || visibleAlerts.length === 0} onClick={() => downloadCsv("fleet-alerts.csv", ["Alert ID", "Vehicle ID", "Rule", "Severity", "Status", "Episode started", "Last observed", "Idle seconds", "Estimated fuel litres"], visibleAlerts.map((alert) => [alert.alert_id, alert.vehicle_id, alert.rule_version, alert.severity, alert.status, alert.episode_started_at, alert.last_observed_at, alert.idle_seconds, alert.estimated_fuel_litres]))}>Export CSV</button>
              </div>
            </div>
            {loading ? <div className="empty-state"><span className="loading-ring" />Loading fleet alerts…</div> : error ? <div className="empty-state"><strong>Alerts are unavailable</strong><span>Check the API connection and refresh the fleet data.</span></div> : visibleAlerts.length === 0 ? (
              <div className="empty-state"><strong>{alerts.length ? "No alerts match these filters" : "No alerts for this fleet"}</strong><span>{alerts.length ? "Try a different vehicle, severity, or status." : "New operational alerts will appear here when the fleet reports them."}</span></div>
            ) : (
              <div className="table-wrap"><table><thead><tr><th>Alert</th><th>Vehicle</th><th>Severity</th><th>Status</th><th>Idle duration</th><th>Estimated fuel</th><th>Last observed</th></tr></thead><tbody>
                {visibleAlerts.map((alert) => <tr key={alert.alert_id}><td><span className="vehicle-id">Prolonged idling</span><small className="rule">Rule {alert.rule_version}</small></td><td>{alert.vehicle_id}</td><td><span className={`badge badge-${alert.severity}`}><span />{alert.severity}</span></td><td><span className={`alert-status status-${alert.status}`}>{alert.status}</span></td><td>{formatDuration(alert.idle_seconds)}</td><td>{alert.estimated_fuel_litres.toFixed(2)} L</td><td>{formatDate(alert.last_observed_at)}</td></tr>)}
              </tbody></table></div>
            )}
            <footer className="table-footer"><span>Showing {visibleAlerts.length} of {alerts.length} alerts loaded</span><span>Alerts are rule-based explanations; estimated fuel uses the documented demo assumption.</span></footer>
          </section>

          <section className="reports-section panel" id="reports">
            <div className="section-heading reports-heading">
              <div><div className="section-title-row"><h2>Historical fleet activity</h2><span className="count-pill">Hourly</span></div><p>Batch summaries from retained telemetry, grouped by UTC hour and fleet.</p></div>
              <div className="report-actions">
                <div className="report-range">
                <label>From <input type="datetime-local" value={analyticsFrom} onChange={(event) => setAnalyticsFrom(event.target.value)} /></label>
                <label>To <input type="datetime-local" value={analyticsTo} onChange={(event) => setAnalyticsTo(event.target.value)} /></label>
                </div>
                <button className="export-button" type="button" disabled={analyticsLoading || Boolean(analyticsError) || analytics.length === 0} onClick={() => downloadCsv("fleet-hourly-activity.csv", ["Hour UTC", "Unique events", "Vehicles", "Idling samples", "Moving samples"], analytics.map((row) => [new Date(row.bucket_start_epoch_ms).toISOString(), row.unique_events, row.vehicles_seen, row.idling_events, row.moving_events]))}>Export CSV</button>
              </div>
            </div>
            {analyticsError && <div className="notice error" role="alert">{analyticsError}</div>}
            <div className="report-summary" aria-label="Historical telemetry totals">
              <div><span>Unique events</span><strong>{analyticsLoading || analyticsError ? "—" : analyticsTotals.events.toLocaleString()}</strong></div>
              <div><span>Peak vehicles per hour</span><strong>{analyticsLoading || analyticsError ? "—" : analyticsTotals.vehicles.toLocaleString()}</strong></div>
              <div><span>Idling samples</span><strong>{analyticsLoading || analyticsError ? "—" : analyticsTotals.idling.toLocaleString()}</strong></div>
              <div><span>Moving samples</span><strong>{analyticsLoading || analyticsError ? "—" : analyticsTotals.moving.toLocaleString()}</strong></div>
            </div>
            {analyticsLoading ? <div className="empty-state"><span className="loading-ring" />Loading historical activity…</div> : analyticsError ? (
              <div className="empty-state"><strong>Historical activity is unavailable</strong><span>Check the analytics service and try again.</span></div>
            ) : analytics.length === 0 ? (
              <div className="empty-state"><strong>No historical activity in this range</strong><span>Telemetry events appear here after the stream reaches the analytical store.</span></div>
            ) : (
              <div className="table-wrap"><table><thead><tr><th>Hour (UTC)</th><th>Unique events</th><th>Vehicles</th><th>Idling samples</th><th>Moving samples</th></tr></thead><tbody>
                {analytics.map((row) => <tr key={row.bucket_start_epoch_ms}><td>{new Date(row.bucket_start_epoch_ms).toLocaleString(undefined, { timeZone: "UTC", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} UTC</td><td>{row.unique_events.toLocaleString()}</td><td>{row.vehicles_seen.toLocaleString()}</td><td>{row.idling_events.toLocaleString()}</td><td>{row.moving_events.toLocaleString()}</td></tr>)}
              </tbody></table></div>
            )}
            <footer className="table-footer"><span>Workspace: <strong>Demo fleet</strong></span><span>Duplicate Kafka deliveries are counted once per event ID in each hour. Analytics retain 90 days.</span></footer>
          </section>

          <section className="decisions-screen panel" id="decisions" aria-labelledby="decisions-title">
            <div className="decisions-heading"><div><div className="section-title-row"><h2 id="decisions-title">Decision engine</h2><span className="preview-badge">Demo rules</span></div><p>Inspect and manage the local demo rule catalog.</p></div><button className="primary-button" type="button" onClick={() => setRuleFormOpen((open) => !open)}>＋ Create rule</button></div>
            <div className="demo-configuration-note"><span>i</span><p>Rule toggles and new rules are saved in this browser for the demo. They do not change the backend’s current idle-alert policy yet.</p></div>
            {ruleFormOpen && <form className="rule-create-form" onSubmit={(event) => { event.preventDefault(); const name = ruleName.trim(); if (!name) return; const id = `demo-rule-${Date.now()}`; updateRules([...rules, { id, name, category: "Custom", condition: "Configure threshold in backend", action: "Create fleet alert", active: true }]); setRuleName(""); setRuleFormOpen(false); }}><label>Rule name<input value={ruleName} onChange={(event) => setRuleName(event.target.value)} placeholder="e.g. Excessive idle fuel" required /></label><label>Category<select defaultValue="Idle"><option>Idle</option><option>Safety</option><option>Health</option><option>Fuel</option></select></label><button className="primary-button" type="submit">Save demo rule</button></form>}
            <div className="table-wrap"><table className="rules-table"><thead><tr><th>Rule name</th><th>Category</th><th>Condition</th><th>Action</th><th>Status</th><th>Manage</th></tr></thead><tbody>{rules.map((rule) => <tr key={rule.id}><td className="vehicle-id">{rule.name}</td><td>{rule.category}</td><td>{rule.condition}</td><td>{rule.action}</td><td><span className={`rule-status ${rule.active ? "rule-active" : "rule-paused"}`}>{rule.active ? "Active" : "Paused"}</span></td><td><button className="table-action" type="button" onClick={() => updateRules(rules.map((row) => row.id === rule.id ? { ...row, active: !row.active } : row))}>{rule.active ? "Pause" : "Enable"}</button>{rule.id.startsWith("demo-rule-") && <button className="table-action danger-action" type="button" onClick={() => updateRules(rules.filter((row) => row.id !== rule.id))}>Remove</button>}</td></tr>)}</tbody></table></div>
            <footer className="table-footer"><span>{rules.length} rules in local demo catalog</span><span>Backend rule management remains a follow-up.</span></footer>
          </section>

          <section className="settings-screen panel" id="settings" aria-labelledby="settings-title">
            <div className="settings-heading"><div><div className="section-title-row"><h2 id="settings-title">Settings</h2><span className="preview-badge">This browser</span></div><p>Set local dashboard preferences for the demo workspace.</p></div></div>
            <div className="settings-layout"><nav className="settings-nav" aria-label="Settings categories"><a className="selected" href="#settings-general">⚙ General</a><a href="#settings-notifications">♧ Notifications</a><a href="#settings-data">◈ Data sources</a><a href="#settings-security">♢ Security</a></nav><div className="settings-form" id="settings-general"><h3>General settings</h3><p>These preferences are saved locally in this browser.</p><div className="settings-fields"><label>Organization name<input value={settings.organization} onChange={(event) => updateSetting("organization", event.target.value)} /></label><label>Time zone<select value={settings.timeZone} onChange={(event) => updateSetting("timeZone", event.target.value)}><option value="Asia/Kolkata">(GMT+05:30) Asia/Kolkata</option><option value="UTC">(GMT+00:00) UTC</option><option value="America/Los_Angeles">(GMT-08:00) America/Los Angeles</option></select></label><label>Date format<select value={settings.dateFormat} onChange={(event) => updateSetting("dateFormat", event.target.value)}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select></label><label>Language<select value={settings.language} onChange={(event) => updateSetting("language", event.target.value)}><option>English</option></select></label></div><div className="settings-toggles"><label><span><strong>Real-time alert refresh</strong><small>Refresh fleet data automatically every five seconds</small></span><input type="checkbox" checked={settings.realTimeAlerts} onChange={(event) => updateSetting("realTimeAlerts", event.target.checked)} /></label><label><span><strong>Auto-acknowledge priority alerts</strong><small>Demo preference only; no acknowledgement API exists</small></span><input type="checkbox" checked={settings.autoAcknowledge} onChange={(event) => updateSetting("autoAcknowledge", event.target.checked)} /></label><label><span><strong>Show vehicle locations on map</strong><small>Display coordinates reported by telemetry</small></span><input type="checkbox" checked={settings.showLocations} onChange={(event) => updateSetting("showLocations", event.target.checked)} /></label></div><div className="settings-actions"><span role="status">{settingsSaved ? "Preferences saved in this browser." : ""}</span><button className="primary-button" type="button" onClick={() => { localStorage.setItem("fleet-demo-settings", JSON.stringify(settings)); setSettingsSaved(true); }}>Save changes</button></div></div></div>
          </section>

          <div className="workflow-preview-heading">
            <div><div className="eyebrow">FLEET OPERATIONS</div><h2>More fleet workflows</h2></div>
            <p>Screen previews use clearly marked synthetic records until backend services are connected.</p>
          </div>
          <div className="workflow-preview-list">
            <PreviewWorkspace id="drivers" title="Drivers" description="Driver roster, vehicle assignments, duty status, and safety signals." columns={driverColumns} rows={driverRows} />
            <PreviewWorkspace id="routes" title="Routes & dispatch" description="Planned fleet runs, assigned vehicles, and route progress." columns={routeColumns} rows={routeRows} />
            <PreviewWorkspace id="maintenance" title="Maintenance" description="Upcoming service needs and vehicle maintenance status." columns={maintenanceColumns} rows={maintenanceRows} />
            <PreviewWorkspace id="fuel" title="Fuel management" description="Fuel fill records, spend, and vehicle efficiency." columns={fuelColumns} rows={fuelRows} />
          </div>

          <section className="roadmap-note panel"><span className="roadmap-mark">i</span><p><strong>Data status:</strong> Overview, Vehicles, and Alerts use the telemetry API when available and switch to labeled synthetic preview data when it is not. The fleet map displays reported coordinates. Reports use the analytics API when available; Decisions and Settings are browser-local demo controls. Drivers, Routes &amp; Dispatch, Maintenance, and Fuel Management use synthetic preview records.</p></section>
          <footer className="page-footer"><span>Fleet Intelligence Platform</span><span>Connected data. Clear decisions.</span></footer>
        </div>
      </main>
    </div>
  );
}
