package com.fleetintelligence.telemetry;

public record IngestResponse(boolean accepted, boolean duplicate) {
}
