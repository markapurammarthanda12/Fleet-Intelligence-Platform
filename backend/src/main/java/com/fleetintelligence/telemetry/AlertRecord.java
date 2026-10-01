package com.fleetintelligence.telemetry;

import java.time.Instant;

public record AlertRecord(
        String alertId,
        String tenantId,
        String vehicleId,
        String ruleVersion,
        String severity,
        Instant episodeStartedAt,
        Instant lastObservedAt,
        long idleSeconds,
        double estimatedFuelLitres,
        String status,
        Instant resolvedAt,
        Instant acknowledgedAt,
        String acknowledgedBy) {
}
