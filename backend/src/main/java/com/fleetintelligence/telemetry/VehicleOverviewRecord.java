package com.fleetintelligence.telemetry;

import java.math.BigDecimal;
import java.time.Instant;

public record VehicleOverviewRecord(
        String tenantId,
        String vehicleId,
        String status,
        Instant lastSeenAt,
        BigDecimal latitude,
        BigDecimal longitude,
        BigDecimal speedKmh,
        long openAlertCount,
        String healthStatus) {
}
