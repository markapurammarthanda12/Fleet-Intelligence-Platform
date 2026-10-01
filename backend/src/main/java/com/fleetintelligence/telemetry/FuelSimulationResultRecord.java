package com.fleetintelligence.telemetry;

import java.math.BigDecimal;
import java.time.Instant;

public record FuelSimulationResultRecord(
        int vehiclesRefuelled,
        BigDecimal litresAdded,
        BigDecimal costAdded,
        BigDecimal estimatedCo2AddedKg,
        Instant triggeredAt) {
}
