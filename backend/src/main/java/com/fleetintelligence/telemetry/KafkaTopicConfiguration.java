package com.fleetintelligence.telemetry;

import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.common.config.TopicConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfiguration {
    @Bean
    NewTopic telemetryTopic(
            @Value("${fleet.telemetry.topic}") String topic,
            @Value("${fleet.kafka.topic-partitions:12}") int partitions,
            @Value("${fleet.kafka.topic-replication-factor:1}") int replicationFactor,
            @Value("${fleet.kafka.topic-min-isr:1}") int minimumInSyncReplicas) {
        return TopicBuilder.name(topic)
                .partitions(partitions)
                .replicas(replicationFactor)
                .config(TopicConfig.RETENTION_MS_CONFIG, "604800000")
                .config(TopicConfig.MIN_IN_SYNC_REPLICAS_CONFIG, Integer.toString(minimumInSyncReplicas))
                .build();
    }
}
