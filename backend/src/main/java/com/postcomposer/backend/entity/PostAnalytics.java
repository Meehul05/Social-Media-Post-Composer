package com.postcomposer.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "post_analytics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostAnalytics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private PlatformType platform;

    @Column(nullable = false)
    private int impressions;

    @Column(nullable = false)
    private int likes;

    @Column(nullable = false)
    private int comments;

    @Column(nullable = false)
    private int shares;

    @Column(name = "engagement_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal engagementRate;

    @Column(name = "simulated_metric", nullable = false)
    @Builder.Default
    private boolean simulatedMetric = true;

    @Column(name = "recorded_date", nullable = false)
    private LocalDate recordedDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
