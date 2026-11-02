package com.postcomposer.backend.controller;

import com.postcomposer.backend.dto.analytics.AnalyticsOverviewDto;
import com.postcomposer.backend.dto.analytics.PlatformPerformanceDto;
import com.postcomposer.backend.dto.analytics.TimeSeriesPointDto;
import com.postcomposer.backend.dto.analytics.TopPostDto;
import com.postcomposer.backend.security.UserPrincipal;
import com.postcomposer.backend.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "Dashboard metrics, platform breakdown, time-series, and top posts")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/overview")
    @Operation(summary = "Retrieve summary metrics and chart bars for Analytics.jsx")
    public ResponseEntity<AnalyticsOverviewDto> getOverview(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "last7") String timeframe
    ) {
        return ResponseEntity.ok(analyticsService.getOverview(principal.getId(), timeframe));
    }

    @GetMapping("/platforms")
    @Operation(summary = "Retrieve platform-wise performance metrics")
    public ResponseEntity<List<PlatformPerformanceDto>> getPlatforms(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "last7") String timeframe
    ) {
        return ResponseEntity.ok(analyticsService.getPlatformBreakdown(principal.getId(), timeframe));
    }

    @GetMapping("/time-series")
    @Operation(summary = "Retrieve daily engagement time-series data")
    public ResponseEntity<List<TimeSeriesPointDto>> getTimeSeries(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "last7") String timeframe
    ) {
        return ResponseEntity.ok(analyticsService.getTimeSeries(principal.getId(), timeframe));
    }

    @GetMapping("/top-posts")
    @Operation(summary = "Retrieve top performing posts")
    public ResponseEntity<List<TopPostDto>> getTopPosts(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(analyticsService.getTopPosts(principal.getId()));
    }
}
