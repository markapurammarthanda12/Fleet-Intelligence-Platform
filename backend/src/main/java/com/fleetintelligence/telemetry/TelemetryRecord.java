package com.fleetintelligence.telemetry;

import java.math.BigDecimal;
import java.time.Instant;

public record TelemetryRecord(
        String eventId,
        String tenantId,
        String vehicleId,
        Instant observedAt,
        BigDecimal latitude,
        BigDecimal longitude,
        BigDecimal speedKmh,
        boolean engineOn,
        Long sequence) {
}
