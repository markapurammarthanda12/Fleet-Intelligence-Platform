package com.fleetintelligence.telemetry;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;

@Component
public class TelemetryEventConsumer {
    private static final Logger LOGGER = LoggerFactory.getLogger(TelemetryEventConsumer.class);

    private final ObjectMapper objectMapper;
    private final TelemetryService telemetryService;
    public TelemetryEventConsumer(
            ObjectMapper objectMapper,
            TelemetryService telemetryService) {
        this.objectMapper = objectMapper;
        this.telemetryService = telemetryService;
    }

    @RetryableTopic(
            attempts = "${KAFKA_RETRY_ATTEMPTS:5}",
            backoff = @Backoff(delay = 1_000, multiplier = 2.0, maxDelay = 10_000),
            dltTopicSuffix = ".dlt")
    @KafkaListener(topics = "${fleet.telemetry.topic}", groupId = "${fleet.kafka.consumer-group}")
    public void consume(String payload) throws JsonProcessingException {
        TelemetryRequest event = objectMapper.readValue(payload, TelemetryRequest.class);
        telemetryService.ingest(event);
    }

    @DltHandler
    public void onDeadLetter(String payload, @Header(KafkaHeaders.RECEIVED_TOPIC) String sourceTopic) {
        LOGGER.error(
                "Telemetry record moved to dead-letter topic after retries: source_topic={}, payload_bytes={}",
                sourceTopic,
                payload.length());
    }
}
