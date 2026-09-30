package com.fleetintelligence.telemetry;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TelemetryService {
    private final JdbcTemplate jdbcTemplate;
    private final long idleAlertSeconds;
    private final double fuelLitresPerIdleHour;

    public TelemetryService(
            JdbcTemplate jdbcTemplate,
            @Value("${IDLE_ALERT_SECONDS:300}") long idleAlertSeconds,
            @Value("${FUEL_LITRES_PER_IDLE_HOUR:1.5}") double fuelLitresPerIdleHour) {
        this.jdbcTemplate = jdbcTemplate;
        this.idleAlertSeconds = idleAlertSeconds;
        this.fuelLitresPerIdleHour = fuelLitresPerIdleHour;
    }

    @Transactional
    public boolean ingest(TelemetryRequest event) {
        int inserted = jdbcTemplate.update("""
                INSERT INTO telemetry_events (
                    event_id, tenant_id, vehicle_id, observed_at,
                    latitude, longitude, speed_kmh, engine_on, event_sequence
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (tenant_id, event_id) DO NOTHING
                """,
                event.eventId(),
                event.tenantId(),
                event.vehicleId(),
                Timestamp.from(event.observedAt()),
                event.latitude(),
                event.longitude(),
                event.speedKmh(),
                event.engineOn(),
                event.sequence());
        if (inserted == 0) {
            return true;
        }

        updateVehicleState(event);
        return false;
    }

    public List<TelemetryRecord> history(String tenantId, String vehicleId, int limit) {
        return jdbcTemplate.query("""
                SELECT event_id, tenant_id, vehicle_id, observed_at,
                       latitude, longitude, speed_kmh, engine_on, event_sequence
                FROM telemetry_events
                WHERE tenant_id = ? AND vehicle_id = ?
                ORDER BY observed_at DESC
                LIMIT ?
                """,
                (result, row) -> new TelemetryRecord(
                        result.getString("event_id"),
                        result.getString("tenant_id"),
                        result.getString("vehicle_id"),
                        result.getTimestamp("observed_at").toInstant(),
                        result.getBigDecimal("latitude"),
                        result.getBigDecimal("longitude"),
                        result.getBigDecimal("speed_kmh"),
                        result.getBoolean("engine_on"),
                        (Long) result.getObject("event_sequence", Long.class)),
                tenantId,
                vehicleId,
                Math.max(1, Math.min(limit, 500)));
    }

    public List<AlertRecord> alerts(String tenantId, int limit) {
        return jdbcTemplate.query("""
                SELECT alert_id, tenant_id, vehicle_id, rule_version, severity,
                       episode_started_at, last_observed_at, idle_seconds,
                       estimated_fuel_litres, status
                FROM fleet_alerts
                WHERE tenant_id = ?
                ORDER BY last_observed_at DESC
                LIMIT ?
                """,
                alertRowMapper(),
                tenantId,
                Math.max(1, Math.min(limit, 500)));
    }

    private void updateVehicleState(TelemetryRequest event) {
        jdbcTemplate.query(
                "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))",
                result -> null,
                event.tenantId() + ":" + event.vehicleId());
        List<VehicleState> matches = jdbcTemplate.query("""
                SELECT last_observed_at, stationary_since, alert_open
                FROM vehicle_runtime_state
                WHERE tenant_id = ? AND vehicle_id = ?
                FOR UPDATE
                """,
                (result, row) -> new VehicleState(
                        result.getTimestamp("last_observed_at").toInstant(),
                        result.getTimestamp("stationary_since") == null
                                ? null : result.getTimestamp("stationary_since").toInstant(),
                        result.getBoolean("alert_open")),
                event.tenantId(),
                event.vehicleId());

        boolean stationary = event.engineOn() && event.speedKmh().doubleValue() <= 0.5;
        if (matches.isEmpty()) {
            Instant stationarySince = stationary ? event.observedAt() : null;
            jdbcTemplate.update("""
                    INSERT INTO vehicle_runtime_state (
                        tenant_id, vehicle_id, last_observed_at, stationary_since, alert_open
                    ) VALUES (?, ?, ?, ?, false)
                    ON CONFLICT (tenant_id, vehicle_id) DO NOTHING
                    """,
                    event.tenantId(), event.vehicleId(), Timestamp.from(event.observedAt()),
                    stationarySince == null ? null : Timestamp.from(stationarySince));
            return;
        }

        VehicleState previous = matches.getFirst();
        if (!event.observedAt().isAfter(previous.lastObservedAt())) {
            return;
        }

        Instant stationarySince = stationary
                ? (previous.stationarySince() == null ? event.observedAt() : previous.stationarySince())
                : null;
        boolean alertOpen = stationary && previous.alertOpen();
        if (!stationary && previous.alertOpen()) {
            jdbcTemplate.update("""
                    UPDATE fleet_alerts
                    SET status = 'resolved', resolved_at = ?
                    WHERE tenant_id = ? AND vehicle_id = ?
                      AND status = 'open' AND rule_version = 'idle-v1'
                    """,
                    Timestamp.from(event.observedAt()), event.tenantId(), event.vehicleId());
        }
        if (stationarySince != null) {
            long idleSeconds = Duration.between(stationarySince, event.observedAt()).getSeconds();
            if (idleSeconds >= idleAlertSeconds) {
                upsertIdleAlert(event, stationarySince, idleSeconds);
                alertOpen = true;
            }
        }

        jdbcTemplate.update("""
                UPDATE vehicle_runtime_state
                SET last_observed_at = ?, stationary_since = ?, alert_open = ?, updated_at = now()
                WHERE tenant_id = ? AND vehicle_id = ?
                """,
                Timestamp.from(event.observedAt()),
                stationarySince == null ? null : Timestamp.from(stationarySince),
                alertOpen,
                event.tenantId(),
                event.vehicleId());
    }

    private void upsertIdleAlert(TelemetryRequest event, Instant startedAt, long idleSeconds) {
        double estimatedFuel = Math.round(fuelLitresPerIdleHour * idleSeconds / 3600.0 * 1000.0) / 1000.0;
        jdbcTemplate.update("""
                INSERT INTO fleet_alerts (
                    alert_id, tenant_id, vehicle_id, rule_version, severity,
                    episode_started_at, last_observed_at, idle_seconds,
                       estimated_fuel_litres, status, resolved_at
                ) VALUES (?, ?, ?, 'idle-v1', 'warning', ?, ?, ?, ?, 'open')
                ON CONFLICT (tenant_id, vehicle_id, rule_version, episode_started_at)
                DO UPDATE SET last_observed_at = EXCLUDED.last_observed_at,
                              idle_seconds = EXCLUDED.idle_seconds,
                              estimated_fuel_litres = EXCLUDED.estimated_fuel_litres
                """,
                UUID.randomUUID().toString(),
                event.tenantId(),
                event.vehicleId(),
                Timestamp.from(startedAt),
                Timestamp.from(event.observedAt()),
                idleSeconds,
                estimatedFuel);
    }

    private RowMapper<AlertRecord> alertRowMapper() {
        return (result, row) -> new AlertRecord(
                result.getString("alert_id"),
                result.getString("tenant_id"),
                result.getString("vehicle_id"),
                result.getString("rule_version"),
                result.getString("severity"),
                result.getTimestamp("episode_started_at").toInstant(),
                result.getTimestamp("last_observed_at").toInstant(),
                result.getLong("idle_seconds"),
                result.getDouble("estimated_fuel_litres"),
                result.getString("status"),
                result.getTimestamp("resolved_at") == null
                        ? null : result.getTimestamp("resolved_at").toInstant());
    }

    private record VehicleState(Instant lastObservedAt, Instant stationarySince, boolean alertOpen) {
    }
}
