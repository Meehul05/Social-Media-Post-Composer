package com.postcomposer.backend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformPerformanceDto {
    private String platform;
    private long publishedCount;
    private long totalImpressions;
    private long totalEngagements;
    private double averageEngagementRate;
    private boolean simulated;
}
