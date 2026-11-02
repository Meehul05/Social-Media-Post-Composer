package com.postcomposer.backend.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.common.TopicPartition;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.ExponentialBackOff;

/**
 * Configures Kafka topics, exponential backoff retry policy, and Dead Letter Topic (DLQ) routing.
 */
@Configuration
public class KafkaConfig {

    @Value("${app.kafka.topics.publishing-requests}")
    private String publishingRequestsTopic;

    @Value("${app.kafka.topics.publishing-results}")
    private String publishingResultsTopic;

    @Value("${app.kafka.topics.dead-letter}")
    private String deadLetterTopic;

    @Bean
    public NewTopic publishingRequestsTopic() {
        return TopicBuilder.name(publishingRequestsTopic)
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic publishingResultsTopic() {
        return TopicBuilder.name(publishingResultsTopic)
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic publishingDeadLetterTopic() {
        return TopicBuilder.name(deadLetterTopic)
                .partitions(1)
                .replicas(1)
                .build();
    }

    @Bean
    public CommonErrorHandler kafkaErrorHandler(KafkaTemplate<String, Object> kafkaTemplate) {
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
                kafkaTemplate,
                (record, ex) -> new TopicPartition(deadLetterTopic, 0)
        );
        ExponentialBackOff backOff = new ExponentialBackOff(1000L, 2.0);
        backOff.setMaxInterval(8000L);
        backOff.setMaxElapsedTime(15000L);
        return new DefaultErrorHandler(recoverer, backOff);
    }
}
