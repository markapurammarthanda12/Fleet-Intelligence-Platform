package com.fleetintelligence.telemetry;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FuelService {
    private final JdbcTemplate jdbcTemplate;

    public FuelService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public FuelSimulationResultRecord triggerRefuelling(String tenantId) {
        int fleetSize = fleetSize(tenantId);
        if (fleetSize == 0) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "No vehicles have reported to this fleet yet. Start the simulator and try again.");
        }
        int batchSize = Math.max(1, Math.min(500, (int) Math.ceil(fleetSize * 0.001)));
        List<String> fleetVehicles = jdbcTemplate.queryForList("""
                SELECT vehicle_id FROM vehicle_runtime_state
                WHERE tenant_id = ? ORDER BY random() LIMIT ?
                """, String.class, tenantId, batchSize);
        if (fleetVehicles.isEmpty()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "No vehicles have reported to this fleet yet. Start the simulator and try again.");
        }
        List<Object[]> batch = new ArrayList<>(batchSize);
        Instant purchasedAt = Instant.now();
        ThreadLocalRandom random = ThreadLocalRandom.current();
        for (int index = 0; index < batchSize; index++) {
            String fuelType = random.nextInt(10) < 7 ? "petrol" : "diesel";
            BigDecimal litres = BigDecimal.valueOf(random.nextDouble(28.0, 56.0)).setScale(3, java.math.RoundingMode.HALF_UP);
            BigDecimal price = fuelType.equals("petrol")
                    ? BigDecimal.valueOf(104.75) : BigDecimal.valueOf(91.50);
            batch.add(new Object[] {
                    UUID.randomUUID(), tenantId, fleetVehicles.get(index), fuelType,
                    Timestamp.from(purchasedAt), litres, price
            });
        }
        jdbcTemplate.batchUpdate("""
                INSERT INTO fuel_purchases (
                    purchase_id, tenant_id, vehicle_id, fuel_type, purchased_at, litres, price_per_litre
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, batch);

        BigDecimal totalCost = batch.stream().map(row ->
                ((BigDecimal) row[5]).multiply((BigDecimal) row[6])
                        .setScale(2, java.math.RoundingMode.HALF_UP))
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, java.math.RoundingMode.HALF_UP);
        BigDecimal totalLitres = batch.stream().map(row -> (BigDecimal) row[5])
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(3, java.math.RoundingMode.HALF_UP);
        BigDecimal totalCo2 = batch.stream().map(row -> {
                    BigDecimal factor = row[3].equals("petrol") ? BigDecimal.valueOf(2.35) : BigDecimal.valueOf(2.69);
                    return ((BigDecimal) row[5]).multiply(factor)
                            .setScale(3, java.math.RoundingMode.HALF_UP);
                }).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(3, java.math.RoundingMode.HALF_UP);
        return new FuelSimulationResultRecord(batchSize, totalLitres, totalCost, totalCo2, purchasedAt);
    }

    public List<FuelPurchaseRecord> purchases(String tenantId, int limit) {
        return jdbcTemplate.query("""
                SELECT purchase_id, tenant_id, vehicle_id, fuel_type, purchased_at,
                       litres, price_per_litre, total_cost, co2_estimate_kg
                FROM fuel_purchases
                WHERE tenant_id = ?
                ORDER BY purchased_at DESC, created_at DESC
                LIMIT ?
                """, purchaseMapper(), tenantId, Math.max(1, Math.min(limit, 500)));
    }

    public int fleetSize(String tenantId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM vehicle_runtime_state WHERE tenant_id = ?", Integer.class, tenantId);
        return count == null ? 0 : count;
    }

    public FuelSummaryRecord summary(String tenantId) {
        YearMonth current = YearMonth.now(ZoneOffset.UTC);
        Instant from = current.atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant to = current.plusMonths(1).atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant previousFrom = current.minusMonths(1).atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        return jdbcTemplate.queryForObject("""
                SELECT
                    coalesce(sum(litres) FILTER (WHERE purchased_at >= ? AND purchased_at < ?), 0) AS month_litres,
                    coalesce(sum(total_cost) FILTER (WHERE purchased_at >= ? AND purchased_at < ?), 0) AS month_cost,
                    coalesce(sum(co2_estimate_kg) FILTER (WHERE purchased_at >= ? AND purchased_at < ?), 0) AS month_co2,
                    count(*) FILTER (WHERE purchased_at >= ? AND purchased_at < ?) AS month_count,
                    coalesce(sum(total_cost) FILTER (WHERE purchased_at >= ? AND purchased_at < ?), 0) AS previous_cost
                FROM fuel_purchases WHERE tenant_id = ?
                """,
                (result, row) -> {
                    BigDecimal previousCost = result.getBigDecimal("previous_cost");
                    BigDecimal monthCost = result.getBigDecimal("month_cost");
                    BigDecimal change = previousCost.signum() == 0 ? null
                            : monthCost.subtract(previousCost).multiply(BigDecimal.valueOf(100))
                                    .divide(previousCost, 1, java.math.RoundingMode.HALF_UP);
                    return new FuelSummaryRecord(
                            result.getBigDecimal("month_litres"), monthCost,
                            result.getBigDecimal("month_co2"), result.getLong("month_count"),
                            previousCost, change);
                },
                Timestamp.from(from), Timestamp.from(to),
                Timestamp.from(from), Timestamp.from(to),
                Timestamp.from(from), Timestamp.from(to),
                Timestamp.from(from), Timestamp.from(to),
                Timestamp.from(previousFrom), Timestamp.from(from), tenantId);
    }

    private org.springframework.jdbc.core.RowMapper<FuelPurchaseRecord> purchaseMapper() {
        return (result, row) -> new FuelPurchaseRecord(
                result.getObject("purchase_id", UUID.class), result.getString("tenant_id"),
                result.getString("vehicle_id"), result.getString("fuel_type"),
                result.getTimestamp("purchased_at").toInstant(), result.getBigDecimal("litres"),
                result.getBigDecimal("price_per_litre"), result.getBigDecimal("total_cost"),
                result.getBigDecimal("co2_estimate_kg"));
    }
}
