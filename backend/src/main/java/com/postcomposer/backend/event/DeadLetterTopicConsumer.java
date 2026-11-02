package com.postcomposer.backend.event;

import com.postcomposer.backend.entity.JobStatus;
import com.postcomposer.backend.entity.PostStatus;
import com.postcomposer.backend.repository.PostRepository;
import com.postcomposer.backend.repository.ScheduledJobRepository;
import com.postcomposer.backend.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles messages routed to the Dead Letter Topic (DLQ) after exponential backoff retries are exhausted.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DeadLetterTopicConsumer {

    private final PostRepository postRepository;
    private final ScheduledJobRepository scheduledJobRepository;
    private final AuditLogService auditLogService;

    @KafkaListener(
            topics = "${app.kafka.topics.dead-letter}",
            groupId = "${spring.kafka.consumer.group-id}-dlt"
    )
    @Transactional
    public void handleDeadLetterEvent(PostPublishingEvent failedEvent) {
        log.error("Received event in Dead Letter Topic (DLQ): eventId={} postId={}",
                failedEvent.getEventId(), failedEvent.getPostId());

        postRepository.findById(failedEvent.getPostId()).ifPresent(post -> {
            post.setStatus(PostStatus.FAILED);
            postRepository.save(post);
        });

        scheduledJobRepository.findByPostId(failedEvent.getPostId()).ifPresent(job -> {
            job.setJobStatus(JobStatus.FAILED);
            job.setLastError("Exhausted Kafka retries and routed to Dead Letter Topic");
            scheduledJobRepository.save(job);
        });

        auditLogService.log(
                failedEvent.getUserId(),
                "POST_PUBLISHING_DLQ",
                "Post",
                String.valueOf(failedEvent.getPostId()),
                "Event routed to Dead Letter Topic after retry exhaustion"
        );
    }
}
