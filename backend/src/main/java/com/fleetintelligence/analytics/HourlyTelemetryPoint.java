package com.fleetintelligence.analytics;

public record HourlyTelemetryPoint(
        long bucketStartEpochMs,
        long uniqueEvents,
        long vehiclesSeen,
        long idlingEvents,
        long movingEvents) {
}
