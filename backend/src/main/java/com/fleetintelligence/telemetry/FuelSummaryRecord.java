package com.fleetintelligence.telemetry;

import java.math.BigDecimal;

public record FuelSummaryRecord(
        BigDecimal monthLitres,
        BigDecimal monthCost,
        BigDecimal monthEstimatedCo2Kg,
        long monthPurchaseCount,
        BigDecimal previousMonthCost,
        BigDecimal costChangePercent) {
}
