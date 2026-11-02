package com.postcomposer.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "publishing_attempts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublishingAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private PlatformType platform;

    @Column(name = "event_id", nullable = false, length = 128)
    private String eventId;

    @Column(name = "attempt_number", nullable = false)
    private int attemptNumber;

    @Column(nullable = false)
    private boolean success;

    @Column(name = "external_post_id", length = 191)
    private String externalPostId;

    @Column(name = "error_message", length = 512)
    private String errorMessage;

    @Column(name = "attempted_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant attemptedAt = Instant.now();
}
