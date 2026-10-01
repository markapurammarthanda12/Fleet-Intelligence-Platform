package com.fleetintelligence.telemetry;

import java.time.Instant;

public record FleetOverviewRecord(
        long vehiclesSeen,
        long movingNow,
        long idlingNow,
        long inactiveNow,
        long offline,
        long healthyVehicles,
        long warningVehicles,
        long criticalVehicles,
        long openAlerts,
        double estimatedIdleFuelLitres,
        Instant latestEventAt) {
}
