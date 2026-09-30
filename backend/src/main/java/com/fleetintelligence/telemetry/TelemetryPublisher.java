package com.fleetintelligence.telemetry;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TelemetryPublisher {
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final String topic;
    private final long acknowledgementTimeoutMillis;

    public TelemetryPublisher(
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper,
            @Value("${fleet.telemetry.topic}") String topic,
            @Value("${fleet.kafka.producer-ack-timeout-ms:2000}") long acknowledgementTimeoutMillis) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.topic = topic;
        this.acknowledgementTimeoutMillis = acknowledgementTimeoutMillis;
    }

    public void publish(TelemetryRequest event) {
        String payload;
        try {
            payload = objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Validated telemetry could not be serialized", exception);
        }

        String partitionKey = event.tenantId() + ":" + event.vehicleId();
        try {
            kafkaTemplate.send(topic, partitionKey, payload)
                    .get(acknowledgementTimeoutMillis, TimeUnit.MILLISECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw brokerUnavailable();
        } catch (ExecutionException | TimeoutException exception) {
            throw brokerUnavailable();
        }
    }

    private ResponseStatusException brokerUnavailable() {
        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "The telemetry broker did not acknowledge the event; retry with the same event_id");
    }
}
