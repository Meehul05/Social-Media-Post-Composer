package com.postcomposer.backend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopPostDto {
    private Long postId;
    private String snippet;
    private String platform;
    private int impressions;
    private double engagementRate;
    private String publishedAt;
}
