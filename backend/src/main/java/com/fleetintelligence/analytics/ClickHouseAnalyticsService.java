package com.fleetintelligence.analytics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ClickHouseAnalyticsService {
    private static final Duration MAX_RANGE = Duration.ofDays(31);
    private static final String HOURLY_QUERY = """
            WITH
                parseDateTime64BestEffort({start:String}, 3, 'UTC') AS start_at,
                parseDateTime64BestEffort({end:String}, 3, 'UTC') AS end_at,
                if(start_at = toStartOfHour(start_at), toStartOfHour(start_at), toStartOfHour(start_at) + INTERVAL 1 HOUR) AS first_full_hour
            SELECT bucket_start_epoch_ms, unique_events, vehicles_seen, idling_events, moving_events
            FROM
            (
                SELECT
                    toUnixTimestamp(bucket_start) * 1000 AS bucket_start_epoch_ms,
                    uniqExactMerge(unique_events_state) AS unique_events,
                    uniqExactMerge(vehicles_seen_state) AS vehicles_seen,
                    uniqExactIfMerge(idling_events_state) AS idling_events,
                    uniqExactIfMerge(moving_events_state) AS moving_events
                FROM fleet_analytics.telemetry_hourly_rollup
                WHERE tenant_id = {tenant_id:String}
                  AND bucket_start >= first_full_hour
                  AND bucket_start < toStartOfHour(end_at)
                GROUP BY tenant_id, bucket_start

                UNION ALL

                SELECT
                    toUnixTimestamp(toStartOfHour(observed_at)) * 1000 AS bucket_start_epoch_ms,
                    uniqExact(event_id) AS unique_events,
                    uniqExact(vehicle_id) AS vehicles_seen,
                    uniqExactIf(event_id, engine_on AND speed_kmh <= 0.5) AS idling_events,
                    uniqExactIf(event_id, engine_on AND speed_kmh > 0.5) AS moving_events
                FROM fleet_analytics.telemetry_events
                WHERE tenant_id = {tenant_id:String}
                  AND observed_at >= start_at
                  AND observed_at < end_at
                  AND (observed_at < first_full_hour OR observed_at >= toStartOfHour(end_at))
                GROUP BY bucket_start_epoch_ms
            )
            ORDER BY bucket_start_epoch_ms
            FORMAT JSONEachRow
            """;

    private final RestClient clickHouse;
    private final ObjectMapper objectMapper;

    public ClickHouseAnalyticsService(RestClient clickHouse, ObjectMapper objectMapper) {
        this.clickHouse = clickHouse;
        this.objectMapper = objectMapper;
    }

    public List<HourlyTelemetryPoint> hourlyTelemetry(String tenantId, Instant from, Instant to) {
        if (tenantId == null || tenantId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_id is required");
        }
        if (from == null || to == null || !from.isBefore(to) || Duration.between(from, to).compareTo(MAX_RANGE) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "from and to must define a range of at most 31 days");
        }

        try {
            URI queryUri = UriComponentsBuilder.fromPath("/")
                    .queryParam("param_tenant_id", UriUtils.encodeQueryParam(tenantId, StandardCharsets.UTF_8))
                    .queryParam("param_start", UriUtils.encodeQueryParam(from.toString(), StandardCharsets.UTF_8))
                    .queryParam("param_end", UriUtils.encodeQueryParam(to.toString(), StandardCharsets.UTF_8))
                    .build(true)
                    .toUri();
            String response = clickHouse.post()
                    .uri(queryUri)
                    .body(HOURLY_QUERY)
                    .retrieve()
                    .body(String.class);
            return parseRows(response == null ? "" : response);
        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Historical analytics is temporarily unavailable",
                    exception);
        }
    }

    private List<HourlyTelemetryPoint> parseRows(String response) {
        List<HourlyTelemetryPoint> points = new ArrayList<>();
        for (String line : response.lines().filter(value -> !value.isBlank()).toList()) {
            try {
                JsonNode row = objectMapper.readTree(line);
                points.add(new HourlyTelemetryPoint(
                        row.path("bucket_start_epoch_ms").asLong(),
                        row.path("unique_events").asLong(),
                        row.path("vehicles_seen").asLong(),
                        row.path("idling_events").asLong(),
                        row.path("moving_events").asLong()));
            } catch (IOException exception) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Historical analytics returned an unreadable result",
                        exception);
            }
        }
        return List.copyOf(points);
    }
}
