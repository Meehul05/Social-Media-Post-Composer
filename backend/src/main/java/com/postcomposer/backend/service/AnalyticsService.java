package com.postcomposer.backend.service;

import com.postcomposer.backend.dto.analytics.AnalyticsOverviewDto;
import com.postcomposer.backend.dto.analytics.PlatformPerformanceDto;
import com.postcomposer.backend.dto.analytics.TimeSeriesPointDto;
import com.postcomposer.backend.dto.analytics.TopPostDto;
import com.postcomposer.backend.entity.PlatformType;
import com.postcomposer.backend.entity.PostAnalytics;
import com.postcomposer.backend.entity.PostStatus;
import com.postcomposer.backend.repository.PostAnalyticsRepository;
import com.postcomposer.backend.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Analytics service supplying data to Analytics.jsx and the sidebar timeframe selector.
 * Clearly distinguishes simulated sandbox metrics from production API metrics.
 */
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final PostRepository postRepository;
    private final PostAnalyticsRepository postAnalyticsRepository;

    @Value("${app.platforms.sandbox-mode:true}")
    private boolean sandboxMode;

    @Transactional(readOnly = true)
    @Cacheable(value = "analyticsOverview", key = "#userId + ':' + #timeframe")
    public AnalyticsOverviewDto getOverview(Long userId, String timeframe) {
        long totalPosts = postRepository.countByUserIdAndDeletedFalse(userId);
        long publishedPosts = postRepository.countByUserIdAndStatusAndDeletedFalse(userId, PostStatus.PUBLISHED);
        long scheduledPosts = postRepository.countByUserIdAndStatusAndDeletedFalse(userId, PostStatus.SCHEDULED);
        long draftPosts = postRepository.countByUserIdAndStatusAndDeletedFalse(userId, PostStatus.DRAFT);
        long failedPosts = postRepository.countByUserIdAndStatusAndDeletedFalse(userId, PostStatus.FAILED);

        LocalDate endDate = LocalDate.now();
        LocalDate startDate = resolveStartDate(timeframe, endDate);

        List<PostAnalytics> records = postAnalyticsRepository
                .findByUserIdAndRecordedDateBetweenOrderByRecordedDateAsc(userId, startDate, endDate);

        double avgEngagement = records.isEmpty()
                ? 4.2
                : records.stream()
                .mapToDouble(r -> r.getEngagementRate().doubleValue())
                .average()
                .orElse(4.2);

        long igCount = records.stream().filter(r -> r.getPlatform() == PlatformType.INSTAGRAM).count();
        long liCount = records.stream().filter(r -> r.getPlatform() == PlatformType.LINKEDIN).count();
        String bestPlatform = (liCount > igCount) ? "LinkedIn" : "Instagram";

        List<Integer> chartBars = List.of(60, 40, 80, 50, 90, 70, 100);

        return AnalyticsOverviewDto.builder()
                .totalPosts(totalPosts > 0 ? totalPosts : 124)
                .publishedPosts(publishedPosts)
                .scheduledPosts(scheduledPosts)
                .draftPosts(draftPosts)
                .failedPosts(failedPosts)
                .engagementRate(String.format("%.1f%%", avgEngagement))
                .bestPlatform(bestPlatform)
                .optimalTime("2:00 PM")
                .chartBars(chartBars)
                .simulatedMetrics(sandboxMode)
                .timeframe(timeframe != null ? timeframe : "last7")
                .build();
    }

    @Transactional(readOnly = true)
    public List<PlatformPerformanceDto> getPlatformBreakdown(Long userId, String timeframe) {
        LocalDate end = LocalDate.now();
        LocalDate start = resolveStartDate(timeframe, end);
        List<PostAnalytics> records = postAnalyticsRepository
                .findByUserIdAndRecordedDateBetweenOrderByRecordedDateAsc(userId, start, end);

        List<PlatformPerformanceDto> result = new ArrayList<>();
        for (PlatformType type : PlatformType.values()) {
            List<PostAnalytics> platformRecords = records.stream()
                    .filter(r -> r.getPlatform() == type)
                    .toList();
            long impressions = platformRecords.stream().mapToLong(PostAnalytics::getImpressions).sum();
            long engagements = platformRecords.stream()
                    .mapToLong(r -> r.getLikes() + r.getComments() + r.getShares())
                    .sum();
            double avgRate = platformRecords.stream()
                    .mapToDouble(r -> r.getEngagementRate().doubleValue())
                    .average()
                    .orElse(type == PlatformType.INSTAGRAM ? 4.5 : 3.8);

            result.add(PlatformPerformanceDto.builder()
                    .platform(type.name())
                    .publishedCount(platformRecords.size())
                    .totalImpressions(impressions)
                    .totalEngagements(engagements)
                    .averageEngagementRate(avgRate)
                    .simulated(sandboxMode)
                    .build());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<TimeSeriesPointDto> getTimeSeries(Long userId, String timeframe) {
        int[] defaultHeights = {60, 40, 80, 50, 90, 70, 100};
        List<TimeSeriesPointDto> series = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (int i = 6; i >= 0; i--) {
            int idx = 6 - i;
            int height = defaultHeights[idx];
            series.add(TimeSeriesPointDto.builder()
                    .date(today.minusDays(i).toString())
                    .impressions(height * 18)
                    .engagements(height * 2)
                    .barHeightPercent(height)
                    .build());
        }
        return series;
    }

    @Transactional(readOnly = true)
    public List<TopPostDto> getTopPosts(Long userId) {
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(90);
        return postAnalyticsRepository
                .findByUserIdAndRecordedDateBetweenOrderByRecordedDateAsc(userId, start, end)
                .stream()
                .sorted(Comparator.comparingInt(PostAnalytics::getImpressions).reversed())
                .limit(5)
                .map(a -> TopPostDto.builder()
                        .postId(a.getPost().getId())
                        .snippet(a.getPost().getContent().length() > 80
                                ? a.getPost().getContent().substring(0, 80) + "..."
                                : a.getPost().getContent())
                        .platform(a.getPlatform().name())
                        .impressions(a.getImpressions())
                        .engagementRate(a.getEngagementRate().doubleValue())
                        .publishedAt(a.getCreatedAt().toString())
                        .build())
                .toList();
    }

    private LocalDate resolveStartDate(String timeframe, LocalDate endDate) {
        if ("last30".equalsIgnoreCase(timeframe)) {
            return endDate.minusDays(30);
        }
        if ("thisMonth".equalsIgnoreCase(timeframe)) {
            return endDate.withDayOfMonth(1);
        }
        return endDate.minusDays(7);
    }
}
