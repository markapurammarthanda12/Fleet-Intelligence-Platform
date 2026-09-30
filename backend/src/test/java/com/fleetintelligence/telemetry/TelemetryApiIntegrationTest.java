package com.fleetintelligence.telemetry;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
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
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.kafka.KafkaContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
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

        mockMvc.perform(get("/v1/alerts").param("tenant_id", "tenant-demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].vehicle_id").value("idle-vehicle"))
                .andExpect(jsonPath("$[0].status").value("open"))
                .andExpect(jsonPath("$[0].severity").value("warning"))
                .andExpect(jsonPath("$[0].idle_seconds").value(360))
                .andExpect(jsonPath("$[0].estimated_fuel_litres").value(0.15))
                .andExpect(jsonPath("$[0].resolved_at").value(org.hamcrest.Matchers.nullValue()));

        send("vehicle-moved", "idle-vehicle", "2026-09-30T08:07:00Z", 25, 3);

        mockMvc.perform(get("/v1/alerts").param("tenant_id", "tenant-demo"))
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

        mockMvc.perform(get("/v1/alerts").param("tenant_id", "tenant-demo"))
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

        mockMvc.perform(get("/v1/alerts").param("tenant_id", "tenant-demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("open"))
                .andExpect(jsonPath("$[0].last_observed_at").value("2026-09-30T08:06:00Z"));

        Integer storedEvents = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM telemetry_events WHERE tenant_id = 'tenant-demo' AND vehicle_id = 'late-vehicle'",
                Integer.class);
        org.assertj.core.api.Assertions.assertThat(storedEvents).isEqualTo(3);
    }

    @Test
    void rejectsInvalidCoordinatesWithoutPersistingTheEvent() throws Exception {
        String invalidEvent = event("bad-coordinates", "invalid-vehicle", "2026-09-30T08:00:00Z", 0, 1)
                .replace("\"latitude\":12.9716", "\"latitude\":95.0");

        mockMvc.perform(post("/v1/telemetry").contentType("application/json").content(invalidEvent))
                .andExpect(status().isBadRequest());

        Integer storedEvents = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM telemetry_events WHERE event_id = 'bad-coordinates'", Integer.class);
        org.assertj.core.api.Assertions.assertThat(storedEvents).isZero();
    }

    private void send(String eventId, String vehicleId, String observedAt, int speed, int sequence)
            throws Exception {
        mockMvc.perform(post("/v1/telemetry")
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

    private String event(String eventId, String vehicleId, String observedAt, int speed, int sequence) {
        return """
                {"event_id":"%s","tenant_id":"tenant-demo","vehicle_id":"%s",
                 "observed_at":"%s","latitude":12.9716,"longitude":77.5946,
                 "speed_kmh":%d,"engine_on":true,"sequence":%d}
                """.formatted(eventId, vehicleId, observedAt, speed, sequence);
    }
}
