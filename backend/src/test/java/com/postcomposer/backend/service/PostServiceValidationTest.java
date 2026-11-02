package com.postcomposer.backend.service;

import com.postcomposer.backend.dto.post.PostRequestDto;
import com.postcomposer.backend.event.PostEventProducer;
import com.postcomposer.backend.exception.BadRequestException;
import com.postcomposer.backend.repository.MediaFileRepository;
import com.postcomposer.backend.repository.PostRepository;
import com.postcomposer.backend.repository.ScheduledJobRepository;
import com.postcomposer.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
class PostServiceValidationTest {

    @Mock private PostRepository postRepository;
    @Mock private UserRepository userRepository;
    @Mock private MediaFileRepository mediaFileRepository;
    @Mock private ScheduledJobRepository scheduledJobRepository;
    @Mock private PostEventProducer postEventProducer;
    @Mock private AuditLogService auditLogService;

    private PostService postService;

    @BeforeEach
    void setUp() {
        postService = new PostService(
                postRepository,
                userRepository,
                mediaFileRepository,
                scheduledJobRepository,
                postEventProducer,
                auditLogService
        );
    }

    @Test
    void rejectsWhenNoPlatformSelected() {
        PostRequestDto dto = PostRequestDto.builder()
                .post("Hello world")
                .instagram(false)
                .linkedin(false)
                .build();

        assertThatThrownBy(() -> postService.validatePlatformConstraints(dto, false))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Please select at least one platform");
    }

    @Test
    void skipsInstagramWithWarningWhenOver2200CharsButKeepsLinkedIn() {
        String content2500 = "A".repeat(2500);
        PostRequestDto dto = PostRequestDto.builder()
                .post(content2500)
                .instagram(true)
                .linkedin(true)
                .build();

        PostService.ValidationOutcome outcome = postService.validatePlatformConstraints(dto, false);
        assertThat(outcome.finalInstagram()).isFalse();
        assertThat(outcome.finalLinkedin()).isTrue();
        assertThat(outcome.warnings()).contains("Instagram skipped (over 2200 chars).");
    }

    @Test
    void rejectsScheduleInThePast() {
        PostRequestDto dto = PostRequestDto.builder()
                .post("Scheduled post")
                .instagram(true)
                .date("2020-01-01")
                .time("10:00")
                .build();

        assertThatThrownBy(() -> postService.validatePlatformConstraints(dto, true))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Schedule must be in the future");
    }
}
