package com.postcomposer.backend.event;

import com.postcomposer.backend.entity.JobStatus;
import com.postcomposer.backend.entity.MediaFile;
import com.postcomposer.backend.entity.Post;
import com.postcomposer.backend.entity.PostStatus;
import com.postcomposer.backend.entity.ScheduledJob;
import com.postcomposer.backend.repository.PostRepository;
import com.postcomposer.backend.repository.ScheduledJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Persistent MySQL-backed scheduler that polls due jobs and dispatches them to Kafka.
 * Survives application restarts because all schedule state is stored in `scheduled_jobs` in MySQL.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PersistentJobPoller {

    private final ScheduledJobRepository scheduledJobRepository;
    private final PostRepository postRepository;
    private final PostEventProducer postEventProducer;

    @Scheduled(fixedDelayString = "${app.scheduler.poll-interval-ms:15000}")
    @Transactional
    public void pollAndDispatchDueJobs() {
        List<ScheduledJob> dueJobs = scheduledJobRepository.findDueJobs(JobStatus.PENDING, Instant.now());
        for (ScheduledJob job : dueJobs) {
            Post post = job.getPost();
            if (post.isDeleted() || post.getStatus() == PostStatus.CANCELLED) {
                job.setJobStatus(JobStatus.CANCELLED);
                scheduledJobRepository.save(job);
                continue;
            }

            job.setJobStatus(JobStatus.DISPATCHED);
            job.setLockedAt(Instant.now());
            job.setAttemptCount(job.getAttemptCount() + 1);
            scheduledJobRepository.save(job);

            post.setStatus(PostStatus.PUBLISHING);
            postRepository.save(post);

            List<String> mediaUrls = post.getMediaFiles().stream()
                    .map(MediaFile::getPublicUrl)
                    .toList();

            PostPublishingEvent event = PostPublishingEvent.builder()
                    .eventId(UUID.randomUUID().toString())
                    .idempotencyKey(job.getIdempotencyKey())
                    .postId(post.getId())
                    .userId(job.getUser().getId())
                    .content(post.getContent())
                    .instagram(post.isInstagramEnabled())
                    .linkedin(post.isLinkedinEnabled())
                    .mediaUrls(mediaUrls)
                    .requestedAt(Instant.now())
                    .build();

            postEventProducer.publishPostPublishingRequested(event);
        }
    }
}
