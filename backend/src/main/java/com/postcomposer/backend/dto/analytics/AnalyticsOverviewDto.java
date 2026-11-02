package com.postcomposer.backend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Matches Analytics.jsx cards and chart:
 * Total Posts, Engagement Rate, Best Platform, Optimal Time, and 7-bar Engagement Overview.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsOverviewDto {
    private long totalPosts;
    private long publishedPosts;
    private long scheduledPosts;
    private long draftPosts;
    private long failedPosts;
    private String engagementRate;
    private String bestPlatform;
    private String optimalTime;
    private List<Integer> chartBars;
    private boolean simulatedMetrics;
    private String timeframe;
}
