package com.postcomposer.backend.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostPublishingEvent {
    private String eventId;
    private String idempotencyKey;
    private Long postId;
    private Long userId;
    private String content;
    private boolean instagram;
    private boolean linkedin;
    private List<String> mediaUrls;
    private Instant requestedAt;
}
