package com.fleetintelligence.analytics;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Creates exact hourly distinct-count states and backfills existing telemetry once. */
@Component
@ConditionalOnProperty(name = "fleet.analytics.rollups.enabled", havingValue = "true", matchIfMissing = true)
public class ClickHouseRollupInitializer implements ApplicationRunner {
    private static final String MIGRATION_MARKER_QUERY =
            "SELECT count() FROM fleet_analytics.rollup_backfill_status WHERE version = 1";
    private static final String BACKFILL_QUERY = """
            INSERT INTO fleet_analytics.telemetry_hourly_rollup
            SELECT
                tenant_id,
                toStartOfHour(observed_at) AS bucket_start,
                uniqExactState(event_id) AS unique_events_state,
                uniqExactState(vehicle_id) AS vehicles_seen_state,
                uniqExactIfState(event_id, engine_on AND speed_kmh <= 0.5) AS idling_events_state,
                uniqExactIfState(event_id, engine_on AND speed_kmh > 0.5) AS moving_events_state
            FROM fleet_analytics.telemetry_events
            GROUP BY tenant_id, bucket_start
            SETTINGS max_threads = 2
            """;

    private final RestClient clickHouse;

    public ClickHouseRollupInitializer(RestClient clickHouse) {
        this.clickHouse = clickHouse;
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        String schema = new String(
                new ClassPathResource("clickhouse/02-hourly-rollups.sql").getInputStream().readAllBytes(),
                StandardCharsets.UTF_8);
        List<String> statements = Arrays.stream(schema.split(";"))
                .map(String::trim)
                .filter(statement -> !statement.isEmpty())
                .toList();
        statements.forEach(this::execute);

        if (Integer.parseInt(query(MIGRATION_MARKER_QUERY).trim()) == 0) {
            execute(BACKFILL_QUERY);
            execute("INSERT INTO fleet_analytics.rollup_backfill_status SELECT 1");
        }
    }

    private void execute(String sql) {
        clickHouse.post().uri("/").body(sql).retrieve().toBodilessEntity();
    }

    private String query(String sql) {
        return clickHouse.post().uri("/").body(sql).retrieve().body(String.class);
    }
}
