package com.postcomposer.backend.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PostEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${app.kafka.topics.publishing-requests}")
    private String publishingRequestsTopic;

    public void publishPostPublishingRequested(PostPublishingEvent event) {
        log.info("Publishing PostPublishingRequested eventId={} postId={} key={}",
                event.getEventId(), event.getPostId(), event.getIdempotencyKey());
        kafkaTemplate.send(publishingRequestsTopic, String.valueOf(event.getPostId()), event);
    }
}
