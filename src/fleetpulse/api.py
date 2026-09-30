"""Small local API for synthetic telemetry and idling alerts."""

import os
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from fleetpulse.domain import TelemetryEvent, detect_idle_alert

app = FastAPI(title="FleetPulse API", version="0.1.0")
events_seen: set[str] = set()
last_stationary: dict[tuple[str, str], datetime] = {}
alerts: list[dict] = []
IDLE_ALERT_SECONDS = int(os.getenv("IDLE_ALERT_SECONDS", "300"))
FUEL_LITRES_PER_IDLE_HOUR = float(os.getenv("FUEL_LITRES_PER_IDLE_HOUR", "1.5"))


class TelemetryPayload(BaseModel):
    event_id: str
    tenant_id: str
    vehicle_id: str
    observed_at: datetime
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    speed_kmh: float = Field(ge=0, le=400)
    engine_on: bool


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/telemetry", status_code=202)
def ingest(payload: TelemetryPayload) -> dict[str, str | bool]:
    if payload.event_id in events_seen:
        return {"accepted": True, "duplicate": True}
    events_seen.add(payload.event_id)
    if payload.observed_at.tzinfo is None:
        raise HTTPException(status_code=422, detail="observed_at must include a timezone")

    key = (payload.tenant_id, payload.vehicle_id)
    stationary = payload.engine_on and payload.speed_kmh <= 0.5
    previous = last_stationary.get(key)
    if stationary and previous is not None:
        idle_seconds = max(0, int((payload.observed_at - previous).total_seconds()))
        event = TelemetryEvent(
            event_id=payload.event_id,
            tenant_id=payload.tenant_id,
            vehicle_id=payload.vehicle_id,
            observed_at=payload.observed_at,
            latitude=payload.latitude,
            longitude=payload.longitude,
            speed_kmh=payload.speed_kmh,
            engine_on=payload.engine_on,
        )
        alert = detect_idle_alert(
            event, idle_seconds, IDLE_ALERT_SECONDS, FUEL_LITRES_PER_IDLE_HOUR
        )
        if alert:
            alerts.append({**alert.__dict__} if hasattr(alert, "__dict__") else {
                "event_id": alert.event_id,
                "tenant_id": alert.tenant_id,
                "vehicle_id": alert.vehicle_id,
                "observed_at": alert.observed_at.isoformat(),
                "idle_seconds": alert.idle_seconds,
                "estimated_fuel_litres": alert.estimated_fuel_litres,
                "rule_version": alert.rule_version,
            })
    if stationary:
        last_stationary[key] = max(previous, payload.observed_at) if previous else payload.observed_at
    else:
        last_stationary.pop(key, None)
    return {"accepted": True, "duplicate": False}


@app.get("/v1/alerts")
def list_alerts(limit: int = 100) -> dict[str, list[dict]]:
    return {"items": alerts[-max(1, min(limit, 500)):]}
