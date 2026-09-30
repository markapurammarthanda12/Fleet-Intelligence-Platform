package com.fleetintelligence.telemetry;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

public record TelemetryRequest(
        @NotBlank @Size(max = 64) String eventId,
        @NotBlank @Size(max = 64) String tenantId,
        @NotBlank @Size(max = 64) String vehicleId,
        @NotNull Instant observedAt,
        @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
        @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,
        @NotNull @DecimalMin("0.0") @DecimalMax("400.0") BigDecimal speedKmh,
        @NotNull Boolean engineOn,
        @PositiveOrZero Long sequence) {
}
