package com.fleetintelligence.telemetry;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import com.fleetintelligence.analytics.ClickHouseAnalyticsService;
import com.fleetintelligence.analytics.HourlyTelemetryPoint;
import java.util.List;
import java.util.Properties;
import java.util.UUID;
import java.util.stream.StreamSupport;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.kafka.KafkaContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@TestPropertySource(properties = {"fleet.security.enabled=true", "fleet.analytics.rollups.enabled=false"})
class TelemetryApiIntegrationTest {
    private static final String TELEMETRY_TOPIC = "fleet.telemetry.v1";
    @Container
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("fleetintel_test")
            .withUsername("fleetintel")
            .withPassword("test-only-password");

    @Container
    private static final KafkaContainer KAFKA = new KafkaContainer("apache/kafka:3.9.1");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private TelemetryService telemetryService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @MockitoBean
    private ClickHouseAnalyticsService clickHouseAnalyticsService;

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.kafka.bootstrap-servers", KAFKA::getBootstrapServers);
    }

    @BeforeEach
    void clearDatabase() {
        jdbcTemplate.update("DELETE FROM fleet_alerts");
        jdbcTemplate.update("DELETE FROM vehicle_runtime_state");
        jdbcTemplate.update("DELETE FROM telemetry_events");
    }

    @Test
    void duplicateBrokerDeliveryIsIdempotentInTheDatabase() throws Exception {
        send("retry-event", "retry-vehicle", "2026-09-30T08:00:00Z", 0, 1);
        boolean duplicate = telemetryService.ingest(new TelemetryRequest(
                "retry-event",
                "tenant-demo",
                "retry-vehicle",
                Instant.parse("2026-09-30T08:00:00Z"),
                new BigDecimal("12.9716"),
                new BigDecimal("77.5946"),
                BigDecimal.ZERO,
                true,
                1L));
        org.assertj.core.api.Assertions.assertThat(duplicate).isTrue();

        Integer storedEvents = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM telemetry_events WHERE tenant_id = 'tenant-demo' AND event_id = 'retry-event'",
                Integer.class);
        org.assertj.core.api.Assertions.assertThat(storedEvents).isEqualTo(1);
    }

    @Test
    void aNewConsumerGroupCanReplayTheRetainedTelemetryLog() throws Exception {
        send("replay-event", "replay-vehicle", "2026-09-30T08:00:00Z", 12, 1);

        Properties properties = new Properties();
        properties.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, KAFKA.getBootstrapServers());
        properties.put(ConsumerConfig.GROUP_ID_CONFIG, "replay-verification-" + UUID.randomUUID());
        properties.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        properties.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        properties.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        properties.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());

        try (KafkaConsumer<String, String> replayConsumer = new KafkaConsumer<>(properties)) {
            replayConsumer.subscribe(List.of(TELEMETRY_TOPIC));
            org.awaitility.Awaitility.await()
                    .atMost(Duration.ofSeconds(10))
                    .untilAsserted(() -> {
                        ConsumerRecords<String, String> records = replayConsumer.poll(Duration.ofMillis(250));
                        boolean replayed = StreamSupport.stream(records.records(TELEMETRY_TOPIC).spliterator(), false)
                                .map(ConsumerRecord::value)
                                .anyMatch(payload -> payload.contains("\"event_id\":\"replay-event\""));
                        org.assertj.core.api.Assertions.assertThat(replayed).isTrue();
                    });
        }
    }

    @Test
    void stationaryEventsOpenExplainableAlertAndMovementResolvesIt() throws Exception {
        send("idle-start", "idle-vehicle", "2026-09-30T08:00:00Z", 0, 1);
        send("idle-after-threshold", "idle-vehicle", "2026-09-30T08:06:00Z", 0, 2);

        mockMvc.perform(get("/v1/alerts").param("tenant_id", "tenant-demo").with(fleetRead("tenant-demo")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].vehicle_id").value("idle-vehicle"))
                .andExpect(jsonPath("$[0].status").value("open"))
                .andExpect(jsonPath("$[0].severity").value("warning"))
                .andExpect(jsonPath("$[0].idle_seconds").value(360))
                .andExpect(jsonPath("$[0].estimated_fuel_litres").value(0.15))
                .andExpect(jsonPath("$[0].resolved_at").value(org.hamcrest.Matchers.nullValue()));

        send("vehicle-moved", "idle-vehicle", "2026-09-30T08:07:00Z", 25, 3);

        mockMvc.perform(get("/v1/alerts").param("tenant_id", "tenant-demo").with(fleetRead("tenant-demo")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("resolved"))
                .andExpect(jsonPath("$[0].resolved_at").isNotEmpty());
    }

    @Test
    void prolongedIdlingEscalatesToCriticalAndIsPrioritized() throws Exception {
        send("warning-start", "warning-vehicle", "2026-09-30T08:00:00Z", 0, 1);
        send("warning-threshold", "warning-vehicle", "2026-09-30T08:06:00Z", 0, 2);
        send("critical-start", "critical-vehicle", "2026-09-30T08:00:00Z", 0, 3);
        send("critical-threshold", "critical-vehicle", "2026-09-30T08:16:00Z", 0, 4);

        mockMvc.perform(get("/v1/alerts").param("tenant_id", "tenant-demo").with(fleetRead("tenant-demo")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].vehicle_id").value("critical-vehicle"))
                .andExpect(jsonPath("$[0].severity").value("critical"))
                .andExpect(jsonPath("$[1].severity").value("warning"));
    }

    @Test
    void lateEventIsStoredButDoesNotRewindOpenAlertState() throws Exception {
        send("late-start", "late-vehicle", "2026-09-30T08:00:00Z", 0, 1);
        send("late-threshold", "late-vehicle", "2026-09-30T08:06:00Z", 0, 2);
        send("late-arrival", "late-vehicle", "2026-09-30T08:02:00Z", 20, 3);

        mockMvc.perform(get("/v1/alerts").param("tenant_id", "tenant-demo").with(fleetRead("tenant-demo")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("open"))
                .andExpect(jsonPath("$[0].last_observed_at").value("2026-09-30T08:06:00Z"));

        Integer storedEvents = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM telemetry_events WHERE tenant_id = 'tenant-demo' AND vehicle_id = 'late-vehicle'",
                Integer.class);
        org.assertj.core.api.Assertions.assertThat(storedEvents).isEqualTo(3);

        jdbcTemplate.queryForObject("""
                SELECT last_observed_at, speed_kmh
                FROM vehicle_runtime_state
                WHERE tenant_id = 'tenant-demo' AND vehicle_id = 'late-vehicle'
                """, (result, row) -> {
            org.assertj.core.api.Assertions.assertThat(result.getTimestamp("last_observed_at").toInstant())
                    .isEqualTo(Instant.parse("2026-09-30T08:06:00Z"));
            org.assertj.core.api.Assertions.assertThat(result.getBigDecimal("speed_kmh"))
                    .isEqualByComparingTo("0.00");
            return true;
        });
    }

    @Test
    void rejectsInvalidCoordinatesWithoutPersistingTheEvent() throws Exception {
        String invalidEvent = event("bad-coordinates", "invalid-vehicle", "2026-09-30T08:00:00Z", 0, 1)
                .replace("\"latitude\":12.9716", "\"latitude\":95.0");

        mockMvc.perform(post("/v1/telemetry").with(fleetIngest("tenant-demo"))
                        .contentType("application/json").content(invalidEvent))
                .andExpect(status().isBadRequest());

        Integer storedEvents = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM telemetry_events WHERE event_id = 'bad-coordinates'", Integer.class);
        org.assertj.core.api.Assertions.assertThat(storedEvents).isZero();
    }

    @Test
    void fleetOverviewAndVehicleListUseLatestTenantTelemetry() throws Exception {
        String observedAt = Instant.now().minusSeconds(20).toString();
        send("overview-moving", "overview-vehicle", observedAt, 42, 1);

        mockMvc.perform(get("/v1/fleet/overview").param("tenant_id", "tenant-demo").with(fleetRead("tenant-demo")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.vehicles_seen").value(1))
                .andExpect(jsonPath("$.moving_now").value(1))
                .andExpect(jsonPath("$.idling_now").value(0))
                .andExpect(jsonPath("$.open_alerts").value(0))
                .andExpect(jsonPath("$.latest_event_at").isNotEmpty());

        mockMvc.perform(get("/v1/vehicles").param("tenant_id", "tenant-demo").with(fleetRead("tenant-demo")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].vehicle_id").value("overview-vehicle"))
                .andExpect(jsonPath("$[0].status").value("moving"))
                .andExpect(jsonPath("$[0].latitude").value(12.9716))
                .andExpect(jsonPath("$[0].longitude").value(77.5946));

        mockMvc.perform(get("/v1/fleet/overview").param("tenant_id", "another-tenant").with(fleetRead("another-tenant")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.vehicles_seen").value(0));
    }

    private void send(String eventId, String vehicleId, String observedAt, int speed, int sequence)
            throws Exception {
        mockMvc.perform(post("/v1/telemetry").with(fleetIngest("tenant-demo"))
                        .contentType("application/json")
                        .content(event(eventId, vehicleId, observedAt, speed, sequence)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.accepted").value(true))
                .andExpect(jsonPath("$.event_id").value(eventId))
                .andExpect(jsonPath("$.status").value("queued"));

        org.awaitility.Awaitility.await()
                .atMost(Duration.ofSeconds(10))
                .untilAsserted(() -> {
                    Integer count = jdbcTemplate.queryForObject(
                            "SELECT count(*) FROM telemetry_events WHERE tenant_id = 'tenant-demo' AND event_id = ?",
                            Integer.class,
                            eventId);
                    org.assertj.core.api.Assertions.assertThat(count).isEqualTo(1);
                });
    }

    @Test
    void hourlyAnalyticsRequiresReadScopeAndMatchingTenant() throws Exception {
        Instant from = Instant.parse("2026-09-29T00:00:00Z");
        Instant to = Instant.parse("2026-09-30T00:00:00Z");
        org.mockito.Mockito.when(clickHouseAnalyticsService.hourlyTelemetry("tenant-demo", from, to))
                .thenReturn(List.of(new HourlyTelemetryPoint(1790640000000L, 120L, 14L, 28L, 72L)));

        mockMvc.perform(get("/v1/analytics/telemetry/hourly")
                        .param("tenant_id", "tenant-demo")
                        .param("from", from.toString())
                        .param("to", to.toString())
                        .with(fleetRead("tenant-demo")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].unique_events").value(120))
                .andExpect(jsonPath("$[0].vehicles_seen").value(14))
                .andExpect(jsonPath("$[0].idling_events").value(28));

        mockMvc.perform(get("/v1/analytics/telemetry/hourly")
                        .param("tenant_id", "another-tenant")
                        .param("from", from.toString())
                        .param("to", to.toString())
                        .with(fleetRead("tenant-demo")))
                .andExpect(status().isForbidden());
    }

    @Test
    void fleetApiRequiresBearerAuthenticationAndPreventsCrossTenantReads() throws Exception {
        mockMvc.perform(get("/v1/fleet/overview").param("tenant_id", "tenant-demo"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/v1/fleet/overview").param("tenant_id", "another-tenant")
                        .with(fleetRead("tenant-demo")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/v1/fleet/overview").param("tenant_id", "tenant-demo")
                        .with(jwt().jwt(token -> token.claim("tenant_id", "tenant-demo"))))
                .andExpect(status().isForbidden());

        String crossTenantEvent = event("cross-tenant-ingest", "vehicle-1", "2026-09-30T08:00:00Z", 0, 1)
                .replace("\"tenant_id\":\"tenant-demo\"", "\"tenant_id\":\"tenant-other\"");
        mockMvc.perform(post("/v1/telemetry").with(fleetIngest("tenant-demo"))
                        .contentType("application/json").content(crossTenantEvent))
                .andExpect(status().isForbidden());
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor fleetRead(String tenantId) {
        return jwt().jwt(token -> token.claim("tenant_id", tenantId))
                .authorities(new SimpleGrantedAuthority("SCOPE_fleet.read"));
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor fleetIngest(String tenantId) {
        return jwt().jwt(token -> token.claim("tenant_id", tenantId))
                .authorities(new SimpleGrantedAuthority("SCOPE_fleet.ingest"));
    }

    private String event(String eventId, String vehicleId, String observedAt, int speed, int sequence) {
        return """
                {"event_id":"%s","tenant_id":"tenant-demo","vehicle_id":"%s",
                 "observed_at":"%s","latitude":12.9716,"longitude":77.5946,
                 "speed_kmh":%d,"engine_on":true,"sequence":%d}
                """.formatted(eventId, vehicleId, observedAt, speed, sequence);
    }
}
