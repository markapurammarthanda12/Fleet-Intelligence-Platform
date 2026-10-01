package com.fleetintelligence.telemetry;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record FuelPurchaseRecord(
        UUID purchaseId,
        String tenantId,
        String vehicleId,
        String fuelType,
        Instant purchasedAt,
        BigDecimal litres,
        BigDecimal pricePerLitre,
        BigDecimal totalCost,
        BigDecimal co2EstimateKg) {
}
