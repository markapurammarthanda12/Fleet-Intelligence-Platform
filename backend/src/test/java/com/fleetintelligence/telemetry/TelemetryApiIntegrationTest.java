package com.fleetintelligence.telemetry;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class TelemetryApiIntegrationTest {
    @Container
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("fleetintel_test")
            .withUsername("fleetintel")
            .withPassword("test-only-password");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @BeforeEach
    void clearDatabase() {
        jdbcTemplate.update("DELETE FROM fleet_alerts");
        jdbcTemplate.update("DELETE FROM vehicle_runtime_state");
        jdbcTemplate.update("DELETE FROM telemetry_events");
    }

    @Test
    void duplicateDeliveryIsAcknowledgedWithoutDuplicatingTheEvent() throws Exception {
        String event = event("retry-event", "retry-vehicle", "2026-09-30T08:00:00Z", 0, 1);

        mockMvc.perform(post("/v1/telemetry").contentType("application/json").content(event))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.duplicate").value(false));
        mockMvc.perform(post("/v1/telemetry").contentType("application/json").content(event))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.duplicate").value(true));

        Integer storedEvents = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM telemetry_events WHERE tenant_id = 'tenant-demo' AND event_id = 'retry-event'",
                Integer.class);
        org.assertj.core.api.Assertions.assertThat(storedEvents).isEqualTo(1);
    }

    @Test
    void stationaryEventsOpenExplainableAlertAndMovementResolvesIt() throws Exception {
        send("idle-start", "idle-vehicle", "2026-09-30T08:00:00Z", 0, 1, 201);
        send("idle-after-threshold", "idle-vehicle", "2026-09-30T08:06:00Z", 0, 2, 201);

        mockMvc.perform(get("/v1/alerts").param("tenant_id", "tenant-demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].vehicle_id").value("idle-vehicle"))
                .andExpect(jsonPath("$[0].status").value("open"))
                .andExpect(jsonPath("$[0].idle_seconds").value(360))
                .andExpect(jsonPath("$[0].estimated_fuel_litres").value(0.15))
                .andExpect(jsonPath("$[0].resolved_at").value(org.hamcrest.Matchers.nullValue()));

        send("vehicle-moved", "idle-vehicle", "2026-09-30T08:07:00Z", 25, 3, 201);

        mockMvc.perform(get("/v1/alerts").param("tenant_id", "tenant-demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("resolved"))
                .andExpect(jsonPath("$[0].resolved_at").isNotEmpty());
    }

    @Test
    void lateEventIsStoredButDoesNotRewindOpenAlertState() throws Exception {
        send("late-start", "late-vehicle", "2026-09-30T08:00:00Z", 0, 1, 201);
        send("late-threshold", "late-vehicle", "2026-09-30T08:06:00Z", 0, 2, 201);
        send("late-arrival", "late-vehicle", "2026-09-30T08:02:00Z", 20, 3, 201);

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

    private void send(String eventId, String vehicleId, String observedAt, int speed, int sequence, int status)
            throws Exception {
        mockMvc.perform(post("/v1/telemetry")
                        .contentType("application/json")
                        .content(event(eventId, vehicleId, observedAt, speed, sequence)))
                .andExpect(status().is(status));
    }

    private String event(String eventId, String vehicleId, String observedAt, int speed, int sequence) {
        return """
                {"event_id":"%s","tenant_id":"tenant-demo","vehicle_id":"%s",
                 "observed_at":"%s","latitude":12.9716,"longitude":77.5946,
                 "speed_kmh":%d,"engine_on":true,"sequence":%d}
                """.formatted(eventId, vehicleId, observedAt, speed, sequence);
    }
}
