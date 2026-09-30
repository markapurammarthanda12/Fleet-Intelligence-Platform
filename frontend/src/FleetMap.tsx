import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapVehicle = {
  vehicle_id: string;
  status: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  open_alert_count: number;
};

type Props = { vehicles: MapVehicle[] };

const statusColor: Record<string, string> = { moving: "#11a77b", idling: "#e9952d", inactive: "#7b8ba4", offline: "#9aa6b7" };

export default function FleetMap({ vehicles }: Props) {
  const element = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const vehicleLayer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!element.current || map.current) return;
    map.current = L.map(element.current, { zoomControl: false, scrollWheelZoom: true }).setView([13.0827, 80.2707], 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
    }).addTo(map.current);
    L.control.zoom({ position: "bottomright" }).addTo(map.current);
    vehicleLayer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
      vehicleLayer.current = null;
    };
  }, []);

  useEffect(() => {
    const currentMap = map.current;
    const layer = vehicleLayer.current;
    if (!currentMap || !layer) return;
    layer.clearLayers();
    const located = vehicles.filter((vehicle) => Number.isFinite(vehicle.latitude) && Number.isFinite(vehicle.longitude));
    const byLocation = new Map<string, MapVehicle[]>();
    located.forEach((vehicle) => {
      const key = `${vehicle.latitude.toFixed(5)},${vehicle.longitude.toFixed(5)}`;
      byLocation.set(key, [...(byLocation.get(key) ?? []), vehicle]);
    });
    byLocation.forEach((group) => {
      const vehicle = group[0];
      const color = statusColor[vehicle.status] ?? statusColor.offline;
      const isCluster = group.length > 1;
      const marker = L.marker([vehicle.latitude, vehicle.longitude], {
        icon: L.divIcon({
          className: `fleet-map-marker-icon${isCluster ? " fleet-map-cluster-icon" : ""}`,
          html: isCluster ? `<span title="${group.length} vehicles share this reported location">${group.length}</span>` : `<span style="--marker-color:${color}"><i></i></span>`,
          iconSize: isCluster ? [34, 34] : [28, 34],
          iconAnchor: isCluster ? [17, 17] : [14, 30],
          popupAnchor: isCluster ? [0, -17] : [0, -28],
        }),
        title: isCluster ? `${group.length} vehicles at this reported location` : vehicle.vehicle_id,
        alt: isCluster ? `${group.length} vehicles share this reported location` : `${vehicle.vehicle_id}, ${vehicle.status}`,
      });
      const popup = document.createElement("div");
      group.forEach((item) => {
        const details = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = item.vehicle_id;
        const signal = document.createElement("div");
        signal.textContent = `${item.status} · ${item.speed_kmh.toFixed(0)} km/h`;
        details.append(name, signal);
        if (item.open_alert_count > 0) {
          const alert = document.createElement("div");
          alert.className = "fleet-map-alert";
          alert.textContent = `${item.open_alert_count} open alert${item.open_alert_count > 1 ? "s" : ""}`;
          details.append(alert);
        }
        popup.append(details);
      });
      marker.bindPopup(popup);
      marker.addTo(layer);
    });
    if (located.length > 1) currentMap.fitBounds(L.latLngBounds(located.map((vehicle): L.LatLngExpression => [vehicle.latitude, vehicle.longitude])), { padding: [42, 42], maxZoom: 14 });
    else if (located.length === 1) currentMap.setView([located[0].latitude, located[0].longitude], 14);
    window.setTimeout(() => currentMap.invalidateSize(), 60);
  }, [vehicles]);

  return <div className="fleet-map-frame"><div className="fleet-map-canvas" ref={element} aria-label="Interactive fleet vehicle map" /><div className="fleet-map-attribution-note">Vehicle locations are reported by telemetry. OpenStreetMap © contributors.</div></div>;
}
