"""Domain types and transparent starter rules for FleetPulse."""

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class TelemetryEvent:
    event_id: str
    tenant_id: str
    vehicle_id: str
    observed_at: datetime
    latitude: float
    longitude: float
    speed_kmh: float
    engine_on: bool
    fuel_litres: float | None = None


@dataclass(frozen=True, slots=True)
class IdleAlert:
    event_id: str
    tenant_id: str
    vehicle_id: str
    observed_at: datetime
    idle_seconds: int
    estimated_fuel_litres: float
    rule_version: str = "idle-v1"


def detect_idle_alert(
    event: TelemetryEvent,
    idle_seconds: int,
    threshold_seconds: int,
    litres_per_idle_hour: float,
) -> IdleAlert | None:
    """Return an alert for stationary, running vehicles after the configured duration."""
    if not event.engine_on or event.speed_kmh > 0.5 or idle_seconds < threshold_seconds:
        return None
    estimated_fuel = litres_per_idle_hour * idle_seconds / 3600
    return IdleAlert(
        event_id=event.event_id,
        tenant_id=event.tenant_id,
        vehicle_id=event.vehicle_id,
        observed_at=event.observed_at,
        idle_seconds=idle_seconds,
        estimated_fuel_litres=round(estimated_fuel, 3),
    )
