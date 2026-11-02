package com.postcomposer.backend.service;

import com.postcomposer.backend.dto.post.MoveScheduleRequestDto;
import com.postcomposer.backend.dto.post.PostRequestDto;
import com.postcomposer.backend.dto.post.PostResponseDto;
import com.postcomposer.backend.entity.*;
import com.postcomposer.backend.event.PostEventProducer;
import com.postcomposer.backend.event.PostPublishingEvent;
import com.postcomposer.backend.exception.BadRequestException;
import com.postcomposer.backend.exception.ResourceNotFoundException;
import com.postcomposer.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Core Post, Draft, and Scheduling Service implementing the exact validation rules
 * and partial platform skip behavior of the Post Composer frontend.
 */
@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final MediaFileRepository mediaFileRepository;
    private final ScheduledJobRepository scheduledJobRepository;
    private final PostEventProducer postEventProducer;
    private final AuditLogService auditLogService;

    @Transactional
    @CacheEvict(value = "analyticsOverview", key = "#userId")
    public PostResponseDto saveDraft(Long userId, PostRequestDto request) {
        ValidationOutcome outcome = validatePlatformConstraints(request, false);
        User user = getUserOrThrow(userId);

        Post post = Post.builder()
                .user(user)
                .content(request.getPost())
                .instagramEnabled(outcome.finalInstagram)
                .linkedinEnabled(outcome.finalLinkedin)
                .hasImages(request.isHasImages() || (request.getMediaIds() != null && !request.getMediaIds().isEmpty()))
                .status(PostStatus.DRAFT)
                .scheduledDate(request.getDate())
                .scheduledTime(request.getTime())
                .build();

        attachPlatformEntries(post, outcome.finalInstagram, outcome.finalLinkedin, request);
        Post saved = postRepository.save(post);
        attachMediaIfPresent(userId, saved, request.getMediaIds());

        auditLogService.log(userId, "DRAFT_SAVED", "Post", String.valueOf(saved.getId()), "Draft created");
        return toResponseDto(saved, outcome.warnings);
    }

    @Transactional
    @CacheEvict(value = "analyticsOverview", key = "#userId")
    public PostResponseDto updateDraft(Long userId, Long draftId, PostRequestDto request) {
        ValidationOutcome outcome = validatePlatformConstraints(request, false);
        Post draft = postRepository.findByIdAndUserIdAndDeletedFalse(draftId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Draft not found with id: " + draftId));

        draft.setContent(request.getPost());
        draft.setInstagramEnabled(outcome.finalInstagram);
        draft.setLinkedinEnabled(outcome.finalLinkedin);
        draft.setHasImages(request.isHasImages() || (request.getMediaIds() != null && !request.getMediaIds().isEmpty()));
        draft.setScheduledDate(request.getDate());
        draft.setScheduledTime(request.getTime());
        draft.getPlatforms().clear();
        attachPlatformEntries(draft, outcome.finalInstagram, outcome.finalLinkedin, request);

        Post saved = postRepository.save(draft);
        auditLogService.log(userId, "DRAFT_UPDATED", "Post", String.valueOf(saved.getId()), "Draft updated");
        return toResponseDto(saved, outcome.warnings);
    }

    @Transactional(readOnly = true)
    public List<PostResponseDto> getDrafts(Long userId) {
        return postRepository.findByUserIdAndStatusAndDeletedFalseOrderByCreatedAtDesc(userId, PostStatus.DRAFT)
                .stream()
                .map(p -> toResponseDto(p, List.of()))
                .toList();
    }

    @Transactional
    @CacheEvict(value = "analyticsOverview", key = "#userId")
    public void deletePostOrDraft(Long userId, Long postId) {
        Post post = postRepository.findByIdAndUserIdAndDeletedFalse(postId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found with id: " + postId));
        post.setDeleted(true);
        post.setStatus(PostStatus.CANCELLED);
        postRepository.save(post);

        scheduledJobRepository.findByPostId(postId).ifPresent(job -> {
            job.setJobStatus(JobStatus.CANCELLED);
            scheduledJobRepository.save(job);
        });

        auditLogService.log(userId, "POST_DELETED", "Post", String.valueOf(postId), "Soft deleted post/draft");
    }

    @Transactional
    @CacheEvict(value = "analyticsOverview", key = "#userId")
    public PostResponseDto schedulePost(Long userId, PostRequestDto request) {
        ValidationOutcome outcome = validatePlatformConstraints(request, true);
        User user = getUserOrThrow(userId);
        Instant scheduledInstant = parseFutureSchedule(request.getDate(), request.getTime(), request.getTimezone());

        Post post = Post.builder()
                .user(user)
                .content(request.getPost())
                .instagramEnabled(outcome.finalInstagram)
                .linkedinEnabled(outcome.finalLinkedin)
                .hasImages(request.isHasImages() || (request.getMediaIds() != null && !request.getMediaIds().isEmpty()))
                .status(PostStatus.SCHEDULED)
                .scheduledDate(request.getDate())
                .scheduledTime(request.getTime())
                .scheduledAt(scheduledInstant)
                .build();

        attachPlatformEntries(post, outcome.finalInstagram, outcome.finalLinkedin, request);
        Post saved = postRepository.save(post);
        attachMediaIfPresent(userId, saved, request.getMediaIds());

        ScheduledJob job = ScheduledJob.builder()
                .post(saved)
                .user(user)
                .scheduledAt(scheduledInstant)
                .timezone(StringUtils.hasText(request.getTimezone()) ? request.getTimezone() : user.getTimezone())
                .jobStatus(JobStatus.PENDING)
                .idempotencyKey("sched_post_" + saved.getId() + "_" + scheduledInstant.toEpochMilli())
                .build();
        scheduledJobRepository.save(job);

        auditLogService.log(userId, "POST_SCHEDULED", "Post", String.valueOf(saved.getId()),
                "Scheduled for " + request.getDate() + "T" + request.getTime());
        return toResponseDto(saved, outcome.warnings);
    }

    @Transactional
    @CacheEvict(value = "analyticsOverview", key = "#userId")
    public PostResponseDto updateScheduledPost(Long userId, Long postId, PostRequestDto request) {
        ValidationOutcome outcome = validatePlatformConstraints(request, true);
        Post post = postRepository.findByIdAndUserIdAndDeletedFalse(postId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheduled post not found with id: " + postId));

        Instant scheduledInstant = parseFutureSchedule(request.getDate(), request.getTime(), request.getTimezone());

        post.setContent(request.getPost());
        post.setInstagramEnabled(outcome.finalInstagram);
        post.setLinkedinEnabled(outcome.finalLinkedin);
        post.setHasImages(request.isHasImages() || (request.getMediaIds() != null && !request.getMediaIds().isEmpty()));
        post.setScheduledDate(request.getDate());
        post.setScheduledTime(request.getTime());
        post.setScheduledAt(scheduledInstant);
        post.setStatus(PostStatus.SCHEDULED);
        post.getPlatforms().clear();
        attachPlatformEntries(post, outcome.finalInstagram, outcome.finalLinkedin, request);

        Post saved = postRepository.save(post);

        ScheduledJob job = scheduledJobRepository.findByPostId(saved.getId())
                .orElseGet(() -> ScheduledJob.builder()
                        .post(saved)
                        .user(saved.getUser())
                        .timezone(saved.getUser().getTimezone())
                        .build());
        job.setScheduledAt(scheduledInstant);
        job.setJobStatus(JobStatus.PENDING);
        job.setIdempotencyKey("sched_post_" + saved.getId() + "_" + scheduledInstant.toEpochMilli());
        scheduledJobRepository.save(job);

        auditLogService.log(userId, "SCHEDULED_POST_UPDATED", "Post", String.valueOf(saved.getId()),
                "Updated scheduled post for " + request.getDate() + "T" + request.getTime());
        return toResponseDto(saved, outcome.warnings);
    }

    @Transactional
    public PostResponseDto moveScheduledPost(Long userId, Long postId, MoveScheduleRequestDto request) {
        Post post = postRepository.findByIdAndUserIdAndDeletedFalse(postId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheduled post not found with id: " + postId));

        String timePart = StringUtils.hasText(request.getNewTime())
                ? request.getNewTime()
                : (StringUtils.hasText(post.getScheduledTime()) ? post.getScheduledTime() : "10:00");

        Instant newScheduledInstant = parseFutureSchedule(request.getNewDate(), timePart, post.getUser().getTimezone());

        post.setScheduledDate(request.getNewDate());
        post.setScheduledTime(timePart);
        post.setScheduledAt(newScheduledInstant);
        post.setStatus(PostStatus.SCHEDULED);
        Post saved = postRepository.save(post);

        ScheduledJob job = scheduledJobRepository.findByPostId(post.getId())
                .orElseGet(() -> ScheduledJob.builder()
                        .post(saved)
                        .user(post.getUser())
                        .timezone(post.getUser().getTimezone())
                        .build());

        job.setScheduledAt(newScheduledInstant);
        job.setJobStatus(JobStatus.PENDING);
        job.setIdempotencyKey("sched_post_" + saved.getId() + "_" + newScheduledInstant.toEpochMilli());
        scheduledJobRepository.save(job);

        auditLogService.log(userId, "POST_RESCHEDULED", "Post", String.valueOf(saved.getId()),
                "Moved to " + request.getNewDate() + "T" + timePart);
        return toResponseDto(saved, List.of());
    }

    @Transactional(readOnly = true)
    public List<PostResponseDto> getScheduledPosts(Long userId) {
        return postRepository.findByUserIdAndStatusAndDeletedFalseOrderByScheduledAtAsc(userId, PostStatus.SCHEDULED)
                .stream()
                .map(p -> toResponseDto(p, List.of()))
                .toList();
    }

    @Transactional
    @CacheEvict(value = "analyticsOverview", key = "#userId")
    public PostResponseDto publishNow(Long userId, PostRequestDto request) {
        ValidationOutcome outcome = validatePlatformConstraints(request, false);
        User user = getUserOrThrow(userId);

        Post post = Post.builder()
                .user(user)
                .content(request.getPost())
                .instagramEnabled(outcome.finalInstagram)
                .linkedinEnabled(outcome.finalLinkedin)
                .hasImages(request.isHasImages() || (request.getMediaIds() != null && !request.getMediaIds().isEmpty()))
                .status(PostStatus.PUBLISHING)
                .build();

        attachPlatformEntries(post, outcome.finalInstagram, outcome.finalLinkedin, request);
        Post saved = postRepository.save(post);
        List<String> mediaUrls = attachMediaIfPresent(userId, saved, request.getMediaIds());

        PostPublishingEvent event = PostPublishingEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .idempotencyKey("pub_now_post_" + saved.getId())
                .postId(saved.getId())
                .userId(userId)
                .content(saved.getContent())
                .instagram(saved.isInstagramEnabled())
                .linkedin(saved.isLinkedinEnabled())
                .mediaUrls(mediaUrls)
                .requestedAt(Instant.now())
                .build();

        postEventProducer.publishPostPublishingRequested(event);
        auditLogService.log(userId, "POST_PUBLISH_REQUESTED", "Post", String.valueOf(saved.getId()), "Immediate publish queued via Kafka");

        return toResponseDto(saved, outcome.warnings);
    }

    @Transactional(readOnly = true)
    public Page<PostResponseDto> getPosts(Long userId, PostStatus status, String search, Pageable pageable) {
        Page<Post> page;
        if (StringUtils.hasText(search)) {
            page = postRepository.searchUserPosts(userId, search.trim(), pageable);
        } else if (status != null) {
            page = postRepository.findByUserIdAndStatusAndDeletedFalse(userId, status, pageable);
        } else {
            page = postRepository.findByUserIdAndDeletedFalse(userId, pageable);
        }
        return page.map(p -> toResponseDto(p, List.of()));
    }

    @Transactional(readOnly = true)
    public PostResponseDto getPostById(Long userId, Long postId) {
        Post post = postRepository.findByIdAndUserIdAndDeletedFalse(postId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found with id: " + postId));
        return toResponseDto(post, List.of());
    }

    public ValidationOutcome validatePlatformConstraints(PostRequestDto request, boolean requireScheduleDateTime) {
        if (!request.isInstagram() && !request.isLinkedin()) {
            throw new BadRequestException("Please select at least one platform.");
        }
        if (!StringUtils.hasText(request.getPost())) {
            throw new BadRequestException("Post cannot be empty.");
        }

        boolean finalIg = request.isInstagram();
        boolean finalLi = request.isLinkedin();
        List<String> warnings = new ArrayList<>();
        String igText = StringUtils.hasText(request.getInstagramContent())
                ? request.getInstagramContent()
                : request.getPost();
        String liText = StringUtils.hasText(request.getLinkedinContent())
                ? request.getLinkedinContent()
                : request.getPost();
        int imageCount = request.getMediaIds() != null ? request.getMediaIds().size() : 0;

        if (request.isInstagram()) {
            if (igText.length() > 2200) {
                finalIg = false;
                warnings.add("Instagram skipped (over 2200 chars).");
            } else if (imageCount > 10) {
                finalIg = false;
                warnings.add("Instagram skipped (over 10 images).");
            }
        }

        if (request.isLinkedin()) {
            if (liText.length() > 3000) {
                finalLi = false;
                warnings.add("LinkedIn skipped (over 3000 chars).");
            }
        }

        if (requireScheduleDateTime && (!StringUtils.hasText(request.getDate()) || !StringUtils.hasText(request.getTime()))) {
            throw new BadRequestException("Please select both date and time for scheduling.");
        }

        if (StringUtils.hasText(request.getDate()) && StringUtils.hasText(request.getTime())) {
            parseFutureSchedule(request.getDate(), request.getTime(), request.getTimezone());
        }

        if (!finalIg && !finalLi) {
            throw new BadRequestException("Failed: " + String.join(" ", warnings));
        }

        return new ValidationOutcome(finalIg, finalLi, warnings);
    }

    private Instant parseFutureSchedule(String dateStr, String timeStr, String timezone) {
        try {
            LocalDate localDate = LocalDate.parse(dateStr);
            LocalTime localTime = LocalTime.parse(timeStr);
            ZoneId zoneId = StringUtils.hasText(timezone) ? ZoneId.of(timezone) : ZoneOffset.UTC;
            ZonedDateTime scheduledZdt = ZonedDateTime.of(localDate, localTime, zoneId);
            if (scheduledZdt.toInstant().isBefore(Instant.now())) {
                throw new BadRequestException("Schedule must be in the future.");
            }
            return scheduledZdt.toInstant();
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Invalid schedule date or time format.");
        }
    }

    private void attachPlatformEntries(Post post, boolean ig, boolean li, PostRequestDto request) {
        if (ig) {
            String igText = StringUtils.hasText(request.getInstagramContent())
                    ? request.getInstagramContent()
                    : post.getContent();
            post.getPlatforms().add(PostPlatform.builder()
                    .post(post)
                    .platform(PlatformType.INSTAGRAM)
                    .customContent(igText)
                    .characterCount(igText.length())
                    .platformStatus("PENDING")
                    .build());
        }
        if (li) {
            String liText = StringUtils.hasText(request.getLinkedinContent())
                    ? request.getLinkedinContent()
                    : post.getContent();
            post.getPlatforms().add(PostPlatform.builder()
                    .post(post)
                    .platform(PlatformType.LINKEDIN)
                    .customContent(liText)
                    .characterCount(liText.length())
                    .platformStatus("PENDING")
                    .build());
        }
    }

    private List<String> attachMediaIfPresent(Long userId, Post post, List<Long> mediaIds) {
        if (mediaIds == null || mediaIds.isEmpty()) {
            return List.of();
        }
        List<MediaFile> files = mediaFileRepository.findByIdInAndUserId(mediaIds, userId);
        for (MediaFile file : files) {
            file.setPost(post);
        }
        mediaFileRepository.saveAll(files);
        return files.stream().map(MediaFile::getPublicUrl).toList();
    }

    private User getUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    public PostResponseDto toResponseDto(Post post, List<String> warnings) {
        String scheduledAtStr = null;
        if (StringUtils.hasText(post.getScheduledDate()) && StringUtils.hasText(post.getScheduledTime())) {
            scheduledAtStr = post.getScheduledDate() + "T" + post.getScheduledTime();
        } else if (post.getScheduledAt() != null) {
            scheduledAtStr = post.getScheduledAt().toString();
        }

        String igCustom = null;
        String liCustom = null;
        if (post.getPlatforms() != null) {
            for (PostPlatform pp : post.getPlatforms()) {
                if (pp.getPlatform() == PlatformType.INSTAGRAM) {
                    igCustom = pp.getCustomContent();
                } else if (pp.getPlatform() == PlatformType.LINKEDIN) {
                    liCustom = pp.getCustomContent();
                }
            }
        }

        List<String> mediaUrls = post.getMediaFiles() != null
                ? post.getMediaFiles().stream().map(MediaFile::getPublicUrl).toList()
                : List.of();

        return PostResponseDto.builder()
                .id(post.getId())
                .timestamp(post.getCreatedAt().toString())
                .instagram(post.isInstagramEnabled())
                .linkedin(post.isLinkedinEnabled())
                .post(post.getContent())
                .instagramContent(igCustom != null ? igCustom : post.getContent())
                .linkedinContent(liCustom != null ? liCustom : post.getContent())
                .hasImages(post.isHasImages())
                .date(post.getScheduledDate() != null ? post.getScheduledDate() : "")
                .time(post.getScheduledTime() != null ? post.getScheduledTime() : "")
                .scheduledAt(scheduledAtStr)
                .publishedAt(post.getPublishedAt() != null ? post.getPublishedAt().toString() : null)
                .status(post.getStatus().name())
                .warnings(warnings)
                .mediaUrls(mediaUrls)
                .build();
    }

    public record ValidationOutcome(boolean finalInstagram, boolean finalLinkedin, List<String> warnings) {}
}
