package com.fleetintelligence.telemetry;

public record IngestResponse(boolean accepted, String eventId, String status) {
}
