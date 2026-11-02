package com.postcomposer.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(
        name = "post_platforms",
        uniqueConstraints = @UniqueConstraint(name = "uq_post_platform", columnNames = {"post_id", "platform"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostPlatform {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private PlatformType platform;

    @Column(name = "custom_content", columnDefinition = "TEXT")
    private String customContent;

    @Column(name = "character_count", nullable = false)
    private int characterCount;

    @Column(name = "platform_status", nullable = false, length = 32)
    @Builder.Default
    private String platformStatus = "PENDING";

    @Column(name = "external_post_id", length = 191)
    private String externalPostId;

    @Column(name = "error_message", length = 512)
    private String errorMessage;

    @Column(name = "published_at")
    private Instant publishedAt;
}
