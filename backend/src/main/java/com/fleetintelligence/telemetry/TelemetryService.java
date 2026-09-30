package com.fleetintelligence.telemetry;

import java.sql.Timestamp;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class TelemetryService {
    private final JdbcTemplate jdbcTemplate;

    public TelemetryService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

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
        return inserted == 0;
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
}
