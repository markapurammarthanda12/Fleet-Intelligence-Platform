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
            SELECT
                toUnixTimestamp(toStartOfHour(observed_at)) * 1000 AS bucket_start_epoch_ms,
                uniqExact(event_id) AS unique_events,
                uniqExact(vehicle_id) AS vehicles_seen,
                uniqExactIf(event_id, engine_on AND speed_kmh <= 0.5) AS idling_events,
                uniqExactIf(event_id, engine_on AND speed_kmh > 0.5) AS moving_events
            FROM fleet_analytics.telemetry_events
            WHERE tenant_id = {tenant_id:String}
              AND observed_at >= parseDateTime64BestEffort({start:String}, 3, 'UTC')
              AND observed_at < parseDateTime64BestEffort({end:String}, 3, 'UTC')
            GROUP BY bucket_start_epoch_ms
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
                    .queryParam("query", UriUtils.encodeQueryParam(HOURLY_QUERY, StandardCharsets.UTF_8))
                    .queryParam("param_tenant_id", UriUtils.encodeQueryParam(tenantId, StandardCharsets.UTF_8))
                    .queryParam("param_start", UriUtils.encodeQueryParam(from.toString(), StandardCharsets.UTF_8))
                    .queryParam("param_end", UriUtils.encodeQueryParam(to.toString(), StandardCharsets.UTF_8))
                    .build(true)
                    .toUri();
            String response = clickHouse.get()
                    .uri(queryUri)
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
