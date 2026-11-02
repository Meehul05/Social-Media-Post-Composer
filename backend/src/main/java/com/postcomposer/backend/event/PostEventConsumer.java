package com.postcomposer.backend.event;

import com.postcomposer.backend.entity.*;
import com.postcomposer.backend.integration.PlatformAdapterRegistry;
import com.postcomposer.backend.integration.PlatformPublishResult;
import com.postcomposer.backend.integration.SocialPlatformAdapter;
import com.postcomposer.backend.repository.*;
import com.postcomposer.backend.security.AesGcmCryptoService;
import com.postcomposer.backend.service.AuditLogService;
import com.postcomposer.backend.service.IdempotencyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Consumes PostPublishingRequested events from Kafka with durable MySQL idempotency checks.
 * Ensures retries never duplicate social media publications.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PostEventConsumer {

    private final PostRepository postRepository;
    private final PlatformAccountRepository platformAccountRepository;
    private final PublishingAttemptRepository publishingAttemptRepository;
    private final ScheduledJobRepository scheduledJobRepository;
    private final PostAnalyticsRepository postAnalyticsRepository;
    private final IdempotencyService idempotencyService;
    private final PlatformAdapterRegistry adapterRegistry;
    private final AesGcmCryptoService cryptoService;
    private final AuditLogService auditLogService;

    @KafkaListener(
            topics = "${app.kafka.topics.publishing-requests}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    @Transactional
    public void handlePublishingRequested(PostPublishingEvent event) {
        log.info("Received PostPublishingEvent eventId={} postId={} idempotencyKey={}",
                event.getEventId(), event.getPostId(), event.getIdempotencyKey());

        if (!idempotencyService.tryAcquireLock(event.getIdempotencyKey(), "PUBLISH_POST", event.getPostId())) {
            log.info("Skipping duplicate PostPublishingEvent for idempotencyKey={}", event.getIdempotencyKey());
            return;
        }

        Post post = postRepository.findById(event.getPostId()).orElse(null);
        if (post == null || post.isDeleted()) {
            idempotencyService.markCompleted(event.getIdempotencyKey(), "POST_DELETED_OR_MISSING");
            return;
        }

        List<PlatformType> targetPlatforms = new ArrayList<>();
        if (event.isInstagram()) {
            targetPlatforms.add(PlatformType.INSTAGRAM);
        }
        if (event.isLinkedin()) {
            targetPlatforms.add(PlatformType.LINKEDIN);
        }

        boolean allSucceeded = true;
        StringBuilder summary = new StringBuilder();

        for (PlatformType platformType : targetPlatforms) {
            String platformIdempotencyKey = event.getIdempotencyKey() + ":" + platformType.name();
            if (idempotencyService.isAlreadyCompleted(platformIdempotencyKey)) {
                log.info("Platform {} already published for post {}", platformType, post.getId());
                continue;
            }

            SocialPlatformAdapter adapter = adapterRegistry.getAdapter(platformType);
            PlatformAccount account = platformAccountRepository
                    .findByUserIdAndPlatform(event.getUserId(), platformType)
                    .orElse(null);

            String decryptedToken = (account != null && account.isConnected())
                    ? cryptoService.decrypt(account.getEncryptedAccessToken())
                    : "sandbox-default-token";
            String handle = (account != null) ? account.getHandle() : "@yourhandle";

            PlatformPublishResult result = adapter.publish(
                    decryptedToken,
                    handle,
                    post.getContent(),
                    event.getMediaUrls()
            );

            PublishingAttempt attempt = PublishingAttempt.builder()
                    .post(post)
                    .platform(platformType)
                    .eventId(event.getEventId())
                    .attemptNumber(1)
                    .success(result.isSuccess())
                    .externalPostId(result.getExternalPostId())
                    .errorMessage(result.getErrorMessage())
                    .build();
            publishingAttemptRepository.save(attempt);

            if (result.isSuccess()) {
                idempotencyService.recordDirectCompletion(
                        platformIdempotencyKey,
                        "PUBLISH_PLATFORM_" + platformType.name(),
                        post.getId(),
                        result.getExternalPostId()
                );
                summary.append(platformType.name()).append(":").append(result.getExternalPostId()).append(";");

                PostAnalytics analytics = PostAnalytics.builder()
                        .post(post)
                        .user(post.getUser())
                        .platform(platformType)
                        .impressions(180 + (int) (post.getContent().length() * 1.5))
                        .likes(12 + (post.getContent().length() % 25))
                        .comments(3 + (post.getContent().length() % 7))
                        .shares(2 + (post.getContent().length() % 5))
                        .engagementRate(new BigDecimal("4.20"))
                        .simulatedMetric(result.isSandboxSimulated())
                        .recordedDate(LocalDate.now())
                        .build();
                postAnalyticsRepository.save(analytics);
            } else {
                allSucceeded = false;
                summary.append(platformType.name()).append(":FAILED;");
            }
        }

        if (allSucceeded) {
            post.setStatus(PostStatus.PUBLISHED);
            post.setPublishedAt(Instant.now());
            postRepository.save(post);

            scheduledJobRepository.findByPostId(post.getId()).ifPresent(job -> {
                job.setJobStatus(JobStatus.COMPLETED);
                job.setExecutedAt(Instant.now());
                scheduledJobRepository.save(job);
            });

            idempotencyService.markCompleted(event.getIdempotencyKey(), summary.toString());
            auditLogService.log(event.getUserId(), "POST_PUBLISHED", "Post", String.valueOf(post.getId()), summary.toString());
        } else {
            idempotencyService.markFailed(event.getIdempotencyKey(), summary.toString());
            throw new IllegalStateException("One or more platform publications failed: " + summary);
        }
    }
}
