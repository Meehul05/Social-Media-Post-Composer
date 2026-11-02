package com.postcomposer.backend.integration;

import com.postcomposer.backend.entity.PlatformType;
import com.postcomposer.backend.exception.BadRequestException;
import com.postcomposer.backend.exception.PlatformIntegrationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Instagram Graph API Adapter.
 * Supports explicit Sandbox Mode for development/testing and strict Official Graph API mode in production.
 * Never silently falls back to simulated publishing when sandbox-mode is false.
 */
@Component
@Slf4j
public class InstagramPlatformAdapter implements SocialPlatformAdapter {

    private static final int MAX_CHARS = 2200;
    private static final int MAX_IMAGES = 10;

    private final boolean sandboxMode;
    private final String apiBaseUrl;
    private final RestTemplate restTemplate = new RestTemplate();

    public InstagramPlatformAdapter(
            @Value("${app.platforms.sandbox-mode:true}") boolean sandboxMode,
            @Value("${app.platforms.instagram.api-base-url:https://graph.facebook.com/v19.0}") String apiBaseUrl
    ) {
        this.sandboxMode = sandboxMode;
        this.apiBaseUrl = apiBaseUrl;
    }

    @Override
    public PlatformType getPlatformType() {
        return PlatformType.INSTAGRAM;
    }

    @Override
    public int getMaxCharacterLimit() {
        return MAX_CHARS;
    }

    @Override
    public int getMaxMediaCount() {
        return MAX_IMAGES;
    }

    @Override
    public void validateContent(String content, int mediaCount) {
        if (!StringUtils.hasText(content)) {
            throw new BadRequestException("Instagram post content cannot be empty");
        }
        if (content.length() > MAX_CHARS) {
            throw new BadRequestException("Instagram post exceeds 2200 character limit");
        }
        if (mediaCount > MAX_IMAGES) {
            throw new BadRequestException("Instagram post exceeds 10 media attachments limit");
        }
    }

    @Override
    public PlatformPublishResult publish(
            String decryptedAccessToken,
            String accountHandle,
            String content,
            List<String> mediaUrls
    ) {
        validateContent(content, mediaUrls != null ? mediaUrls.size() : 0);

        if (sandboxMode) {
            String sandboxId = "ig_sandbox_" + UUID.randomUUID().toString().substring(0, 12);
            log.info("[SANDBOX MODE] Simulated Instagram Graph API publish for {} -> {}", accountHandle, sandboxId);
            return PlatformPublishResult.builder()
                    .success(true)
                    .externalPostId(sandboxId)
                    .sandboxSimulated(true)
                    .build();
        }

        if (!StringUtils.hasText(decryptedAccessToken) || decryptedAccessToken.startsWith("sandbox-")) {
            throw new PlatformIntegrationException(
                    "Instagram production publishing requires a valid Meta Graph API OAuth access token. Sandbox fallback is disabled in production."
            );
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(decryptedAccessToken);

            Map<String, Object> body = Map.of(
                    "caption", content,
                    "image_url", (mediaUrls != null && !mediaUrls.isEmpty()) ? mediaUrls.get(0) : ""
            );

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    apiBaseUrl + "/me/media_publish",
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && response.getBody().containsKey("id")) {
                return PlatformPublishResult.builder()
                        .success(true)
                        .externalPostId(String.valueOf(response.getBody().get("id")))
                        .sandboxSimulated(false)
                        .build();
            }
            throw new PlatformIntegrationException("Instagram Graph API did not confirm publication");
        } catch (Exception ex) {
            log.error("Instagram Graph API publication failed for handle {}", accountHandle, ex);
            return PlatformPublishResult.builder()
                    .success(false)
                    .sandboxSimulated(false)
                    .errorMessage(ex.getMessage())
                    .build();
        }
    }
}
