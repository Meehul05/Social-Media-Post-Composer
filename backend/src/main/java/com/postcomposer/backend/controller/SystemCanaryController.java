package com.postcomposer.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Exposes deployment track (stable vs canary) and application version headers
 * for verifying Nginx Canary traffic splitting.
 */
@RestController
@RequestMapping("/api/v1/system")
@Tag(name = "System & Canary", description = "Deployment track inspection and canary health verification")
public class SystemCanaryController {

    @Value("${app.deployment.track:stable}")
    private String deploymentTrack;

    @Value("${app.deployment.version:1.0.0}")
    private String appVersion;

    @Value("${app.platforms.sandbox-mode:true}")
    private boolean sandboxMode;

    @GetMapping("/version")
    @Operation(summary = "Inspect active deployment track (stable vs canary) and version")
    public ResponseEntity<Map<String, Object>> getVersion(HttpServletResponse response) {
        response.setHeader("X-Deployment-Track", deploymentTrack);
        response.setHeader("X-App-Version", appVersion);
        return ResponseEntity.ok(Map.of(
                "service", "post-composer-backend",
                "track", deploymentTrack,
                "version", appVersion,
                "sandboxMode", sandboxMode,
                "timestamp", Instant.now().toString()
        ));
    }
}
