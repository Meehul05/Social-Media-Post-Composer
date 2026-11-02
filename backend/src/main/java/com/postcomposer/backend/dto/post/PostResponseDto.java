package com.postcomposer.backend.dto.post;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Matches the exact object structure expected by the PostComposer frontend:
 * { id, timestamp, instagram, linkedin, post, instagramContent, linkedinContent, hasImages, date, time, scheduledAt, publishedAt, status, warnings, mediaUrls }
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostResponseDto {
    private Long id;
    private String timestamp;
    private boolean instagram;
    private boolean linkedin;
    private String post;
    private String instagramContent;
    private String linkedinContent;
    private boolean hasImages;
    private String date;
    private String time;
    private String scheduledAt;
    private String publishedAt;
    private String status;
    private List<String> warnings;
    private List<String> mediaUrls;
}
